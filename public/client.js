shell = new Shell();

function $template(name,data) {
  var src = $('template[name="'+name+'"]').html();
  return $(src.replace(/{{\s*([a-z_][a-z0-9_]*)\s*}}/gi,($_,$1)=>{
    return data[$1] || data[$1]===0 ? data[$1] : ''
  }));
}

function $tree(path) {
  var $tree = $template('tree',{path:path});
  loadNode($tree);
  return $tree;
}

function $node(folder) {
  var $n = $template('node',folder);
  $n.find('>.open-node').click(function(e){
    openNode($n);
    e.stopPropagation();
  })
  $n.find('>.close-node').click(function(e){
    closeNode($n);
    e.stopPropagation();
  })
  $n.find('>.content>.header').click(function(e){
    console.log('selecting')
    selectNode($n);
    e.stopPropagation();
  })
  return $n;
}

function $item(file) {
  var $f = $template('item',file);
  $f.click(function(e){
    selectItem($f);
    e.stopPropagation(e);
  })
  return $f;
}


function loadNode($n) {
  $n.removeClass('closed').addClass('open');
  var path = $n.attr('data-path');
  var $list = $n.find('>.list');
  console.log('loading',path)
  shell.list(path,(err,res)=>{
    var dirs = res.filter(file=>file.type==='directory');
    if (!dirs.length) $n.removeClass('open').addClass('leaf');
    dirs.forEach(dir=>{
      $node(Object.assign({path:path+'/'+dir.name},dir)).appendTo($list)
    })    
  })
}

function openNode($n) {
  if ($n.attr('data-loaded')) {
    $n.removeClass('closed').addClass('open');
  } else {
    loadNode($n);
  }
}
function closeNode($n) {
  if ($n.attr('data-loaded')) {
    $n.removeClass('open').addClass('closed');
  }
}

function selectItem($f) {
  $f.closest('.files').find('.active').removeClass('active');
  $f.closest('.dialog').attr('data-selected-file',$f.attr('data-path'));
  $f.addClass('active');
}

function selectNode($n) {
  var $dirs = $n.closest('.directories');
  var $files = $dirs.siblings('.files');
  var $list = $files.find('>.list');
  console.log($dirs,$files,$list)
  var path = $n.attr('data-path');
  $list.html('');
  $dirs.find('.selected.item').removeClass('selected');
  $n.addClass('selected');
  shell.list(path,function(err,res){
    console.log(path,err,res);
    var files = res.filter(file=>file.type!=='directory');
    files.forEach(file=>{
      console.log('file',file)
      $item(file).appendTo($list);
    })
  })
}

$(function(){
  $('.ui.dropdown').dropdown();
  $('[data-action="file-open"]').click(function(){
    new FileOpenDialog(shell,{}).show()
  })
  
  shell.openApplication('https://pebble-wolf.hyperdev.space/');
})