Shell = (function() {
  
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
      console.log('will write',path,type);
      cb = cb||console.log.bind(console);
      cb = function(err) {
        if (err) console.error('WRITE',path,type,encoding,err);
        else console.log('WRITE OK');
      }
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
          if (parts[1] != type) return cb('bad type '+parts[1]);
          
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
        console.log('write err',er)
        cb(err);
      }
    }
    openApplication(url,opt) {
      var container = this.create.appWindow(url,opt);
      this.windows[container.id]=container;
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
  
  var templates = {};
  
  $(function(){
    $('script[type="template"][name]').each(function(){
      var name = this.getAttribute('name');
      Handlebars.registerPartial(name,this.innerHTML);
      var fn = Handlebars.compile('{{>'+name+'}}');
      var t = templates[name] = function(data,opt={}) {
        var src = fn(data,{helpers:opt.helpers||{}});
        $src = $('<div>').hide().appendTo('body').html(src);
        for (var e in opt.events) {
          var m = e.match(/^\s*([a-z\-]+)\s+(.*)$/);
          if(!m) continue;
          console.log(e,m[1],m[2])
          $src.find(m[2]).on(m[1],opt.events[e]);
        }
        console.log('found',$src.find('.ui.dropdown'))
        $src.find('.ui.dropdown').dropdown();
        var $ret = $src.children().detach();
        $src.remove();
        return $ret;
      }
    })
  })
  
  Shell.utils = {
    uuid() {
      return (Math.random()*(1<<31-1)).toString(36)
    },
    template(name,data,options) {
      return templates[name](data,options);
    },
    report(label) {
      console.log('REQ',label)
      return function(err,res) {
        if(err) console.error('ERROR',label,err.message || err);
        else console.log('OK',label,res);
      }
    }
  }
  return Shell;
})();