

class FileDialog {
  constructor(shell,{title,root,path,ok,types,cancel}) {
    this.shell = shell;
    this.$dialog = $('<div class="ui modal">').appendTo('body')
    .append(
      '<i class="close icon">',
      this.$header = $('<div class="header">').text(title||'Files'),
      $('<div class="ui internally celled grid">').append(

        $('<div class="row">').append(
          this.$directories = $('<div class="ui four wide column directories">').css({'height':'100%','overflow-y':'auto'}),
          $('<div class="twelve wide column">').css({padding:0}).append(
            this.$menu = $('<div class="ui attached fluid menu">').css({border:'none',borderBottom:'solid 1px #d4d4d5',margin:0,width:'100%'}).append(
              $('<div class="item">').css({flex:1}).append(
                $('<div class="ui input">').append(
                  this.$input = $('<input type="text">')
                )
              ),
              this.$typesDropdown = $('<div class="ui dropdown item">').append(
                '<input type="hidden" name="gender">',
                '<div class="default text">Select type</div>',
                '<i class="dropdown icon">',
                this.$types= $('<div class="menu">')
              ),
              this.$mkdir = $('<a class="icon item">').append(
                '<i class="icons"><i class="folder icon"></i><i class="corner add icon"></i></i>'
              )
            ),
            this.$files = $('<div class="twelve wide column files">').css({'height':'40vh','overflow-y':'auto'})
          )
        )        
      ),
      this.$actions = $('<div class="actions">').append(
        this.$cancel = $('<a class="ui cancel button">').text(cancel || 'Cancel'),
        this.$ok = $('<a class="ui blue approve button">').text(ok || 'OK')
      )
    );
    
    if (!Object.keys(types).length) types = {'*/*':'Any File'};
    
    for(var t in types) {
      this.$types.append(
        $('<a class="item">').attr('data-value',t).text(types[t])
      )
    }
    
    
    

    this.root = root || '/';
    this.path = path || this.root;
    this.filename = '';
    this.selected = null;
    
    this.$input.on('input',(e)=>{
      this.listView.search(this.$input.val())
      this.filename = this.$input.val();
    })
    
    this.listView = this.$files.listView(this.shell,{
      cwd:this.root,
      on: {
        select: (file) => {
          this.filename = file ? file.filename : '';
          this.selected = file;
          this.$input.val(this.filename);
        },
        dblclick: (file) => {
          if (file.type==='directory') this.treeView.cd(file.path);
        },
        cd:(cwd) => {
          this.cwd = cwd;
        }
      }
    });
    this.treeView = this.$directories.treeView(this.shell,{
      root:this.root,
      cwd:this.path,
      on: {
        cd: (cwd) => {
          this.listView.cd(cwd);
        }
      }
    });
    //this.loadRoot();
    this.$typesDropdown.dropdown({
      onChange: (t)=>{
        this.type = t;
        this.listView.type = t;
      }
    })
    
    this.$typesDropdown.dropdown('set selected',Object.keys(types)[0]);
    
    this.$dialog.modal({
      onApprove: () => this.ok(),
      onDeny: () => this.cancel(),
    })
  }
  cd(path,cb) {
    this.treeView.cd(path,cb)
  }
  error(err,cont) {
    console.error(err.message||err,cont)
  }
 
  show(){
    this.$dialog.modal('show');
  }
  
  ok() {
    console.log('OK',this.selected)
    return false;
  }
  cancel() {
  }
}

class ApplicationFileDialog extends FileDialog {
  constructor(app,opt) {
    super(app.shell,opt);
    this.app = app;
  }
}

class FileOpenDialog extends ApplicationFileDialog {
  constructor(app,opt={}) {
    opt.title = opt.title || 'Open file';
    opt.types = opt.types || {};
    opt.types['*/*']='Any File';
    super(app,opt)
//    this.$input.attr('disabled','disabled')
  }
  ok() {
    if (!this.selected) return false;
    if (this.selected.type == 'directory') {
      this.cd(this.selected.path);
      return false;
    }
    this.app.open(this.selected.path);
  }
}

class FileSaveDialog extends ApplicationFileDialog {
  constructor(app,opt={}) {
    opt.title = opt.title || 'Save file';
    super(app,opt)
  }
  ok() {
    if (this.selected && this.selected.type == 'directory') {
      this.cd(this.selected.path);
      return false;
    }
    if (!this.selected) return false;
    this.app.save(this.type,this.cwd+'/'+this.filename);
  }
}