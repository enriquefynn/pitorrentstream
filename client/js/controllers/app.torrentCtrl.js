'use strict';
var app = angular.module('app.torrentCtrl', ['app.factory']);

function sort_number(a, b)
{
    return a - b;
}

app.controller('torrentCtrl', ['$scope', 'socket', function($scope, socket)
{
    var self = this;
    self.server_status = {status: 'Disconnected', class: 'error'};
    self.files = {};
    self.selected_file = undefined;
    self.fetch_all = false;
    self.watch_on_browser = false;

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
        self.server_status = {status: 'Connected', class: 'success'};
        self.fetch_all = false;
        self.watch_on_browser = false;
        self.files = cache.files;
        //gui test
        //self.files["file1"] = {name: "file1", fetch: false, pieces: []};
        //self.files["file2"] = {name: "file2", fetch: false, pieces: []};
        //self.files["file3"] = {name: "file3", fetch: false, pieces: []};
        //self.files["file4"] = {name: "file4", fetch: false, pieces: []};
        //self.files["file5"] = {name: "file5", fetch: false, pieces: []};
        self.compute_n_of_files();
        var sizes = [];
        for(var file in self.files)
        {
            self.files[file].completed = calc_completed(file);
            self.files[file].fetch = false;
            sizes.push(self.files[file].length);
        }
        if(self.n_of_files > 0)
        {
            if(self.n_of_files == 1)
                self.selected_file = self.files[self.n_of_files - 1];
            else
            {
                sizes.sort(sort_number);
                var l = (sizes.length - 1);
                var sl = l - 1;
                if(sizes[sl] < (0.5 * sizes[l]))
                {
                    for(var file in self.files)
                        if(self.files[file].length == sizes[l])
                        {
                            self.selected_file = self.files[file];
                            break;
                        }
                }
            }
        }
        if(self.selected_file != undefined)
        {
            self.selected_file.fetch = true;
            self.download(self.selected_file);
        }
        if(cache.address_streaming != undefined)
        {
            self.address_streaming = 'http://' +
                cache.address_streaming.addr.address + ':' + 
                cache.address_streaming.addr.port;
            //self.selected_file = cache.address_streaming.file;
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
        //self.selected_file = file_addr.file;

    });

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
}]);

