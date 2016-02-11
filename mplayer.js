'use strict';
var spawn = require('child_process').spawn;
var promise = require('bluebird');
var mplayer;

function kill_player(){
    spawn('killall', ['-9', 'mplayer', 'mplayer.bin']);
    mplayer = undefined;
}

function command_factory(command){
    return (function(){
        if(mplayer != undefined)
            mplayer.stdin.write(command);
    })
}

module.exports={
    play: function(url){
        kill_player();
        try{
            var error_code = promise.defer();
            mplayer = spawn('mplayer', ['-slave', '-quiet', url]);
            mplayer.on('close', function(code){
                mplayer = undefined;
                error_code.resolve(code);
            })
            mplayer.stderr.on('data', function(data){
                console.error(data.toString());
            });
            mplayer.stdout.on('data', function(data){
                console.log(data.toString());
            });
            return error_code.promise;
        }
        catch(err){
            console.error(err);
        }
    },

    pause: command_factory('pause\n'),
    forward: command_factory('seek 5\n'),
    backward: command_factory('seek -5\n'),
    volume_init: command_factory('volume 10 1\n'),
    volume_up: command_factory('volume 1\n'),
    volume_down: command_factory('volume -1\n'),
    stop: kill_player
}
