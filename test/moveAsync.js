/**
 * Created by JParreir on 05-10-2015.
 */
/* global afterEach, beforeEach, describe, it, after, before, process */

"use strict";

var nodePath = require("path"),
    nodeOs = require("os"),
    rimraf = require("rimraf"),
    enFs = require("enfspatch"),
    enfsmkdirp = require("enfsmkdirp"),
    move = require("../").move,
    copy = require("enfscopy").copySync,
    cwd = process.cwd();

describe("enfsmoveAsync", function() {
    var tmpPath, helperPath, tmpHelperPath;
    tmpPath = nodePath.join(nodeOs.tmpdir(), "enfsmoveasync");
    helperPath = nodePath.join(__dirname, "helper");
    tmpHelperPath = nodePath.join(tmpPath, "helper");

    before(function() {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
    });
    beforeEach(function() {
        copy(helperPath, tmpHelperPath);
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    afterEach(function() {
        rimraf.sync(tmpPath + nodePath.sep + "*");
    });

    function createAsyncErrFn(errCode) {
        var fn = function() {
            fn.callCount++;
            var callback = arguments[arguments.length - 1];
            setTimeout(function() {
                var err = new Error();
                err.code = errCode;
                callback(err);
            }, 10);
        };
        fn.callCount = 0;
        return fn;
    }

    var originalRename = enFs.rename;
    var originalLink = enFs.link;

    function setUpMockFs(errCode) {
        enFs.rename = createAsyncErrFn(errCode);
        enFs.link = createAsyncErrFn(errCode);
    }

    function tearDownMockFs() {
        enFs.rename = originalRename;
        enFs.link = originalLink;
    }


    it("should rename a file on the same device", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "file1");
        dst = nodePath.join(tmpHelperPath, "file1-dst");

        move(src, dst, function(err) {
            (err === null).should.be.equal(true);
            enFs.readFileSync(dst, "utf8").should.containEql("data file 1");
            done();
        });
    });
    it("should not overwrite if {overwrite=false}", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "file1");
        dst = nodePath.join(tmpHelperPath, "file1-dst");
        enFs.writeFileSync(dst, "new content");
        move(src, dst, {overwrite: false}, function(err) {
            err.should.be.instanceOf(Error);
            err.code.should.be.equal("EEXIST");
            enFs.readFileSync(dst, "utf8").should.be.equal("new content");
            done();
        });
    });
    it("should not create directory structure if mkdirp is false", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "file1");
        dst = nodePath.join(tmpPath, "folder", "does", "not", "exist", "file1-dst");
        enFs.stat(dst, function(errStat) {
            errStat.should.be.instanceOf(Error);
            move(src, dst, {mkdirp: false}, function(err) {
                err.should.be.instanceOf(Error);
                err.code.should.be.equal("ENOENT");
                done();
            });
        });
    });
    it("should create directory structure by default", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "file1");
        dst = nodePath.join(tmpPath, "folder", "does", "not", "exist", "file1-dst");
        enFs.stat(dst, function(errStat) {
            errStat.should.be.instanceOf(Error);
            move(src, dst, function(err) {
                (err === null).should.be.equal(true);
                enFs.readFileSync(dst, "utf8").should.containEql("data file 1");
                done();
            });
        });
    });
    it("should work across devices", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "file1");
        dst = nodePath.join(tmpPath, "folder", "does", "not", "exist", "file1-dst");
        setUpMockFs("EXDEV");
        move(src, dst, function(err) {
            (err === null).should.be.equal(true);
            enFs.link.callCount.should.be.equal(1);
            enFs.readFileSync(dst, "utf8").should.containEql("data file 1");
            tearDownMockFs("EXDEV");
            done();
        });
    });
    it("should move folders", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "folder1");
        dst = nodePath.join(tmpPath, "folder1-dst");
        enFs.stat(dst, function(errStat) {
            errStat.should.be.instanceOf(Error);
            move(src, dst, function(err) {
                (err === null).should.be.equal(true);
                enFs.readFileSync(nodePath.join(dst, "file2"), "utf8").should.containEql("data file 2");
                done();
            });
        });
    });
    it("should move folders across devices with EISDIR error", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "folder1");
        dst = nodePath.join(tmpPath, "folder1-dst");

        setUpMockFs('EISDIR');

        move(src, dst, function(err) {
            (err === null).should.be.equal(true);
            enFs.link.callCount.should.be.equal(1);
            enFs.readFileSync(nodePath.join(dst, "subfolder1", "file3"), "utf8").should.containEql("data file 3");
            tearDownMockFs("EISDIR");
            done();
        });
    });
    it("should overwrite folders across devices", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "folder1");
        dst = nodePath.join(tmpPath, "folder1-dst");

        enfsmkdirp.mkdirp(dst, function(errMkdir) {
            (errMkdir === null).should.be.equal(true);
            setUpMockFs("EXDEV");
            move(src, dst, {overwrite: true}, function(err) {
                (err === null).should.be.equal(true);
                enFs.rename.callCount.should.be.equal(1);
                enFs.readFileSync(nodePath.join(dst, "subfolder1", "file3"), "utf8").should.containEql("data file 3");
                tearDownMockFs("EXDEV");
                done();
            });
        });
    });
    it("should move folders across devices with EXDEV error", function(done) {
        var src, dst;
        src = nodePath.join(tmpHelperPath, "folder1");
        dst = nodePath.join(tmpPath, "folder1-dst");

        setUpMockFs('EXDEV');
        move(src, dst, function(err) {
            (err === null).should.be.equal(true);
            enFs.link.callCount.should.be.equal(1);
            enFs.readFileSync(nodePath.join(dst, "subfolder1", "file3"), "utf8").should.containEql("data file 3");
            tearDownMockFs("EXDEV");
            done();
        });
    });
    //describe("> when trying to a move a folder into itself", function () {
    it("should produce an error", function(done) {
        var src, dst;
        src = nodePath.join(tmpPath, "test");
        dst = nodePath.join(tmpPath, "test", "test");
        enFs.stat(src, function(errStat) {
            errStat.should.be.instanceOf(Error);
            enfsmkdirp.mkdirp(src, function(errMkdir) {
                (errMkdir === null).should.be.equal(true);
                move(src, dst, function(err) {
                    err.should.be.instanceOf(Error);
                    enFs.statSync(src).isDirectory().should.be.equal(true);
                    done();
                });
            });
        });
    });
    //});
    // tested on Linux ubuntu 3.13.0-32-generic #57-Ubuntu SMP i686 i686 GNU/Linux
    // this won't trigger a bug on Mac OS X Yosimite with a USB drive (/Volumes)
    // see issue #108
    /*describe("> when actually trying to a move a folder across devices", function () {
     var differentDevice, __skipTests;

     differentDevice = "/mnt";
     __skipTests = false;

     // must set this up, if not, exit silently
     if (!enFs.existSyncStat(differentDevice)) {
     console.log('Skipping cross-device move test');
     __skipTests = true;
     }

     // make sure we have permission on device
     try {
     enFs.writeFileSync(nodePath.join(differentDevice, 'file'), 'hi');
     } catch (err) {
     console.log("Can't write to device. Skipping test.");
     __skipTests = true;
     }

     var _it = __skipTests ? it.skip : it;

     describe("> just the folder", function () {
     _it("should move the folder", function (done) {
     var src, dst;
     src = '/mnt/some/weird/dir-really-weird';
     dst = nodePath.join(tmpPath, 'device-weird');

     if (!enFs.existSyncStat(src)) {
     enfsmkdirp.mkdirpSync(src);
     }
     enFs.existSyncStat(dst).should.be.equal(true);
     enFs.lstatSync(src).isDirectory().should.be.equal(true);

     move(src, dst, function (err) {
     (err === null).should.be.equal(true);
     enFs.lstat(dst, function (errStat, stat) {
     (errStat === null).should.be.equal(true);
     stat.isDirectory().should.be.equal(true);
     done();
     });
     });
     });
     });
     });*/

    //describe("> when {overwrite: true}", function () {
    //describe("> when dst is a directory", function () {
    it("should overwrite the destination", function(done) {
        var src, dst;
        src = nodePath.join(tmpPath, "src");
        dst = tmpHelperPath;
        // use fixtures dir as dst since it has stuff
        enFs.readdir(dst, function(errReaddir, files) {
            (errReaddir === null).should.be.equal(true);
            files.indexOf("file1").should.be.greaterThanOrEqual(0);
            files.indexOf("folder1").should.be.greaterThanOrEqual(0);

            //create new src dir
            enfsmkdirp.mkdirp(nodePath.join(src, "folder-test"), function(errMkdir) {
                (errMkdir === null).should.be.equal(true);
                enFs.writeFile(nodePath.join(src, "some-file"), "data some-file", function(errWrite) {
                    (errWrite === null).should.be.equal(true);
                    enFs.readdir(src, function(errReadDirSrc, filesSrc) {
                        (errReadDirSrc === null).should.be.equal(true);
                        filesSrc.indexOf("some-file").should.be.greaterThanOrEqual(0);
                        filesSrc.indexOf("folder-test").should.be.greaterThanOrEqual(0);
                        move(src, dst, {overwrite: true}, function(err) {
                            (err === null).should.be.equal(true);
                            enFs.readdir(dst, function(errReadDst, filesDst) {
                                (errReadDst === null).should.be.equal(true);
                                //dst should not have old stuff
                                filesDst.indexOf("file1").should.be.equal(-1);
                                filesDst.indexOf("folder1").should.be.equal(-1);
                                //dst should have new stuff
                                filesDst.indexOf("some-file").should.be.greaterThanOrEqual(0);
                                filesDst.indexOf("folder-test").should.be.greaterThanOrEqual(0);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
    //});
    //});
});
