[![Build Status](https://travis-ci.org/n3okill/enfsmove.svg)](https://travis-ci.org/n3okill/enfsmove)
[![Build status](https://ci.appveyor.com/api/projects/status/7sa7do8hf79c4j5d?svg=true)](https://ci.appveyor.com/project/n3okill/enfsmove)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/8721ee3980094b75913805efc931bff4)](https://www.codacy.com/app/n3okill/enfsmove)
[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=64PYTCDH5UNZ6)

[![NPM](https://nodei.co/npm/enfsmove.png)](https://nodei.co/npm/enfsmove/)

enfsmove
=========
Module that add move functionality to node fs module
**enfs** stands for [E]asy [N]ode [fs]

Description
-----------
This module will add a method that allows moving files and directories in the file system.

- This module will add following methods to node fs module:
  * move
  * moveSync
  
Usage
-----
`enfsmove`

```js
    var enfsmove = require("enfsmove");
```

Errors
------
All the methods follows the node culture.
- Async: Every async method returns an Error in the first callback parameter
- Sync: Every sync method throws an Error.


Additional Methods
------------------
- [move](#move)
- [moveSync](#movesync)


### move
  - **move(srcPath, dstPatch, [options], callback)**

> Move files and directories in the file system

[options]:
  * fs (Object): an alternative fs module to use (default will be [enfspatch](https://www.npmjs.com/package/enfspatch))
  * mkdirp (Boolean): if true will create new directories instead of copying the old ones (default: false)
  * overwrite (Boolean): if true will overwrite items at destination if they exist (Default: false)
  * limit (Number): the maximum number of items being moved at a moment (Default: 512)
  

```js
    enfsmove.move("/home/myHome","/home/myOtherHome", function(err){
        if(!err) {
            console.log("Everything moved correctly");
        }
    });
```


### moveSync
  - **moveSync(srcPath, dstPath, [options])**

> Move files and directories in the file system

[options]:
  * fs (Object): an alternative fs module to use (default will be [enfspatch](https://www.npmjs.com/package/enfspatch))
  * mkdirp (Boolean): if true will create new directories instead of copying the old ones (default: false)
  * overwrite (Boolean): if true will overwrite items at destination if they exist (Default: false)
  * limit (Number): the maximum number of items being moved at a moment (Default: 512)


```js
    enfsmove.moveSync("/home/myHome","/home/myOtherHome");
    console.log("Everything moved correctly");
```


License
-------

Creative Commons Attribution 4.0 International License

Copyright (c) 2016 Joao Parreira <joaofrparreira@gmail.com> [GitHub](https://github.com/n3okill)

This work is licensed under the Creative Commons Attribution 4.0 International License. 
To view a copy of this license, visit [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


