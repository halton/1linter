#!/usr/bin/env node

// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

const os = require('os');
const path = require('path');
const recursive = require('recursive-readdir');
const spawn = require('child_process').spawnSync;
const which = require('which');

let errors = [];

/**
 * Check C++ Style
 * @param {array} files C++ files.
 */
function doCppLint(files) {
  if (typeof files == 'undefined' || files.length == 0) return;

  let cpplint = which.sync('cpplint.py');
  if (os.platform() == 'win32') {
    cppline = which.sync('cpplint', {pathExt: '.EXE;.PY'});
  }

  if (!cpplint) {
    console.log('You need install depot_tools, and add to PATH.' +
                'https://dev.chromium.org/developers/how-tos/install-depot-tools');
    process.exit(1);
  }

  let cmdOptions = [cpplint];
  cmdOptions = cmdOptions.concat(files);
  // cpplint report result in stderr, $? is always 0 whatever there
  // are errors or not. So we need check the last line as
  // "Total errors found: 0"
  let output = spawn('python', cmdOptions).stderr.toString().split(os.EOL);
  if (output[output.length - 2] != 'Total errors found: 0') {
    errors = errors.concat(output);
  }
}

/**
 * Check JavaScript Style
 * @param {array} files JavaScript files.
 */
function doJsLint(files) {
  if (typeof files == 'undefined' || files.length == 0) return;

  let jsLinterDir = path.join(__dirname, 'node_modules', '.bin');

  for (let linter of ['eslint']) {
    let output = null;
    if (os.platform() == 'win32') {
      output = spawn(path.join(jsLinterDir, linter + '.cmd'), files)
          .stdout.toString();
    } else {
      output = spawn('node', [path.join(jsLinterDir, linter)].concat(files))
          .stdout.toString();
    }
    if (output) {
      let lines = output.split('\n');
      if (lines.length > 0) errors = errors.concat(lines);
    }
  }
}

recursive(
    path.resolve(process.argv[2]),
    ['node_modules', '.eslintrc.js'], // ignore files
    function(err, files) {
      let cppFiles = [];
      let jsFiles = [];
      for (let f of files) {
        if (path.extname(f) == '.js') {
          jsFiles.push(f);
        } else if (path.extname(f) == '.cpp' || path.extname(f) == '.cc') {
          cppFiles.push(f);
        }
      }

      doCppLint(cppFiles);
      doJsLint(jsFiles);

      if (errors.length >= 1) {
        for (let l of errors) console.log(l);
        process.exit(1);
      }
    });
