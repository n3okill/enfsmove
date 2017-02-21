/**
 * Created by JParreir on 05-10-2015.
 */
/* global afterEach, beforeEach, describe, it, after, before, process */

"use strict";

const nodePath = require("path");
const nodeOs = require("os");
const rimraf = require("rimraf");
const enFs = require("fs");
const enfsmkdirp = require("enfsmkdirp");
const move = require("../").moveSync;
const copy = require("enfscopy");
const cwd = process.cwd();

describe("enfsmoveSync", function () {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfsmovesync");
    const helperPath = nodePath.join(__dirname, "helper");
    const tmpHelperPath = nodePath.join(tmpPath, "helper");
    before(function (done) {
        enfsmkdirp.mkdirp(tmpPath, function () {
            process.chdir(tmpPath);
            done();
        });
    });
    beforeEach(function (done) {
        copy.copy(helperPath, tmpHelperPath, done);
    });
    after(function (done) {
        rimraf(tmpPath, function () {
            process.chdir(cwd);
            done();
        });
    });
    afterEach(function (done) {
        rimraf(tmpPath + nodePath.sep + "*", done);
    });

    function createAsyncErrFn(errCode) {
        function fn() {
            fn.callCount++;
            const callback = arguments[arguments.length - 1];
            setImmediate(() => {
                const err = new Error();
                err.code = errCode;
                callback(err);
            });
        }

        fn.callCount = 0;
        return fn;
    }

    function createSyncErrFn(errCode) {
        function fn() {
            fn.callCount++;
            const err = new Error();
            err.code = errCode;
            throw err;
        }

        fn.callCount = 0;
        return fn;
    }

    const originalRename = enFs.rename;
    const originalLink = enFs.link;
    const originalRenameSync = enFs.renameSync;
    const originalLinkSync = enFs.linkSync;


    function setUpMockFs(errCode) {
        enFs.rename = createAsyncErrFn(errCode);
        enFs.link = createAsyncErrFn(errCode);
        enFs.renameSync = createSyncErrFn(errCode);
        enFs.linkSync = createSyncErrFn(errCode);
    }

    function tearDownMockFs() {
        enFs.rename = originalRename;
        enFs.link = originalLink;
        enFs.renameSync = originalRenameSync;
        enFs.linkSync = originalLinkSync;
    }

    it("should rename a file on the same device", function () {
        const src = nodePath.join(tmpHelperPath, "file1");
        const dst = nodePath.join(tmpHelperPath, "file1-dst");
        move(src, dst);
        enFs.readFileSync(dst, "utf8").should.containEql("data file 1");
    });
    it("should not overwrite if {overwrite=false}", function () {
        const src = nodePath.join(tmpHelperPath, "file1");
        const dst = nodePath.join(tmpHelperPath, "file1-dst");
        enFs.writeFileSync(dst, "new content");
        (function () {
            move(src, dst, {overwrite: false});
        }).should.throw(Error, {code: "EEXIST"});
        enFs.readFileSync(dst, "utf8").should.be.equal("new content");
    });
    it("should not create directory structure if mkdirp is false", function () {
        const src = nodePath.join(tmpHelperPath, "file1");
        const dst = nodePath.join(tmpPath, "folder", "does", "not", "exist", "file1-dst");
        (function () {
            enFs.statSync(dst);
        }).should.throw(Error);
        (function () {
            move(src, dst, {mkdirp: false});
        }).should.throw(Error, {code: "ENOENT"});
    });
    it("should create directory structure by default", function () {
        const src = nodePath.join(tmpHelperPath, "file1");
        const dst = nodePath.join(tmpPath, "folder", "does", "not", "exist", "file1-dst");
        (function () {
            enFs.statSync(dst);
        }).should.throw(Error);
        move(src, dst);
        enFs.readFileSync(dst, "utf8").should.containEql("data file 1");
    });
    it("should work across devices", function () {
        const src = nodePath.join(tmpHelperPath, "file1");
        const dst = nodePath.join(tmpPath, "folder", "does", "not", "exist", "file1-dst");
        setUpMockFs("EXDEV");
        move(src, dst, {fs: enFs});
        enFs.linkSync.callCount.should.be.equal(1);
        enFs.readFileSync(dst, "utf8").should.containEql("data file 1");
        tearDownMockFs("EXDEV");
    });
    it("should move folders", function () {
        const src = nodePath.join(tmpHelperPath, "folder1");
        const dst = nodePath.join(tmpPath, "folder1-dst");
        (function () {
            enFs.statSync(dst);
        }).should.throw(Error);
        move(src, dst);
        enFs.readFileSync(nodePath.join(dst, "file2"), "utf8").should.containEql("data file 2");
    });
    it("should move folders across devices with EISDIR error", function () {
        const src = nodePath.join(tmpHelperPath, "folder1");
        const dst = nodePath.join(tmpPath, "folder1-dst");

        setUpMockFs("EISDIR");

        move(src, dst, {fs: enFs});
        enFs.linkSync.callCount.should.be.equal(1);
        enFs.readFileSync(nodePath.join(dst, "subfolder1", "file3"), "utf8").should.containEql("data file 3");
        tearDownMockFs("EISDIR");
    });
    it("should overwrite folders across devices", function () {
        const src = nodePath.join(tmpHelperPath, "folder1");
        const dst = nodePath.join(tmpPath, "folder1-dst");

        enfsmkdirp.mkdirpSync(dst);
        setUpMockFs("EXDEV");
        move(src, dst, {overwrite: true, fs: enFs});
        enFs.renameSync.callCount.should.be.equal(1);
        enFs.readFileSync(nodePath.join(dst, "subfolder1", "file3"), "utf8").should.containEql("data file 3");
        tearDownMockFs("EXDEV");
    });
    it("should move folders across devices with EXDEV error", function () {
        const src = nodePath.join(tmpHelperPath, "folder1");
        const dst = nodePath.join(tmpPath, "folder1-dst");

        setUpMockFs("EXDEV");
        move(src, dst, {fs: enFs});
        enFs.linkSync.callCount.should.be.equal(1);
        enFs.readFileSync(nodePath.join(dst, "subfolder1", "file3"), "utf8").should.containEql("data file 3");
        tearDownMockFs("EXDEV");
    });
    //describe("> when trying to a move a folder into itself", function() {
    it("should produce an error", function () {
        const src = nodePath.join(tmpPath, "test");
        const dst = nodePath.join(tmpPath, "test", "test");
        (function () {
            enFs.statSync(src);
        }).should.throw(Error);
        enfsmkdirp.mkdirpSync(src);
        (function () {
            move(src, dst);
        }).should.throw(Error);
        enFs.statSync(src).isDirectory().should.be.equal(true);
    });
    it("should overwrite the destination", function () {
        const src = nodePath.join(tmpPath, "src");
        const dst = tmpHelperPath;
        // use fixtures dir as dst since it has stuff
        const files = enFs.readdirSync(dst);
        files.indexOf("file1").should.be.greaterThanOrEqual(0);
        files.indexOf("folder1").should.be.greaterThanOrEqual(0);

        //create new src dir
        enfsmkdirp.mkdirpSync(nodePath.join(src, "folder-test"));
        enFs.writeFileSync(nodePath.join(src, "some-file"), "data some-file");
        const filesSrc = enFs.readdirSync(src);
        filesSrc.indexOf("some-file").should.be.greaterThanOrEqual(0);
        filesSrc.indexOf("folder-test").should.be.greaterThanOrEqual(0);
        move(src, dst, {overwrite: true, fs: enFs});
        const filesDst = enFs.readdirSync(dst);
        //dst should not have old stuff
        filesDst.indexOf("file1").should.be.equal(-1);
        filesDst.indexOf("folder1").should.be.equal(-1);
        //dst should have new stuff
        filesDst.indexOf("some-file").should.be.greaterThanOrEqual(0);
        filesDst.indexOf("folder-test").should.be.greaterThanOrEqual(0);
    });
});
