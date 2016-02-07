'use strict';
var spawn = require('child_process').spawn;
var omx;

function kill_player(){
    spawn('pkill', ['omxplayer']);
}

function command_factory(command){
	return (function(){omx.stdin.write(command);})
}

module.exports={
    play: function(url){
        kill_player();
        omx = spawn('omxplayer', ['-ohdmi', '-r', url]);
    },
	
	pause: command_factory('p'),
	forward: command_factory('\x5b\x43'),
	backward: command_factory('\x5b\x44'),
	volume_up: command_factory('+'),
	volume_down: command_factory('-'),
	stop: kill_player
}
