shell = new Shell();

$(function(){
  $('#tabs > .item').tab();
  $('application-window[url]').each(function(){
    var $this = $(this);
    var $parent = $this.parent();
    var url = $this.attr('url');
    console.log($this)
    shell.openApplication(url,{container:$parent});
  })
  console.log('hello');
  //shell.openApplication('https://pebble-wolf.hyperdev.space/');
})



