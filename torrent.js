'use strict';

var torrent_stream = require('torrent-stream');
var http = require('http');
var pump = require('pump');
var mime = require('mime');
var rangeParser = require('range-parser')
var fs = require('fs');
var promise = require('bluebird');
var parseTorrent = require('parse-torrent');

var engine;
var stream_server;
var torrent_info;

module.exports = { 
    create : function(magnet, cb){
        var files = promise.defer();
        try{
            engine = torrent_stream(magnet, {path: '/tmp/pi-torrent'});
            torrent_info = parseTorrent(magnet);
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

    remove_files: function(){
        if(engine != undefined)
            engine.remove(function(){});
    },

    stop_stream: function(){
        var destroyedP = promise.defer();
        engine.remove( function() {
            engine.destroy( function() {
                destroyedP.resolve();
            });
        });
        return destroyedP.promise;
    },

    get_subtitles: function(filename, lang) {
        // look for subtitle
        var promise_subs = promise.defer();
        if(lang != undefined && lang != '')
        {
            var path0 = '/tmp/pi-torrent-subtitles'
            var path1 = path0 + '/' + torrent_info.infoHash;
        var subname = path1 + '/' + filename + '-' + lang + '.txt';
        try {
            fs.accessSync(subname, fs.F_OK);
            promise_subs.resolve(subname);
        } catch(e) {
            var file_i = 0;
            for (; file_i < engine.files.length; ++file_i)
                if (filename == engine.files[file_i].name)
                    break;

        var gurl = 'http://localhost:8081?hash=' + torrent_info.infoHash + '&name=' + engine.files[file_i].name + '&size=' + engine.files[file_i].length + '&language=en';

        var get_link = promise.defer();
        http.get(gurl, function(response) {
            // request subtitle link
            var subfile = '';
            response.on('data', function(data) {
                subfile += data;
            });
            response.on('end', function() {
                get_link.resolve(subfile);
            });
            response.on('error', function(code) {
                promise_subs.reject(code);
            });
        });
        get_link.promise.then(function(subfile) {
            // download file from link
            http.get(subfile, function(response) {
                var prom = promise.defer();
                var sfile = '';
                response.on('data', function(data) {
                    sfile += data;
                });
                response.on('end', function() {
                    // write on file
                    // try to create folder first
                    try {
                        fs.mkdirSync(path0);
                        fs.mkdirSync(path1);
                        fs.writeFileSync(subname, sfile);
                    } catch(e) {
                        if(e.code != 'EEXIST')
                            console.log(e);
                    }
                    promise_subs.resolve(subname);
                });
                response.on('error', function(code) {
                    promise_subs.reject(code);
                });
            });
        });
        }
        }
        return promise_subs.promise;
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
            var range = request.headers.range;
            range = range && rangeParser(engine.files[file_i].length, range)[0];

            if(request.headers.origin)
                response.setHeader('Access-Control-Allow-Origin', request.headers.origin);

            response.setHeader('Accept-Ranges', 'bytes');
            response.setHeader('Content-Type', mime.lookup(engine.files[file_i].name));
            response.setHeader('transferMode.dlna.org', 'Streaming');
            response.setHeader('contentFeatures.dlna.org',
            'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000');
            if(!range)
            {
                response.setHeader('Content-Length', engine.files[file_i].length);
                if(request.method === 'HEAD') return response.end();
                pump(engine.files[file_i].createReadStream(), response);
                return;
            }

            response.statusCode = 206;
            response.setHeader('Content-Length', range.end - range.start + 1);
            response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + engine.files[file_i].length);
            if(request.method === 'HEAD') return response.end();
            pump(engine.files[file_i].createReadStream(range), response);
        });

        //Start in a random port
        stream_server.listen(0, 'localhost', function(){
            promise_to_stream.resolve(stream_server.address());
        });
        return promise_to_stream.promise;
    }
};
