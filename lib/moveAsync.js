/**
 * @project enfsmove
 * @filename moveAsync.js
 * @description async method to move items on the file system
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */
"use strict";


var nodePath = require("path"),
    nodeUtil = require("util"),
    enFs = require("enfspatch"),
    enfsmkdirp = require("enfsmkdirp").mkdirp,
    enfscopy = require("enfscopy").copy,
    rimraf = require("rimraf"),
    isWindows;

isWindows = /^win/.test(process.platform);

/**
 * Move items in the file system async
 * @param {string} src - the path to the items being moved
 * @param {string} dst - the destination path to where the items will be moved
 * @param {object} opt - various options for move module
 *              {object} fs - the fs module to be used
 *              {bool} mkdirp - if true will create new directories instead of copying the old ones
 *              {bool} overwrite - if true will overwrite items at destination if they exist
 *              {Number} limit - the maximum number of items being moved at a moment
 * @param {function} callback - the callback function that will be called after the list is done
 * @return {Error}
 */
function move(src, dst, opt, callback) {
    var options;
    if (nodeUtil.isFunction(opt)) {
        callback = opt;
        opt = {};
    }
    options = opt || {};
    options.fs = options.fs || enFs;
    options.fs.mkdirp = options.fs.mkdirp || enfsmkdirp;

    options.mkdirp = options.mkdirp !== false;

    options.overwrite = options.overwrite === true;
    options.limit = options.limit || 512;

    if (options.mkdirp) {
        mkdirs(src, dst, options, callback);
    } else {
        doRename(src, dst, options, callback);
    }
}

function mkdirs(src, dst, options, callback) {
    options.fs.mkdirp(nodePath.dirname(dst), function(err) {
        if (err) {
            return callback(err);
        }
        doRename(src, dst, options, callback);
    });
}
function doRename(src, dst, options, callback) {
    if (options.overwrite) {
        options.fs.rename(src, dst, function(err) {
            if (!err) {
                return callback(null);
            }
            if (err.code === "ENOTEMPTY" || err.code === "EEXIST") {
                return rimraf(dst, function(errRimRaf) {
                    if (errRimRaf) {
                        return callback(errRimRaf);
                    }
                    options.overwrite = false;
                    move(src, dst, options, callback);
                });
            }
            // weird Windows shit
            if (err.code === "EPERM") {
                return setTimeout(function() {
                    rimraf(dst, function(errRimRaf) {
                        if (errRimRaf) {
                            return callback(errRimRaf);
                        }
                        options.overwrite = false;
                        move(src, dst, options, callback);
                    });
                }, 200);
            }
            if (err.code === "EXDEV" || err.code === "EISDIR" || err.code === "EPERM") {
                moveAcrossDevice(src, dst, options, callback);
            }
        });
    } else {
        options.fs.link(src, dst, function(err) {
            if (err) {
                if (err.code === "EXDEV" || err.code === "EISDIR" || err.code === "EPERM") {
                    return moveAcrossDevice(src, dst, options, callback);
                }
                return callback(err);
            }
            options.fs.unlink(src, callback);
        });
    }
}

function moveAcrossDevice(src, dst, options, callback) {
    options.fs.stat(src, function(err, stat) {
        if (err) {
            return callback(err);
        }
        if (stat.isDirectory()) {
            moveDirAcrossDevice(src, dst, options, callback);
        } else {
            moveFileAcrossDevice(src, dst, options, callback);
        }
    });
}


function moveFileAcrossDevice(src, dst, options, callback) {
    var outFlags, ins, outs;
    outFlags = options.overwrite ? "w" : "wx";
    ins = options.fs.createReadStream(src);
    outs = options.fs.createWriteStream(dst, {flags: outFlags});

    function onClose() {
        options.fs.unlink(src, callback);
    }

    ins.on("error", function(err) {
        ins.destroy();
        outs.destroy();
        outs.removeListener("close", onClose);

        // may want to create a directory but `out` line above
        // creates an empty file for us: See #108
        // don't care about error here
        options.fs.unlink(dst, function() {
            // note: `err` here is from the input stream errror
            if (err.code === "EISDIR" || err.code === "EPERM") {
                moveDirAcrossDevice(src, dst, options, callback);
            } else {
                callback(err);
            }
        });
    });

    outs.on("error", function(err) {
        ins.destroy();
        outs.destroy();
        outs.removeListener("close", onClose);
        callback(err);
    });

    outs.once("close", onClose);
    ins.pipe(outs);
}


function moveDirAcrossDevice(src, dst, options, callback) {

    function copyDir() {
        enfscopy(src, dst, {
            fs: options.fs,
            stopOnError: true,
            overwrite: false,
            limit: options.limit
        }, function(errCopy) {
            if (errCopy) {
                return callback(errCopy);
            }
            rimraf(src, callback);
        });
    }

    if (options.overwrite) {
        rimraf(dst, function(err) {
            if (err) {
                return callback(err);
            }
            copyDir();
        });
    } else {
        copyDir();
    }
}


module.exports = move;
