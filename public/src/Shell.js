class Shell {
  constructor() {
    this.root = new DirectoryServiceRoot();    
    this.root.mount('LocalStorage',new DirectoryServiceLocalStorage());
    this.root.mount('Dexie',new DirectoryServiceDexie());
    window.addEventListener('message',(e)=>{
      this.receive(e);
    })
    this.containers = {}
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
      console.log('content',encoding,res)
      switch(encoding) {
      case 'string':
        var td = new TextDecoder();
        res.content = td.decode(res.content);
        break;
      case 'object':
        var td = new TextDecoder();
        try {
          res.content = JSON.parse(td.decode(res.content));
        } catch (err) {
          return cb(err)
        }
        break;
      }
      cb(null,res)
    })
    
  }
  write(path,type,content,encoding,cb) {
    cb = cb||console.log.bind(console);
    try {
      if(typeof encoding==='function') cb=encoding, encoding=null;
      switch(encoding) {
      case 'string':
        var te = new TextEncoder();
        content = te.encode(content);
        break;
      case 'object':
        var te = new TextEncoder();
        content = te.encode(JSON.stringify(content));
        break;
      }
      this.root.write(path,type,content,cb)
    } catch(err) {
      cb(err);
    }
  }
  openApplication(url) {
    $('#app').html('');
    var container = new ApplicationContainer(this,{where:'#app',url:url});
    this.container = this.containers[container.id]=container;
    return container;
  }
  receive(e) {
    for(let id in this.containers) {
      let cont = this.containers[id];
      if (cont.iframe.contentWindow !== e.source) continue;
      if (cont.origin !== e.origin) continue;
      cont.receive(e.data);
      break;
    }
  }
}

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
        console.log('hello',res)
        if(err) return cb && cb(err);
        this.manifest = res.manifest;
        this.ready=true;
        console.log(this.manifest);
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
  open(type,path,content,cb) {
    var m = this.manifest.files.open.find(t=>t.type===type);
    if(!m) cb('wrong type')
    this.shell.read(path,m.encoding, (err,res)=>{
      this.send({
        action:'open',
        type:type,
        file:res.file,
        content:res.content
      },m.encoding=='binary' ? [content]:[],cb)
    });
  }
}