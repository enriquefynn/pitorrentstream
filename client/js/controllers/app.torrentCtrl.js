'use strict';
var app = angular.module('app.torrentCtrl', ['app.factory']);

app.controller('torrentCtrl', ['$scope', 'socket', function($scope, socket)
{
    var self = this;
    self.server_status = {status: 'Disconnected', class: 'error'};
    self.files = {};
    self.selected_file = undefined;
    self.fetch_all = false;
    self.watch_on_browser = false;
    self.magnet = '';
    self.lang = '';
    self.has_subtitle = 0;
    self.languages = {'en':'English', 'es':'Espanol', 'pt':'Portugues', 'de':'Deutsch', 'it':'Italiano'};

    function calc_completed(file)
    {
        var pdiff = self.files[file].endPiece - self.files[file].startPiece;
        var completed = 0;
        if(pdiff != 0)
            completed = (self.files[file].pieces.length / pdiff);
        completed = Math.round(completed * 100);
        if (completed > 100)
            completed = 100;
        return completed;
    }

    socket.on('info', function(data)
    {
        self.server_status = data;
    });

    socket.on('disconnect', function()
    {
        self.server_status = {status: 'Disconnected', class: 'error'};
    });

    socket.on('cache', function(cache)
    {
        self.download_speed = '0kb'
        self.server_status = {status: 'Connected', class: 'success'};
        self.fetch_all = false;
        self.watch_on_browser = false;
        self.selected_file = undefined;
        self.files = cache.files;
        self.compute_n_of_files();
        if(self.n_of_files == 0)
            self.magnet = '';
        for(var file in self.files)
        {
            self.files[file].completed = calc_completed(file);
            self.files[file].fetch = false;
        }
        if(cache.address_streaming != undefined)
        {
            self.address_streaming = 'http://' +
                cache.address_streaming.addr.address + ':' + 
                cache.address_streaming.addr.port;
        }
    });

    socket.on('piece', function(data)
    {
        for(var file in self.files)
        {
             if (data.piece >= self.files[file].startPiece && data.piece <= self.files[file].endPiece)
             {
                self.files[file].pieces.push(data.piece);
                self.files[file].completed = calc_completed(file);
                break;
             }
        }
        self.download_speed = data.speed.toLowerCase() + '/s';
    });

    socket.on('address_streaming', function(file_addr){
        self.address_streaming = 'http://' + file_addr.addr.address + 
            ':' + file_addr.addr.port;

    });

    socket.on('subtitle', function()
    {
        self.has_subtitle = 1;
    });

    socket.on('subtitle_fail', function()
    {
        self.has_subtitle = -1;
    });

    this.lang_change = function()
    {
        if(self.lang != undefined && self.lang != '')
        {
            console.log('Searching ' + self.lang + ' subtitles for file ' + self.selected_file.name);
            socket.emit('get_subtitles', {name: self.selected_file.name, lang: self.lang});
        }
    }

    this.start = function(magnet)
    {
        socket.emit('start', magnet);
    };

    this.begin_stream = function(file)
    {
        if(self.selected_file != undefined)
        {
            self.selected_file.fetch = false;
            self.fetch_all = false;
        }
        self.selected_file = file;
        file.fetch = true;
        console.log('streaming', file.name);
        socket.emit('begin_stream', file.name);
        self.move_to_top();
    };

    this.download = function(file)
    {
       socket.emit('select_file', file.name);
    };

    this.pause = function(file)
    {
        socket.emit('deselect_file', file.name);
    };

    this.remove = function(file)
    {
        delete self.files[file.name];
        //socket.emit('remove_file', file.name);
    };

    this.fetch_toggle = function(file)
    {
        file.fetch = !file.fetch;
        if(file.fetch)
            self.download(file)
        else
        {
            self.pause(file)
            self.fetch_all = false;
            if(file == self.selected_file)
            {
                //TODO: decide what to do in this case
                alert("Cannot cancel pre-fetch for file selected to stream");
                //self.selected_file = undefined;
            }
        }
    };

    this.move_to_top = function()
    {
        $('html, body').animate({ scrollTop: 0 }, 'fast');
    }

    this.compute_n_of_files = function()
    {
        self.n_of_files = Object.keys(self.files).length;
    }

    this.set_watch_on_browser = function(flag)
    {
        self.watch_on_browser = flag;
        if(flag)
            ;//make it run on browser
    }

    this.fetch_all_toggle = function()
    {
        self.fetch_all = !self.fetch_all;
        for(var file in self.files)
        {
            if(self.selected_file != undefined && self.selected_file.name == file)
                continue;
            self.files[file].fetch = self.fetch_all;
            if(self.fetch_all)
                self.download(self.files[file]);
            else
                self.pause(self.files[file]);
        }
    };

    this.stop_stream = function()
    {
        socket.emit('stop_stream');
    }

}]);

