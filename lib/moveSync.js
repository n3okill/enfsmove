/**
 * @project enfsmove
 * @filename moveSync.js
 * @description sync method to move items on the file system
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */
"use strict";


var nodePath = require("path"),
    enFs = require("enfspatch"),
    enfsmkdirp = require("enfsmkdirp").mkdirpSync,
    enfscopy = require("enfscopy").copySync,
    rimraf = require("rimraf"),
    isWindows;

isWindows = /^win/.test(process.platform);

/**
 * Move items in the file system sync
 * @param {string} src - the path to the items being moved
 * @param {string} dst - the destination path to where the items will be moved
 * @param {object} opt - various options for move module
 *              {object} fs - the fs module to be used
 *              {bool} mkdirp - if true will create new directories instead of copying the old ones
 *              {bool} overwrite - if true will overwrite items at destination if they exist
 *              {Number} limit - the maximum number of items being moved at a moment
 * @return {Error}
 */
function move(src, dst, opt) {
    var options;

    options = opt || {};
    options.fs = options.fs || enFs;
    options.fs.mkdirpSync = options.fs.mkdirpSync || enfsmkdirp;

    options.mkdirp = options.mkdirp !== false;

    options.overwrite = options.overwrite === true;
    options.limit = options.limit || 16;

    if (options.mkdirp) {
        mkdirs(src, dst, options);
    } else {
        doRename(src, dst, options);
    }
}

function mkdirs(src, dst, options) {
    options.fs.mkdirpSync(nodePath.dirname(dst));
    doRename(src, dst, options);
}

function doRename(src, dst, options) {
    if (options.overwrite) {
        try {
            return options.fs.renameSync(src, dst);
        } catch (err) {
            if (err.code === "ENOTEMPTY" || err.code === "EEXIST" || err.code === "EPERM") {
                rimraf.sync(dst);
                options.overwrite = false;
                return move(src, dst, options);
            }
            if (err.code === "EXDEV" || err.code === "EISDIR" || err.code === "EPERM") {
                return moveAcrossDevice(src, dst, options);
            }
        }
    } else {
        try {
            options.fs.linkSync(src, dst);
        } catch (err) {
            if (err.code === "EXDEV" || err.code === "EISDIR" || err.code === "EPERM") {
                return moveAcrossDevice(src, dst, options);
            }
            throw err;
        }
        options.fs.unlinkSync(src);
    }
}

function moveAcrossDevice(src, dst, options) {
    var stats;
    stats = options.fs.statSync(src);
    if (stats.isDirectory()) {
        return moveDirAcrossDevice(src, dst, options);
    } else {
        return moveFileAcrossDevice(src, dst, options);
    }
}


function moveFileAcrossDevice(src, dst, options) {
    try {
        enfscopy(src, dst);
    } catch (err) {
        options.fs.unlinkSync(dst);
        if (err.code === "EISDIR" || err.code === "EPERM") {
            return moveDirAcrossDevice(src, dst, options);
        } else {
            throw err;
        }
    }
}


function moveDirAcrossDevice(src, dst, options) {
    if (options.overwrite) {
        rimraf.sync(dst);
        enfscopy(src, dst, {fs: options.fs, stopOnError: true, overwrite: false, limit: options.limit});
    } else {
        enfscopy(src, dst, {fs: options.fs, stopOnError: true, overwrite: false, limit: options.limit});
    }
    rimraf.sync(src);
}


module.exports = move;
