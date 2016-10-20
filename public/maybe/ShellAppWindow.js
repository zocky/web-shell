class ShellAppClient {
  constructor(url,iframe) {
    var u = new URL(u);
    this.url = u.href;
    this.origin = u.origin;
    this.iframe = iframe;
    this.window = iframe.contentWindow;
  }
  connect() {
  }
  send() {
  }
  _receive() {
  }
}

class ShellAppController {
  constructor(shell,url,iframe) {
    this.shell = shell;
    this.client=new ShellAppClient(url,iframe)
  }
  save(path,type,cb) {
    if(!this.client.ready) return cb('not-ready')
    this.client.send({
      action:'save',
      type:'type'
    },(err,res)=>{
      if(err) return cb(err);
      this.shell.write(path,type,res.content,cb);
    });
  }
  open(path,cb) {
  }
  new(type,cb) {
  }
}

