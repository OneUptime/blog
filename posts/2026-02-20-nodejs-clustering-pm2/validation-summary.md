# Validation Summary: How to Scale Node.js Applications with Cluster Mode and PM2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Node.js cluster module
- Express
- PM2
- PM2 ecosystem configuration
- Process management and graceful shutdown

## Sources Consulted
- Node.js Cluster documentation: https://nodejs.org/api/cluster.html
- Node.js OS documentation: https://nodejs.org/api/os.html
- PM2 Cluster Mode documentation: https://pm2.keymetrics.io/docs/usage/cluster-mode/
- PM2 Ecosystem File reference: https://doc.pm2.io/en/runtime/reference/ecosystem-file/
- PM2 CLI reference: https://doc.pm2.io/en/runtime/reference/pm2-cli/

## Issues Found
- The post used `os.cpus().length` to size the worker pool. Node.js documentation recommends `os.availableParallelism()` for calculating available parallelism, so both cluster examples were updated.
- The worker application comment said the OS distributes incoming connections across workers. Node.js cluster documentation says the default round-robin mode has the primary process accept and distribute connections on most platforms, so the comment was corrected.
- The graceful shutdown cluster example sent a shutdown message that the worker application did not handle, did not disconnect workers, and did not start the worker application in the worker branch. The example was updated to call `worker.disconnect()` directly, clear the force-kill timeout after disconnect, use the `listening` event for rolling restart readiness, handle missing workers during restart iteration, and include an `else` branch that loads `./app`.
- The PM2 shutdown example described SIGINT as a message. PM2 documents SIGINT as the first signal sent on exit, so the comment was corrected to say signal.

## Review Notes
The PM2 commands and ecosystem options reviewed are current in the PM2 documentation. The post's high-level clustering guidance is accurate, with the usual caveat that clustered processes need external shared state for sessions, caches, and similar data.
