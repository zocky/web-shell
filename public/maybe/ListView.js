$.fn.listView = function(shell,opt={}) {
  var $view = $(this);
  var pos = $view.css('position');
  if(pos != 'absolute' && pos!='fixed' && pos!='relative') $view.css('position','relative');
  var $list = $('<div class="ui celled selection list">');
  $view.append($list)
  
  var error = opt.error || console.error.bind(console);
  var log = opt.log || console.log.bind(console);
  
  var cwd = opt.cwd || root;
  var selected = null;
  
  function loadFiles(path,cb) {
    shell.list(path,cb);
  }
  
  function clearFiles(){
    $list.html('');
  }
  function fillFiles(res) {
    var dirs = res.filter(file=>file.type=='directory');
    var files = res.filter(file=>file.type!='directory');
    var all = dirs.concat(files);
    clearFiles();
    all.forEach((file)=>{
      $list.append($item(file));
    });
    filter();
    if(all.length===0) childless();
  }
  
  function on_cd() {
    opt.on && opt.on.cd && opt.on.cd(cwd);
  }
  function on_select() {
    opt.on && opt.on.select && opt.on.select(selected);
  }
  
  function on_dblclick() {
    opt.on && opt.on.dblclick && opt.on.dblclick(selected);
  }

  function childless() {
  }
  
  function cd(path,cb) {
    console.log('cd',path)
    if(path===cwd) return;
    deselect();
    loadFiles(path,(err,res)=>{
      if (err) return cb && cb(err);
      cwd=path;
      fillFiles(res);
      on_cd(null,cwd);
      cb && cb(null)
    })
  }
  function icon(file) {
    return 'https://mimeicon.herokuapp.com/'+file.type+'?size=32&default=text/plain';
  }
  function select(filename,cb) {
    deselect()
    var $n = $list.find('>[data-filename="'+filename+'"]');
    if(!$n.length) {
      on_select('not found');
      return cb && cb('not found');
    }
    selected = $n.data('file');
    $n.addClass('active')
    on_select(null);
    cb && cb (null)
  }
  
  function search(filename,cb) {
    var $n = $list.find('>[data-filename="'+filename+'"]');
    if($n.length) select(filename,cb)
    else deselect()
  }
  function setType(t) {
    type = t;
    filter()
  }
  var type = '*/*';
  function filter() {
    var [t,s] = type.split(/[/]/);
    t = t =='*' ? '.*?' : t.replace(/(\W)/g,'\\$1');
    s = s =='*' ? '.*?' : s.replace(/(\W)/g,'\\$1');
    var re = new RegExp('^'+ t + '[/]' + s +'$');
    $list.find('>.item').each(function(){
      var $this=$(this);
      var file = $this.data('file');
      if(file.type=='directory' || file.type.match(re)) $this.show();
      else $this.hide();
    });
  }

  function deselect() {
    selected = null;
    $list.find('.active').removeClass('active');
  }

 function $item(file) {
    var $n = $('<a class="item">');
    var $icon = $('<img class="image">').attr('src',icon(file)).appendTo($n);
    var $content = $('<div class="content">').appendTo($n);
    var $header = $('<div class="header">').text(file.filename).appendTo($content);
    var $description = $('<div class="description">').text(file.type).appendTo($content);
    $n.dblclick(e=>{
      on_dblclick(file);
    });
    
    $n.data({file});
    $n.attr('data-filename',file.filename);
    $n.attr('data-path',file.path);
    $n.click(()=>select(file.filename));
    return $n;
  }

  var view = {
    get cwd() {
      return cwd;
    },
    get selected() {
      return selected;
    },
    get type() {
      return type;
    },
    set type(t) {
      setType(t);
    },
    cd: cd,
    select: select,
    search: search,
    on: {
      cd: function(){}
    }
  };
  return view;
}