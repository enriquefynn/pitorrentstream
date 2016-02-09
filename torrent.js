'use strict';

var torrent_stream = require('torrent-stream');
var http = require('http');
var pump = require('pump');
var mime = require('mime');
var fs = require('fs');
var promise = require('bluebird');

var engine;
var stream_server;

module.exports = { 
    create : function(magnet, cb){
        var files = promise.defer();
        try{
            engine = torrent_stream(magnet, {path: '/tmp/pi-torrent'});
            engine.on('ready', function() {
                var file_hash = {};
                engine.files.forEach(function(file){
                    file_hash[file.name] = {
                        name: file.name, 
                        path: file.path,
                        startPiece: file.offsetPiece,
                        endPiece: file.endPiece,
                        length: file.length,
                        pieces: []
                    };
                });
                files.resolve(file_hash);
            });
            engine.on('download', function(piece){
                cb({piece: piece, speed: engine.swarm.downloadSpeed()});
            });
        }
        catch(err){
            files.reject(err);
        }
        return files.promise;
    },

    select_file : function(filename){
        for (var i = 0; i < engine.files.length; ++i)
            if (filename == engine.files[i].name)
            {
                engine.files[i].select();
                break;
            }
    },

    deselect_file : function(filename){
        for (var i = 0; i < engine.files.length; ++i)
            if (filename == engine.files[i].name)
            {
                engine.files[i].deselect();
                break;
            }
    },

    begin_stream: function(filename){
        var promise_to_stream = promise.defer();
        var file_i = 0;
        for (; file_i < engine.files.length; ++file_i)
            if (filename == engine.files[file_i].name)
                break;

        if (stream_server != undefined)
            stream_server.close();
        stream_server = http.createServer();
        engine.files[file_i].select();
        stream_server.on('request', function(request, response){

            if (request.headers.origin) 
                response.setHeader('Access-Control-Allow-Origin', 
                    request.headers.origin);

            response.setHeader('Accept-Ranges', 'bytes');
            response.setHeader('Content-Type', mime.lookup(engine.files[file_i].name));
            response.setHeader('transferMode.dlna.org', 'Streaming');
            response.setHeader('contentFeatures.dlna.org',
            'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000');
            response.setHeader('Content-Length', engine.files[file_i].length);
            pump(engine.files[file_i].createReadStream(), response)
        });
        //Start in a random port
        stream_server.listen(0, 'localhost', function(){
            promise_to_stream.resolve(stream_server.address());
        });
        return promise_to_stream.promise;
    }
};
