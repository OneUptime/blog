# Validation Summary: How to Fix 'Error: listen EADDRINUSE' in Node.js

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Node.js
- Express
- TCP ports and sockets
- macOS and Linux command-line tools
- Windows Command Prompt
- nodemon
- PM2
- Visual Studio Code JavaScript debugger
- Docker

## Sources Consulted
- Node.js Errors documentation: https://nodejs.org/api/errors.html
- Node.js Net documentation: https://nodejs.org/api/net.html
- get-port package README via npm registry: https://www.npmjs.com/package/get-port
- nodemon README: https://github.com/remy/nodemon
- Docker CLI reference for `docker container ls` / `docker ps`: https://docs.docker.com/reference/cli/docker/container/ls/
- PM2 Quick Start documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- VS Code JavaScript debugger options: https://github.com/microsoft/vscode-js-debug/blob/main/OPTIONS.md
- lsof Linux manual page: https://man7.org/linux/man-pages/man8/lsof.8.html
- Apple AirDrop & Continuity settings documentation: https://support.apple.com/guide/mac-help/change-airdrop-continuity-settings-mchl6a407f99/mac

## Issues Found
- The Windows `cmd` snippet used `#` comments, which are not valid Command Prompt comments. Changed them to `::` comments and filtered the `netstat` output to `LISTENING` entries so the PID shown is the one binding the port.
- The EADDRINUSE cause list said the port can be reserved by the operating system. Node.js documents EADDRINUSE as another server already occupying the local address, so this was changed to the app listening on the same port twice.
- The graceful error-handler example treated `process.env.PORT` as a string, which made `PORT + 1` produce string concatenation when `PORT` came from the environment. Changed the example to parse the port as a number.
- The `get-port` example used CommonJS `require('get-port')`, but the current package is ESM. Changed the snippet to use ESM imports for both `express` and `get-port`.
- The manual port-checking helper resolved only for EADDRINUSE errors and could hang for other listen errors. Added rejection for non-EADDRINUSE errors and resolved after `server.close()` completes.
- The post referred to "zombie processes" holding ports. Zombie processes have already exited and do not hold sockets; changed the wording to stale/background child processes.
- The macOS AirPlay Receiver setting path used the older System Preferences location. Updated it to the current System Settings path documented by Apple.
- The Linux privileged-port example said `PORT=80` but showed only `node app.js`. Changed the command to `PORT=80 node app.js` and clarified that the privileged-port rule applies on many Linux systems.

## Review Notes
The corrected JavaScript snippets were syntax-checked with Node.js 22.22.0 as CommonJS or ESM as appropriate. No further technical issues found.
