class Shell {
  constructor() {
    this.root = new DirectoryServiceRoot();    
    this.root.mount('LocalStorage',new DirectoryServiceLocalStorage());
    this.root.mount('Dexie',new DirectoryServiceDexie());
    window.addEventListener('message',(e)=>{
      this.receive(e);
    })
    this.windows = {};
    this.create = {};
    for (var i in Shell.create) this.create[i] = Shell.create[i].bind(this,this);
  }
  stat(path,cb) {
    this.root.stat(path,cb||console.log.bind(console))
  }
  list(path,cb) {
    this.root.list(path,cb||console.log.bind(console))
  }
  mkdir(path,cb) {
    this.root.mkdir(path,cb||console.log.bind(console))
  }
  read(path,encoding,cb) {
    if(typeof encoding==='function') cb=encoding, encoding=null;
    cb = cb||console.table.bind(console);
    
    this.root.read(path,(err,res)=>{
      if(err) return cb(err);
      try {
        var td = new TextDecoder();
        console.log('content',encoding,res)
        switch(encoding) {
        case 'string':
          res.content = td.decode(res.content);
          break;
        case 'object':
          res.content = JSON.parse(td.decode(res.content));
          break;
        case 'dataurl':
          res.content = 'data:'+res.file.type+';base64,'+Base64.btoa(res.content);
          break;
        }
        cb(null,res)
      } catch (err) {
        return cb(err)
      }
    })
  }
  write(path,type,content,encoding,cb) {
    cb = cb||console.log.bind(console);
    try {
      if(typeof encoding==='function') cb=encoding, encoding=null;
      var te = new TextEncoder();
      switch(encoding) {
      case 'string':
        content = te.encode(content);
        break;
      case 'object':
        content = te.encode(JSON.stringify(content));
        break;
      case 'dataurl': 
        var parts = content.match(/^data:([^;]+)(;base64,)([\s\S]*)$/);
        if (!parts) return cb ('bad data uri');
        if (parts[1] != type) return cb('bad type');
        content = parts[3];
        if(parts[2]) content = Base64.atob(content);
        else content = te.encode(content);
        break;
      case 'binary':
        content = content;
        break;
      default: 
        return cb('bad encoding')
      }
      this.root.write(path,type,content,cb)
    } catch(err) {
      cb(err);
    }
  }
  openApplication(url) {
    $('#app').html('');
    var container = this.create.appWindow(url,{});

    this.container = this.windows[container.id]=container;
    return container;
  }
  receive(e) {
    for(let id in this.windows) {
      let cont = this.windows[id];
      if (cont.iframe.contentWindow !== e.source) continue;
      if (cont.origin !== e.origin) continue;
      cont.receive(e.data);
      break;
    }
  }
}

Shell.create = {};

Shell.utils = {
  uuid() {
    return (Math.random()*(1<<31-1)).toString(36)
  }
}

class ApplicationContainer {
  constructor(shell,{where,url},cb) {
    this.shell = shell;
    this.pending = {};
    this.ready = false;
    this.id = Shell.utils.uuid();
    var $iframe = $('<iframe>').appendTo(where||'body');
    this.iframe = $iframe.get(0);
    var u = new URL(url);
    this.url = u.href;
    this.origin = u.origin;
    this.manifest;
    this.iframe.addEventListener('error',cb,false);
    this.iframe.addEventListener('load',e=>{
      this.send({action:'welcome'},[],(err,res)=> {
        if(err) return cb && cb(err);
        this.manifest = res.manifest;
        
        if(this.manifest.files) {
          var saveTypes = {};
          this.manifest.files.save.forEach(t=>{
            saveTypes[t.type]=t.label;
          })
          var openTypes = {};
          this.manifest.files.open.forEach(t=>{
            openTypes[t.type]=t.label;
          })
          this.dialogs = {
            open: new FileOpenDialog(this,{types:openTypes}),
            save: new FileSaveDialog(this,{types:saveTypes}),
          }
        }
        
        
        this.ready=true;
        cb && cb(null,res)
      })  
    },false);
    
    this.iframe.src = this.url;
  }
  send(msg,transfer,cb) {
    if (typeof transfer=='function') cb=transfer,transfer=[];
    else transfer = transfer || [];
    if (cb) {
      msg.rsvp = Shell.utils.uuid();
      this.pending[msg.rsvp]=cb;
    }
    this.iframe.contentWindow.postMessage(msg,this.origin);
  }
  receive(msg) {
    if (msg.reply && this.pending[msg.reply]) {
      var fn = this.pending[msg.reply];
      delete this.pending[msg.reply];
    }
    if (!fn) return;
    var cb = (err,res) => {
      if (msg.rsvp) this.send({
        reply: msg.rsvp,
        result: res,
        error: err
      })
    }
    try {
      var res = fn(msg.error,msg.result,cb);
      if (res!==undefined) cb(null,res)
    } catch (err) {
      cb(err)
    }
  }
  open(path,cb) {
    this.shell.stat(path,(err,file)=>{
      if (err) return cb(err);
      var m = this.manifest.files.open.find(t=>t.type===file.type);
      if(!m) cb&&cb('wrong type')
      this.shell.read(path,m.encoding, (err,res)=>{
        this.send({
          action:'open',
          type:res.file.type,
          file:res.file,
          content:res.content
        },m.encoding=='binary' ? [res.content]:[],cb)
      });
    })
  }
  save(type,path,cb) {
    var m = this.manifest.files.open.find(t=>t.type===type);
    console.log('save1',m);
    if(!m) cb&&cb('wrong type');
    console.log('save2',m);
    this.send({
      action:'save',
      type:type,
    },(err,res)=>{
      this.shell.write(path,type,res,m.encoding, cb)
    })
  }
  new(type,cb) {
    var m;
    if(!type) m = this.manifest.files.new && this.manifest.files.new[0];
    else m = this.manifest.files.new.find(t=>t.type===type);
    if(!m) cb&&cb('wrong type');
    this.send({
      action:'new',
      type:m.type,
    })
  }
}