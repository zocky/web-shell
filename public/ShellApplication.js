ShellApplication = (function(self,parent){

  var app = {};
  var manifest = {files:{new:[],open:[],save:[]}};
  
  
  app.manifest = function(obj) {
    Object.assign(manifest,obj);
    return app;
  }
  
  var handlers = {new:{},open:{},save:{}};
  
  function handle(what,{type,label,encoding,handler}) {
    handlers[what][type] = handler;
    var h = {type,label};
    if (encoding) h.encoding = encoding;
    manifest.files[what].push(h)
  }
  
  app.open = function(type,label,encoding,handler) {
    handle('open',{type,label,encoding,handler})
    return app;
  }
  app.save = function(type,label,encoding,handler) {
    handle('save',{type,label,encoding,handler})
    return app;
  }
  app.new = function(type,label,handler) {
    handle('new',{type,label,handler})
    return app;
  }
  
  app.connect = function() {
    if(ready) throw 'double connect';
    ready = true;
    if (welcome) {
      reply(welcome,null,{manifest:manifest})
    }
  }
  var welcome = false;
  var ready = false;
  var actions = {
    welcome(msg,e){
      if(welcome) throw 'double welcome';
      welcome = msg;
      if (ready) {
        reply(welcome,null,{manifest:manifest})
      }
    },
    open(msg,e) {
      handlers.open[msg.type](msg,(err,res)=>reply(msg,err,res))
    },
    save(msg,e) {
      handlers.save[msg.type](msg,(err,res)=>reply(msg,err,res))
    },
    new(msg,e) {
      handlers.new[msg.type](msg,(err,res)=>reply(msg,err,res))
    }
  };
  
  function reply(msg,err,res){
    parent.postMessage({
      reply:msg.rsvp,
      error:err,
      result: res,
    },'*')
  }
  
  self.addEventListener('message',function(e){
    if(e.source!=parent) return;
    actions[e.data.action] && actions[e.data.action](e.data,e)
  })
  
  return app;
})(self,parent)