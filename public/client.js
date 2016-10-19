shell = new Shell();

function $template(name,data) {
  var src = $('template[name="'+name+'"]').html();
  return $(src.replace(/{{\s*([a-z_][a-z0-9_]*)\s*}}/gi,($_,$1)=>{
    return data[$1] || data[$1]===0 ? data[$1] : ''
  }));
}


$(function(){
  console.log('hello');
  shell.openApplication('https://pebble-wolf.hyperdev.space/');
})



