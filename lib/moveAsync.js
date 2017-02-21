/**
 * @project enfsmove
 * @filename moveAsync.js
 * @description async method to move items on the file system
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.2
 */
"use strict";


const nodePath = require("path");
const enFs = require("enfspatch");
const enfsmkdirp = require("enfsmkdirp").mkdirp;
const enfscopy = require("enfscopy").copy;
const rimraf = require("rimraf");

function noop() {
}

const kindOf = (arg) => arg === null ? "null" : typeof arg === "undefined" ? "undefined" : /^\[object (.*)\]$/.exec(Object.prototype.toString.call(arg))[1].toLowerCase();
const isFunction = (arg) => "function" === kindOf(arg);


function moveAcrossDevice(src, dst, options, callback) {
    options.fs.stat(src, (err, stat) => {
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
    const outFlags = options.overwrite ? "w" : "wx";
    const ins = options.fs.createReadStream(src);
    const outs = options.fs.createWriteStream(dst, {flags: outFlags});

    const onClose = () => options.fs.unlink(src, callback);


    ins.on("error", (err) => {
        ins.destroy();
        outs.destroy();
        outs.removeListener("close", onClose);

        // don't care about error here
        options.fs.unlink(dst, () => {
            // note: `err` here is from the input stream errror
            if (err.code === "EISDIR" || err.code === "EPERM") {
                moveDirAcrossDevice(src, dst, options, callback);
            } else {
                callback(err);
            }
        });
    });

    outs.on("error", (err) => {
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
        }, (errCopy) => {
            if (errCopy) {
                return callback(errCopy);
            }
            rimraf(src, callback);
        });
    }

    if (options.overwrite) {
        rimraf(dst, (err) => {
            if (err) {
                return callback(err);
            }
            copyDir();
        });
    } else {
        copyDir();
    }
}


function doRename(src, dst, options, callback) {
    if (options.overwrite) {
        options.fs.rename(src, dst, (err) => {
            if (!err) {
                return callback(null);
            }
            if (err.code === "ENOTEMPTY" || err.code === "EEXIST") {
                return rimraf(dst, (errRimRaf) => {
                    if (errRimRaf) {
                        return callback(errRimRaf);
                    }
                    options.overwrite = false;
                    move(src, dst, options, callback);
                });
            }
            // weird Windows shit
            if (err.code === "EPERM") {
                return setTimeout(() => {
                    rimraf(dst, (errRimRaf) => {
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
        options.fs.link(src, dst, (err) => {
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

function mkdirs(src, dst, options, callback) {
    options.fs.mkdirp(nodePath.dirname(dst), (err) => {
        if (err) {
            return callback(err);
        }
        doRename(src, dst, options, callback);
    });
}


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
    if (isFunction(opt)) {
        callback = opt;
        opt = {};
    }
    callback = callback || noop;
    const options = opt || {};
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


module.exports = move;
