# Validation Summary: How to Fix ENOSPC Error (No Space Left on Device) in Node.js

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Node.js filesystem watchers
- Linux inotify and sysctl
- webpack watch options
- nodemon watch configuration
- Vite dev server watch configuration
- Chokidar file watching
- Docker
- WSL
- npm, yarn, pnpm

## Sources Consulted
- Node.js File System API documentation: https://nodejs.org/docs/latest/api/fs.html
- Linux inotify manual page: https://man7.org/linux/man-pages/man7/inotify.7.html
- Linux kernel sysctl fs documentation: https://docs.kernel.org/admin-guide/sysctl/fs.html
- systemd sysctl.d manual page: https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- webpack Watch and WatchOptions documentation: https://webpack.js.org/configuration/watch/
- nodemon README and configuration documentation: https://github.com/remy/nodemon
- Vite server.watch documentation: https://vite.dev/config/server-options
- Chokidar README and options documentation: https://github.com/paulmillr/chokidar
- pnpm symlinked node_modules structure documentation: https://pnpm.io/symlinked-node-modules-structure
- Docker system prune documentation: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker run sysctl documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Local command help for sysctl, find, du, npm cache, docker system prune, and journalctl

## Issues Found
- The diagnostic command for current watcher usage counted open inotify file descriptors, not individual watches. Changed it to count inotify watch entries from `/proc/*/fdinfo/*`, which is a closer approximation of watch usage.
- The Linux default watcher-limit wording was too absolute. Updated it to explain that older systems often default around 8192 while newer kernels and distributions may use higher memory-based defaults.
- The nodemon ignore example used `node_modules/**/node_modules`, which would only match nested node_modules paths. Changed it to `node_modules/**` and clarified that nodemon and Vite already ignore node_modules by default.
- The Chokidar examples used CommonJS `require`, but current Chokidar releases are ESM-first/ESM-only. Updated the examples to use `import chokidar from 'chokidar';`.
- The pnpm prevention tip said pnpm results in fewer files. pnpm's documentation says package files are hard linked from a content-addressable store, so the stronger accurate claim is reduced duplicated disk usage. Updated that wording.

## Review Notes
The commands and configuration snippets are generally accurate for common Linux development environments. Some cleanup commands, especially `docker system prune -a`, are intentionally broad and can remove substantial unused local Docker data; the post presents them under cleanup, but future edits could add a caution without changing the technical result.
