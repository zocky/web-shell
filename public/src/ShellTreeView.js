Shell.create.treeView = function(shell,opt={}) {
  
  var $view,$list;
  var error = opt.error || console.error.bind(console);
  var log = opt.log || console.log.bind(console);
  
  var root = opt.root || '/';
  var cwd = opt.cwd || root;

  var view = {
    get root() {
      return root;
    },
    get cwd() {
      return cwd;
    },
    cd: cd,
  };
  build();
  loadRoot();
  return view;
  
  function build() {
    $list = $('<div class="ui list">').css({
      position:'absolute',
      top:0, left:0, bottom:0, right:0,
      overflowY:'auto'
    });
    $view = $(opt.container||'body');
    var pos = $view.css('position');
    if(pos != 'absolute' && pos!='fixed' && pos!='relative') $view.css('position','relative');
    $view.append($list)
  }
  
  function loadRoot() {
    shell.list(root,(err,res)=>{
      if (err) return error(err);
      fillRoot(res);
      cd(view.cwd);
    });
  }
  
  function clearRoot(){
    $list.html('');
  }
  function fillRoot(files) {
    clearRoot();
    files.forEach((file)=>{
      if (file.type!=='directory') return;
      $list.append($item(file));
    });
  }
  
  function clearNode($n) {
    $n.find('>.content>.list').html('');
  }
  
  function fillNode($n,files) {
    clearNode($n);
    var $list = $n.find('>.content>.list');
    files.forEach(file=>$list.append($item(file)));
    if(!files.length) childless($n);
  }

  function childless($n) {
    $n.find('>.content>.list,>.collapse,>.expand').hide();
    $n.find('>.placeholder').show()
  }

  function loadNode($n,cb) {
    if($n.data('loaded')) cb && cb(null,$n.data('dirs'));
    if ($n.hasClass('loading')) return cb && cb('already loading')
    var path = $n.attr('data-path');
    $n.addClass('loading');
    shell.list(path,(err,res)=>{
      if (err) {
        clearNode($n);
        childless($n);
        return cb && cb(err);
      }
      $n.removeClass('loading');
      $n.data('loaded',true);
      var dirs = res.filter(file=>file.type==='directory');
      $n.data('dirs',dirs);
      fillNode($n,dirs);
      cb && cb(null,dirs);
    })    
  }
  
  function collapse($n) {
    $n.find('>.content>.list,>.collapse,>.placeholder').hide();
    $n.find('>.expand').show();
  }

  function _expand($n) {
    $n.find('>.content>.list,>.collapse').show();
    $n.find('>.expand,>.placeholder').hide();      
  }

  function expand($n,cb) {
    function success(exp) {
      if(exp) _expand($n)
      cb && cb(null);
    }
    if ($n.data('loaded')) {
      return success(true);
    }
    loadNode($n,(err,res)=>{
      if(err) return cb && cb(err);
      success(res.length>0);
    });
  }

  function on_cd() {
    opt.on && opt.on.cd && opt.on.cd(cwd);
  }
  
  function cd(path,cb) {
    var rest = [path].join('/').split(/[/]+/).filter(Boolean);
    var first = rest.shift();
    if(!first) return cb && cb(null,$([]))
    var $n = $list.find('>[data-name="'+first+'"]');
    if (!$n.length) return cb && cb('not found');
    recursiveExpand($n,rest,function(err,$res){
      select($res);

      cwd = $res.attr('data-path');
      on_cd(err);
      cb && cb(err);
    })
  }
  
  function recursiveExpand($n,rest,cb) {
    var next = rest.shift();
    if(!next) return cb(null,$n);
    expand($n,(err,res) => {
      if(err) return cb('not found',$n);
      var $child = $n.find('>.content>.list>[data-name="'+next+'"]');  
      if (!$child.length) return cb('not found',$n);
      recursiveExpand($child,rest,cb)
    })
  }
  
  function select($n) {
    var file = $n.data('file');
    loadNode($n);
    if (cwd == file.path && $n.hasClass('active')) return;
      
    $list.find('.active').removeClass('active').find('>.content>.header').css({background:'transparent'});
    $n.addClass('active').find('>.content>.header').css({background:'#eee'});
    
    
  }

  function $item(file) {
    var $n = $('<div class="item">')
    .append(
      $('<i class="right caret icon expand">')
      .click(function(e){
        expand($n);
      }),
      $('<i class="down caret icon collapse">')
      .hide()
      .click((e)=>{
        collapse($n);
      }),
      $('<i class="icon placeholder">')
      .hide(),
      $('<div class="content">')
      .css({padding:0})
      .append(
        $('<div class="header">')
        .css({
          padding:'0.25em 0.5em',
          borderRadius:'2px',
          cursor:'pointer',
          display:'inline-block',
          margin:'-0.25em 0'
        })
        .text(file.filename)
        .click((e)=>{
          cd(file.path)
        }),
        $('<div class="list"></div>')
        .css({padding:'0.5em 0'})
        .hide()
      )
    );
    $n.attr('data-path',file.path);
    $n.attr('data-name',file.filename);
    $n.data({file});
    return $n;
  }
}