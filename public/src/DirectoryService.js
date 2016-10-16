class DirectoryService {
  _root_stat() {
    throw('not implemented');
  }
  _stat(path) {
    if (!path) return this._root_stat();
    throw('not implemented')
  }
  _list(path) {
    throw('not implemented')
  }
  _encode(data) {
    return data;
  }
  _decode(data) {
    return data;
  }
  _write(path,file,data,cb) {
    cb ('not implemented')
  }
  _read(path,cb) {
    cb ('not implemented')
  }
  mkdir(path,cb) {
    cb ('not implemented')
  }
  stat(path,cb) { 
    try {
      cb(null,this._stat(path));
    } catch (e) {
      cb(e)
    }
  }
  list(path,cb) { 
    try {
      cb(null,this._list(path).map(x=>this._stat(x)));
    } catch(e) {
      cb(e);
    }
  }
  read(path,cb) {
    this.stat(path,(err,file)=>{
      if (err) return cb(err);
      if (!file) return cb('not found');
      this._read(path,file,(err,data)=>{
        if (err) return cb(err);
        var content=this._decode(data);
        this._on_read(path,file);
        cb(null,{content,file});
      })
    })
  }
  _on_read(path,file) {}
  write(path,type,data,cb) {
    var now = Date.now();
    try {
      var encoded = this._encode(data);
    } catch (err) {
      return cb(err);
    }
    this.stat(path,(err,file)=>{
      if(err) cb(err);
      this._write(path,file,type,encoded,(err,res)=>{
        if(err) return cb(err);
        this._on_write(path,file,type,encoded);
        cb(null,res);
      })
    })
  }
  _stat_write(path,file,type,encoded) {}
}

class DirectoryServiceRoot extends DirectoryService {
  constructor() {
    super();
    this.mtab = {};
  }
  mount (id,ds) {
    this.mtab[id] = ds;
  }
  _split(str) {
    var parts = [str].join('/').split(/[/]+/).filter(Boolean);
    var id = parts.shift();
    var ds = this.mtab[id];
    var path = parts.join('/');
    return {id,ds,path}
  }
  list(p,cb) {
    var {id,ds,path} = this._split(p);
    if (id) {
      if(!ds) return cb('no such mount' + id);
      return ds.list(path,(err,res)=>{
        if(err) return cb(err);
        res.forEach(file=>file.path='/'+id+'/'+file.path);
        cb(null,res)
      });
    } else {
      var ret = [];
      for (var name in this.mtab) {
        ret.push(Object.assign({path:'/'+name,filename:name,type:'directory'},this.mtab[name]))
      }
      cb(null,ret)
    }
  }

  stat(p,cb) {
    var {id,ds,path} = this._split(p);
    if(!ds) return cb('not found');
    ds.stat(path,cb);
  }
  read(p,cb) {
    var {id,ds,path} = this._split(p);
    if(!ds) return cb('not found');
    ds.read(path,cb);
  }
  mkdir(p,cb) {
    var {id,ds,path} = this._split(p);
    if(!ds || !path) return cb('not found');
    ds.mkdir(path,cb);
  }
  write(p,type,data,cb) {
    var {id,ds,path} = this._split(p);
    if(!ds) return cb('not found');
    ds.write(path,type,data,cb);
  }
}


class DirectoryServiceLocal extends DirectoryService {
  _encode(data) {
    try {
      var bytes = [];
      for (let i =0; i<data.byteLength;i++) bytes[i]=data[i];
      var encoded=JSON.stringify(bytes);
    } catch (e) {
      throw 'cannot write this object'
    }
    return encoded;
  }
  _write_stat(path,file) {
    throw('not implemented');
  }
  _on_write(path,file,type,encoded) {
    var now = Date.now();
    
    file = file || {
      ctime: now,
      path: path
    };
    
    Object.assign(file,{
      mtime:now,
      atime:now,
      size:encoded.length,
      type:type,
    })
    this._write_stat(path,file)
  }
  
  _decode(data) {
    try {
      return Uint8Array.from(JSON.parse(data));
    } catch (e) {
      console.log(e);
      throw ('error reading file');
    }
  }
  _on_read(path,file) {
    file.atime = Date.now();
    this._write_stat(path,file);
  }
  _list(path) {
    if (path!=='') throw 'not found';
    return Object.keys(this.files);
  }
}

class DirectoryServiceLocalStorage extends DirectoryServiceLocal {
  constructor() {
    super();
    try {
      this.files = JSON.parse(localStorage.dsls_files);
    } catch(e) {
      this.files = {};
      localStorage.dsls_files = '{}';
    }
  }
  _stat(path) {
    var file = this.files[path];
    if(!file) return null;
    return Object.assign({filename:path,path:path},file);
  }
  _read(path,file,cb) {
    var content = localStorage['dsls_file_'+path];
    cb(null,content)
  }
  _write_stat(path,file) {
    this.files[path] = file;
    localStorage.dsls_files = JSON.stringify(this.files);
  }
  _write(path,file,type,encoded,cb) { 
    localStorage['dsls_file_'+path] = encoded;
  }
}

class DirectoryServiceDexie extends DirectoryServiceLocal {
  constructor(dbname,cb) {
    super();
    this.dbname = dbname;
    var db = this.db = new Dexie(this.dbname);
    db.version(1).stores({
      stat: 'path,directory,filename,type,size,ctime,mtime,atime',
      content: 'path,data',
    });
    db.open()
    .then(res=>{
      db.stat.put({path:'',type:'directory',filename:'(Dexie Root)'}) 
      .then(res=>{cb && cb(null,res)})
      .catch(err=>{cb && cb(err)})
    })
    .catch((err)=> cb && cb(err))
  }
  stat(path,cb) {
    this.db.stat.get(path)
    .then(function(res){
      cb(null,res)
    }).catch(cb);
  }
  _write_stat(path,file,cb) {
    var [directory,filename] = this._split(path);
    var s = Object.assign({},file,{path,filename,directory});
    this.db.stat.put(s).then((res)=>cb&&cb(null,res)).catch((err)=>cb&&cb(err));
  }
  _read(path,file,cb) {
    this.db.content.get(path).then(res=>cb(null,res.content)).catch(cb);
  }
  _write(path,file,type,encoded,cb) { 
    this._dir(path,(err,res)=>{
      if(err) return cb(err);
      this.db.content.put({path:path,content:encoded}).then(res=>cb(null)).catch(cb);
    })
  }
  list(path,cb) {
    this.db.stat.where('directory').equals(path).toArray().then(res=>cb(null,res)).catch(cb);
  }
  _split(path) {
    var parts = [path].join('/').split(/[/]+/).filter(Boolean);
    var filename = parts.pop();
    var directory = parts.join('/');
    return [directory,filename];
  }
  _dir(path,cb) {
    var [directory,filename]=this._split(path);
    this.stat(directory,(err,dir)=>{
      if(err) return cb(err);
      if(!dir || dir.type!='directory') return cb('not found');
      cb(null,dir,filename);
    })
  }
  mkdir(path,cb) {
    this._dir(path,(err,dir,filename)=>{
      if(err) return cb(err);
      var dir = {
        path: path,
        filename: filename,
        directory: dir.path,
        type: 'directory',
        ctime: Date.now()
      }
      //console.log('gere',dir);
      this._write_stat(path,dir,cb)
    })
  }
}