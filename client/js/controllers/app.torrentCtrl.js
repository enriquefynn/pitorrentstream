'use strict';
var app = angular.module('app.torrentCtrl', ['app.factory']);

function sort_number(a, b)
{
    return a - b;
}

app.controller('torrentCtrl', ['$scope', 'socket', function($scope, socket)
{
    self = this;
    self.server_status = {status: 'Disconnected', class: 'error'};
    self.files = [];
    self.selected_file = undefined;
    self.fetch_all = false;

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
        self.files = cache.files;
        self.compute_n_of_files();
        var sizes = [];
        var names = [];
        for(var file in self.files)
        {
            self.files[file].completed = calc_completed(file);
            self.files[file].fetch = false;
            sizes.push(self.files[file].length);
            names.push(self.files[file].name);
        }
        if(self.n_of_files > 0)
        {
            if(self.n_of_files == 1)
                self.selected_file = self.files[self.n_of_files - 1].name;
            else
            {
                sizes.sort(sort_number);
                var l = (sizes.length - 1);
                var sl = l - 1;
                if(sizes[sl] >= (0.9 * sizes[l]))
                {
                    names.sort();
                    self.selected_file = self.files[names[0]].name
                }
                else
                {
                    for(var file in self.files)
                        if(self.files[file].length == sizes[l])
                        {
                            self.selected_file = self.files[file].name;
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
        if (cache.address_streaming != undefined)
        {
            self.address_streaming = 'http://' + 
                cache.address_streaming.addr.address + ':' + 
                cache.address_streaming.addr.port;
            self.selected_file = cache.address_streaming.file;
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
        self.selected_file = file_addr.file;

    });

    this.start = function(magnet)
    {
        socket.emit('start', magnet);
    };
    
    this.select = function(file)
    {
        file.fetch = true;
        self.download(file);
    };

    this.begin_stream = function(file)
    {
        socket.emit('begin_stream', file);
    };

    this.download = function(file)
    {
       //socket.emit('select_file', file.name);
    };

    this.pause = function(file)
    {
        //socket.emit('pause_file', file.name);
    };

    this.remove = function(file)
    {
        //socket.emit('remove_file', file.name);
    };

    this.fetch_toggle = function(file)
    {
        if(file.fetch)
            self.download(file)
        else
        {
            //socket.emit('pause_file', file.name);
            self.fetch_all = false;
            if(file == self.selected_file)
                self.selected_file = undefined;
        }
    };

    this.compute_n_of_files = function()
    {
        self.n_of_files = Object.keys(self.files).length;
    }

    this.fetch_all_toggle = function()
    {
        if(self.fetch_all)
        {
            for(var file in self.files)
            {
                if(file != self.selected_file)
                {
                    self.files[file].fetch = true;
                    self.download(self.files[file]);
                }
            }
        }
    };
}]);

