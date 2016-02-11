'use strict';
var spawn = require('child_process').spawn;
var promise = require('bluebird');
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
        try{
            var error_code = promise.defer();
            omx = spawn('omxplayer', ['-ohdmi', '-r', url]);
            omx.on('close', function(code){
                error_code.resolve(code);
            })
            omx.stderr.on('data', function(data){
                console.error(data);
            });
            omx.stdout.on('data', function(data){
                console.log(data);
            });
            return error_code.promise;
        }
        catch(err){
            console.error(err);
        }
    },
	
	pause: command_factory('p'),
	forward: command_factory('\x5b\x43'),
	backward: command_factory('\x5b\x44'),
	volume_up: command_factory('+'),
	volume_down: command_factory('-'),
	stop: kill_player
}
