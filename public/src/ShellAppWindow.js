Shell.create.appWindow = function(shell,url,opt,cb) {
 var error = opt.error || function(a){
    console.error('appWindow',a)
  };
  var log = opt.log || function(){};
  var iframe;
  var fileOpenDialog,fileSaveDialog;
  var pending={};
  var $win,$buttons,$menu,$name,$filename,$fileicon ;
  var currentFile;
  var origin,manifest;
  var _actions = {
    new: {
      icon:'file',
      label:'New',
      exec: () => {
       _new(null,(err,file) => {
          if(err) return error(err);
        });
      }
    },
    open: {
      icon:'open folder',
      label:'Open',
      exec: () => {
        fileOpenDialog.show();
      }
    },
    save: {
      icon:'save', 
      label:'Save',
      exec: () => {
        if(currentFile.path) {
          save(currentFile.path,currentFile.type,error)
        } else {
          fileSaveDialog.show();
        }
      }
    },
    save_as: {
      icon:'save', 
      label:'Save As',
      exec: () => {
        fileSaveDialog.show();
      }
    },
  };
  for (var a in _actions) _actions[a].action = a;
  var actions = {};

  var win = {
    id:Shell.utils.uuid(),
    action(a) {
      if(actions[a] && actions[a].enabled) actions[a].exec();
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
      
      $name.text(manifest.name);

      if(manifest.files) {
        if (manifest.files.save && manifest.files.save.length > 0){
          var saveTypes = {};
          manifest.files.save.forEach(t=>{
  
            saveTypes[t.type]=t.label;
          });
          fileSaveDialog=shell.create.fileSaveDialog(win,{types:saveTypes});
          addAction('save',true);
          addAction('save_as',true);
        }
        if (manifest.files.open && manifest.files.open.length > 0){
          var openTypes = {};
          manifest.files.open.forEach(t=>{ 
            openTypes[t.type]=t.label;
          });
          setCurrentFile({message:'none'});
          fileOpenDialog=shell.create.fileOpenDialog(win,{types:openTypes});
          addAction('open');
        }
        if (manifest.files.new && manifest.files.new.length > 0){
          addAction('new');
        }
      }
    });
  }
  
  function addAction(a,disabled) {
    console.log('add action',a)
    actions[a]=_actions[a];
    actions[a].enabled=false;
    $menu.find('[data-action="'+a+'"]').show();
    if(!disabled) enableAction(a);
  }
  
  function enableAction(a) {
    if(actions[a])  {
      actions[a].enabled = true;
      $menu.find('[data-action="'+a+'"]').removeClass('disabled')
    }
  }
  function disableAction(a) {
    if(actions[a])  {
      actions[a].enabled = false;
      $menu.find('[data-action="'+a+'"]').addClass('disabled')
    }
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
      $menu = $('<div class="ui attached inverted menu">').append(
        $name=$('<div class="header item">')
        .css({background:'#767676'})
        .text('Loading...'),
        Shell.utils.template('action_dropdown',{
          action:'new',
          label:'New',
          icon:'file'
        },{
          events:{
            'click [data-action]': function(e) {
              win.action(this.getAttribute('data-action'))
            }
          }
        }),
        Shell.utils.template('action_dropdown',{
          action:'save',
          label:'Save',
          icon:'save',
          actions: [_actions.save,_actions.save_as]
        },{
          events:{
            'click [data-action]': function(e) {
              win.action(this.getAttribute('data-action'))
            }
          }
        }),
        $button('new'),
        $button('open'),
        $button('save'),
        $fileicon=$('<div class="borderless icon item">'),
        $filename=$('<div class="horizontally fitted text item">')
        .css({flex:'1 0 0'})
      ),
      $('<div>')
      .css({
        flex: '1 0 0',
        position:'relative'
      })
      .append(
        $iframe = $('<iframe>')
        .css({
          position:'absolute',
          top:0,
          left:0,
          border:'none',
          width:'100%',
          height:'100%'
        })
      )
    );
    iframe = $iframe.get(0);
    //$win.find('.ui.dropdown').dropdown();
    $view = $(opt.container||'body');
    var pos = $view.css('position');
    if(pos != 'absolute' && pos!='fixed' && pos!='relative') $view.css('position','relative');
    //$win.find('[data-action]').hide()
    $view.html($win);
  }

  function setCurrentFile({filename,type,path,message}) {
    currentFile = {filename,type,path};
    console.log('current',currentFile)
    $filename.text(filename||message);
    if(type) {
      $fileicon.html('<img class="ui" src="'+fileicon(type)+'">')
      enableAction('save');
      enableAction('save_as');
    } else {
      $fileicon.html('');
      disableAction('save');
      disableAction('save_as');
    }
    
  }

  function $dropdown({action,actions}) {
    return $('<div class="ui dropdown item">').append(
      
    )
  }

  function $button(a) {
    var {icon,label,exec}=_actions[a];
    return $('<a class="disabled icon item">')
    .attr('data-action',a)
    .append(
      '<i class="icon '+icon+'"> '
    )
    .attr('title',label||a)
    .click(()=>win.action(a))
    .hide();
  }
  
  function fileicon(file) {
    return 'https://mimeicon.herokuapp.com/'+file.type+'?size=16&default=text/plain';
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
    var fn;
    if (msg.reply && pending[msg.reply]) {
      fn = pending[msg.reply];
      delete pending[msg.reply];
    }
    if (!fn) return;
    var cb = (err,res) => {
      if (msg.rsvp) send({
        reply: msg.rsvp,
        result: res,
        error: err
      });
    };
    try {
      var res = fn(msg.error,msg.result,cb);
      if (res!==undefined) cb(null,res);
    } catch (err) {
      console.log(err)
      cb(err)
    }
  }
  
  function open(path,cb) {
    cb = cb || Shell.utils.report('open '+path)
    shell.stat(path,(err,file)=>{
      if (err) return cb(err);
      var m = manifest.files.open.find(t=>t.type===file.type);
      if(!m) return cb('wrong type');
      setCurrentFile({message:'opening'})
      currentFile = null;
      shell.read(path,m.encoding, (err,res)=>{
        send({
          action:'open',
          type:res.file.type,
          file:res.file,
          content:res.content
        },m.encoding=='binary' ? [res.content]:[],(err,res2) => {
          if (err) return cb(err);
          setCurrentFile(res.file);
          cb(err,res2)
        })
      });
    })
  } 
  function save(path,type,cb) {
    var m = manifest.files.save.find(t=>t.type===type);
    if(!m) return cb&&cb('wrong type');
    send({
      action:'save',
      type:type,
    },(err,res)=>{
      console.log('save received',type,path,m.encoding)
      shell.write(path,type,res,m.encoding, cb);
      console.log('write request sent',type,path)
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
    },(err,res)=>{
      if (err) return cb(err);
      setCurrentFile({type:m.type,filename:'Untitled '+m.label})
    })
  }
}