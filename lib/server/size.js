/* inspired by http://procbits.com/2011/10/29/a-node-js-experiment-thinking-asynchronously-recursion-calculate-file-size-directory */
(function(){
    'use strict';
    
    var fs          = require('fs'),
        path        = require('path'),
        
        DIR         = '../',
        DIR_SERVER  = DIR + 'server/',
        
        format      = require(DIR_SERVER + 'format'),
        Util        = require(DIR        + 'util'),
        
        /*  The lstat() function shall be equivalent to stat(),
            except when path refers to a symbolic link. In that case lstat()
            shall return information about the link, while stat() shall return
            information about the file the link references. 
        */
        stat    = fs.lstat;
    
    exports.get = function(dir, options, callback) {
        var type, stopOnError,
            total           = 0;
        
        Util.checkArgs(arguments, ['dir', 'callback']);
        
        if (!callback) {
            callback    = options;
        } else {
            type        = options.type;
            stopOnError = options.stopOnError;
        }
        
        function calcSize(error, size) {
            if (error)
                if (stopOnError)
                    Util.exec(callback, error);
                else
                    size = 0;
                
            total      += size;
            
        }
        
        processDir(dir, calcSize, options, function(error) {
            var result;
            
            if (type !== 'raw')
                result  = format.size(total);
            else
                result  = total;
            
            Util.exec(callback, error, result);
        });
    };
   
    function processDir(dir, func, options, callback) {
        var stopOnError     = options.stopOnError,
            wasError        = false,
            asyncRunning    = 0,
            fileCounter     = 1,
            
            execCallBack    = function () {
                if (!fileCounter && !asyncRunning)
                    callback();
            },
            
            getDirInfo      = function(dir) {
               stat(dir, Util.exec.with(getStat, dir));
            };
        
        getDirInfo(dir);
        
        function getStat(dir, error, stat) {
            var isDir;
            
            --fileCounter;
            
            if (!wasError || !stopOnError) {
                if (error) {
                    wasError    = true;
                    func(error);
                } else {
                    isDir   = stat.isDirectory();
                    
                    if (!isDir)
                        func(null, stat.size);
                    else if (isDir) {
                        ++asyncRunning;
                        fs.readdir(dir, function(error, files) {
                            onReaddir(error, files, dir);
                        });
                    }
                }
                
                execCallBack();
            }
        }
        
        function onReaddir(error, files, dir) {
            var n;
            
            asyncRunning--;
            
            if (!error) {
                n               = files.length;
                fileCounter    += n;
                
                files.forEach(function(file) {
                    var dirPath     = path.join(dir, file);
                    
                    process.nextTick(function() {
                        getDirInfo(dirPath);
                    });
                });
            }
            
            if (!n)
                execCallBack();
        }
    }
    
})();