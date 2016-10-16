class FileDialog {
  constructor(shell,{title,root,path,ok,cancel}) {
    this.shell = shell;
    this.$dialog = $('<div class="ui modal">').appendTo('body');
    $('<i class="close icon">').appendTo(this.$dialog);
    this.$header = $('<div class="header">').appendTo(this.$dialog).text(title||'Files');

    var $content = $('<div class="ui internally celled grid">').appendTo(this.$dialog);
    var $bar = $('<div class="sixteen wide column">').appendTo($content)
    
    this.$input =$('<input type="text">').appendTo($bar).wrap('<div class="ui fluid input">')
    
    var $actions = $('<div class="actions">').appendTo(this.$dialog);
    this.$cancel = $('<a class="ui button">').appendTo($actions).text(cancel || 'Cancel');
    this.$ok = $('<a class="ui blue button">').appendTo($actions).text(ok || 'OK');
    
    var $inner = $('<div class="row">').appendTo($content).css('height','40vh');
    
    this.$directories = $('<div class="ui list four wide column directories">').text('dirs').appendTo($inner);
    this.$files = $('<div class="ui celled selection list twelve wide column files">').text('files').appendTo($inner);
    
    this.root = root || '/';
    this.path = path || this.root;
    this.loadRoot();
  }
  error(err,cont) {
    console.error(err.message||err,cont)
  }
  loadRoot() {
    this.$directories.html('');
    this.shell.list(this.root,(err,res)=>{
      if (err) return this.error(err,this.$directories);
      res.forEach((file)=>{
        if (file.type!=='directory') return;
        this.$directories.append(this.$dir(file));
        this.cd(this.path)
      })
    })
  }
  fillDirs($n,files) {
    var $list = $n.data('$list');
    $list.html('');
    files.forEach(file=>$list.append(this.$dir(file)));
    if(!files.length) $n.removeClass('expanded').removeClass('collapsed').addClass('empty')
  }
  fillFiles(files) {
    this.$files.html('');
    files.forEach(file=>this.$files.append(this.$file(file)));
  }
  show(cb){
    this.$dialog.modal({onApprove:cb});
    this.$dialog.modal('show');
  }
  select($n) {
    var file =$n.data('file');
    this.$files.find('.active').removeClass('active');
    $n.addClass('active');
    this.$input.val(file.path);
    this.selected = file;
  }
  deselect() {
    this.$files.find('.active').removeClass('active');
    this.$input.val(this.cwd);
    this.selected = null;
  }
  cd(path) {
    var parts = [path].join('/').split('/').filter(Boolean);
    var found;
    var unopened=[];
    do {
      var p = "/"+parts.join('/');
      found = this.$directories.find('[data-path="'+p+'"]').data('file');
      if(!found) unopened.unshift(p);
      parts.pop();
    } while (!found && parts.length) 
    if(!found) return;
    
    unopened.unshift(found.path);
    console.log(unopened)
    var $last
    var expand = () => {
      var p = unopened.shift();
      var $n = this.$directories.find('[data-path="'+p+'"]');
      if (!$n.length) return this.selectDirectory($last);
      $last = $n;
      if (unopened.length) {
        this.expandDirectory($last,(err,res)=>{
          console.log('unop',unopened.length)
          if(err) return this.selectDirectory($last);
          else expand()
        })  
      } else {
        return this.selectDirectory($last);
      }
    }
    expand()
  }
  expandDirectory($n,cb) {
    console.log('expanding',$n.data('file'))
    if ($n.data('loaded')) {
      $n.removeClass('collapsed').addClass('expanded');
      return cb && cb(null);
    }
    if ($n.hasClass('loading')) return cb && cb('already loading')
    var file = $n.data('file');
    $n.addClass('loading');
    this.shell.list(file.path,(err,res)=>{
      if (err) return cb && cb(err);
      $n.removeClass('loading');
      $n.data('loaded',true)
      var dirs = res.filter(file=>file.type==='directory');
      $n.removeClass('collapsed').addClass('expanded');
      this.fillDirs($n,dirs);
      cb && cb(null);
    })
  }
  collapseDirectory($n,cb) {
    $n.removeClass('expanded').addClass('collapsed');
  }
  selectDirectory($n) {
    var file = $n.data('file');
    if (this.cwd == file.path && $n.hasClass('active')) return;
    this.cwd = file.path;
    console.log('cd',this.cwd);
    var $list = $n.data('$list');
      
    this.$directories.find('.active').removeClass('active');
    $n.addClass('active');
    this.$input.val(file.path)
  
    this.shell.list(file.path,(err,res)=>{
      if (err) return this.error(err,this.$files);
      var dirs = res.filter(file=>file.type==='directory')
      var files = res.filter(file=>file.type!=='directory')
      this.fillFiles(dirs.concat(files));
    })
  }
  $dir(file) {
    var $n = $('<div class="item collapsed">');
    var $expand = $('<i class="right caret icon expand">').appendTo($n);
    var $collapse = $('<i class="down caret icon collapse">').appendTo($n);
    $('<i class="icon placeholder">').appendTo($n);
    var $content = $('<div class="content">').appendTo($n);
    var $header = $('<div class="header">').text(file.filename).appendTo($content);
    var $list = $('<div class="list">').appendTo($content)
    $n.data({file,$list});
    $n.attr('data-path',file.path)
    $header.click((e)=>this.selectDirectory($n));
    $expand.click((e)=>{
      this.expandDirectory($n);
    })
    $collapse.click((e)=>{
      $n.removeClass('expanded').addClass('collapsed');
    })
    return $n;
  }
  icon(file) {
    return 'http://mimeicon.herokuapp.com/'+file.type+'?size=32&default=text/plain';
  }
  $file(file) {
    var $n = $('<a class="item">');
    var $icon = $('<img class="image">').attr('src',this.icon(file)).appendTo($n);
    var $content = $('<div class="content">').appendTo($n);
    var $header = $('<div class="header">').text(file.filename).appendTo($content);
    var $description = $('<div class="description">').text(file.type).appendTo($content);
    if (file.type=='directory') $n.dblclick(e=>{
      this.cd(file.path);
    })
    $n.data({file});
    $n.click(()=>this.select($n));
    return $n;
  }
}

class FileOpenDialog extends FileDialog {
  constructor(shell,opt) {
    opt.title = opt.title || 'Open file';
    super(shell,opt)
    this.$input.attr('disabled','disabled')
  }
}

