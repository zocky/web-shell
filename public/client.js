shell = new Shell();

function $template(name,data) {
  var src = $('template[name="'+name+'"]').html();
  return $(src.replace(/{{\s*([a-z_][a-z0-9_]*)\s*}}/gi,($_,$1)=>{
    return data[$1] || data[$1]===0 ? data[$1] : ''
  }));
}


$(function(){
  $('.ui.dropdown').dropdown();
  $('[data-action="file-open"]').click(function(){
    shell.container.dialogs.open.show();
  })
  
  $('[data-action="file-save"]').click(function(){
    shell.container.dialogs.save.show();
  })
  $('[data-action="file-new"]').click(function(){
    shell.container.new();
  })
  
  shell.openApplication('https://pebble-wolf.hyperdev.space/');
})