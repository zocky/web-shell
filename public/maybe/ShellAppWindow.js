Shell.create.appWindow = function(shell,url,opt,cb) {

  var error = opt.error || console.error.bind(console);
  var log = opt.log || console.log.bind(console);
  var iframe;
  var fileOpenDialog,fileSaveDialog;
  var pending={};
  var $win,$buttons;
  var origin,manifest;
  var _actions = {
    new: {
      icon:'file',
      label:'New File',
      exec: () => {
        _new(null,(err,file) => {
          if(err) return error(err);
        });
      }
    },
    open: {
      icon:'open folder',
      label:'Open File',
      exec: () => {
        fileOpenDialog.show((err,file)=>{
          if(err) return error(err);
          open(file.type,file.path,(err,res)=>{
            if (err) return error(err);
          });
        })
      }
    },
    save: {
      icon:'save',
      label:'Save File',
      exec: () => {
        fileSaveDialog.show((err,file)=>{
          if(err) return error(err);
          save(file.type,file.path,(err,res)=>{
            if (err) return error(err);
          });
        })
      }
    },
  }
  var actions = {};

  var win = {
    action(a) {
      actions[a].exec();
    },
    get iframe() {
      return iframe;
    },
    get url() {
      return url;
    },
    get origin() {
      return origin;
    },
    get manifest() {
      return manifest;
    },
    receive:receive,
    open:open,
    save:save,
    new: _new
  };

  build();
  load();
  return win;
  
  function load(cb) {
    var u = new URL(url);
    url = u.href;
    origin = u.origin;
    iframe.onload = (e) => connect(cb);
    iframe.src = url;
  }
  
  function connect(cb) {
    send({action:'welcome'},[],(err,res)=> {
      if(err) return cb && cb(err);
      manifest = res.manifest;
      if(manifest.files) {
        if (manifest.files.save && manifest.files.save.length > 0){
          var saveTypes = {};
          manifest.files.save.forEach(t=>{
            console.log('save',t)
            saveTypes[t.type]=t.label;
          })
          console.log(saveTypes)
          fileSaveDialog=shell.create.fileSaveDialog(win,{types:saveTypes});
          enableAction('save');
        }
        if (manifest.files.open && manifest.files.open.length > 0){
          var openTypes = {};
          manifest.files.open.forEach(t=>{
            openTypes[t.type]=t.label;
          })
          fileOpenDialog=shell.create.fileOpenDialog(win,{types:openTypes});
          enableAction('open');
        }
        if (manifest.files.new && manifest.files.new.length > 0){
          enableAction('new');
        }
      }
    })
  }
  
  function enableAction(a) {
    actions[a]=_actions[a];
    console.log('enabling',a,$menu.find('[data-action="'+a+'"]'))
    
    $menu.find('[data-action="'+a+'"]').show();
  }
  
  function build () {
    var  $iframe;
    $win = $('<div class="app-window">')
    .css({
      position:'absolute',
      top:0, left:0,
      width:'100%', height:'100%',
      display:'flex', flexFlow: 'column',
    })
    .append(
      $menu = $('<div class="ui attached menu">').append(
        $button('new'),
        $button('open'),
        $button('save')
      ),
      $('<div>')
      .css({
        flex: 1,
        position:'relative'
      })
      .append(
        $iframe = $('<iframe>')
        .css({
          position:'absolute',
          top:0,
          left:0,
          width:'100%',
          height:'100%'
        })
      )
    );
    iframe = $iframe.get(0);
    
    $view = $(opt.container||'body');
    var pos = $view.css('position');
    if(pos != 'absolute' && pos!='fixed' && pos!='relative') $view.css('position','relative');
    $view.html($win)
  }

  function $button(a) {
    var {icon,label,exec}=_actions[a];
    return $('<a class="icon item">')
    .attr('data-action',a)
    .append(
      '<i class="icon '+icon+'">'
    )
    .attr('title',label||a)
    .click(exec)
    .hide()
  }
  
  
  function send(msg,transfer,cb) {
    if (typeof transfer=='function') cb=transfer,transfer=[];
    else transfer = transfer || [];
    if (cb) {
      msg.rsvp = Shell.utils.uuid();
      pending[msg.rsvp]=cb;
    }
    iframe.contentWindow.postMessage(msg,origin);
  }
  function receive(msg) {
    if (msg.reply && pending[msg.reply]) {
      var fn = pending[msg.reply];
      delete pending[msg.reply];
    }
    if (!fn) return;
    var cb = (err,res) => {
      if (msg.rsvp) send({
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
  
  function open(path,cb) {
    shell.stat(path,(err,file)=>{
      if (err) return cb(err);
      var m = manifest.files.open.find(t=>t.type===file.type);
      if(!m) cb&&cb('wrong type')
      shell.read(path,m.encoding, (err,res)=>{
        send({
          action:'open',
          type:res.file.type,
          file:res.file,
          content:res.content
        },m.encoding=='binary' ? [res.content]:[],cb)
      });
    })
  }
  function save(type,path,cb) {
    var m = manifest.files.open.find(t=>t.type===type);
    console.log('save1',m);
    if(!m) cb&&cb('wrong type');
    console.log('save2',m);
    send({
      action:'save',
      type:type,
    },(err,res)=>{
      shell.write(path,type,res,m.encoding, cb)
    })
  }
  function _new(type,cb) {
    var m;
    if(!type) m = manifest.files.new && manifest.files.new[0];
    else m = manifest.files.new.find(t=>t.type===type);
    if(!m) cb&&cb('wrong type');
    send({
      action:'new',
      type:m.type,
    })
  }
}
