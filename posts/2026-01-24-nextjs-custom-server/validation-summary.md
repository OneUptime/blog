# Validation Summary: How to Configure Custom Server in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js custom servers
- Express
- Fastify
- Socket.IO
- TypeScript
- Node.js
- Docker
- PM2

## Sources Consulted
- Next.js custom server guide: https://nextjs.org/docs/app/guides/custom-server
- Next.js output / standalone deployment docs: https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
- TypeScript `rootDir` TSConfig reference: https://www.typescriptlang.org/tsconfig/rootDir.html
- Fastify Reply API: https://fastify.dev/docs/latest/Reference/Reply/
- Socket.IO server options: https://socket.io/docs/v4/server-options/
- Socket.IO server instance API: https://socket.io/docs/v4/server-instance/
- Express serve-static middleware docs: https://expressjs.com/en/resources/middleware/serve-static/
- PM2 cluster mode docs: https://pm2.keymetrics.io/docs/usage/cluster-mode/
- PM2 ecosystem file docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

## Issues Found
- The TypeScript server config emitted `server/index.ts` to `dist/index.js` by default, while the scripts expected `dist/server/index.js`. Added `"rootDir": "."` so TypeScript preserves the `server/` directory under `dist`, matching the documented start command.
- The Socket.IO example said it broadcast messages to a room, but the code used `io.emit()`, which broadcasts to all connected clients. Updated the comment to match the actual behavior.
- The Fastify example called `reply.hijack()` after handing the raw response to Next.js. Moved `reply.hijack()` before `handle()` so Fastify clearly yields response ownership before Next.js writes to `reply.raw`.
- The Dockerfile copied `.next/standalone`, but the official Next.js custom server guide says standalone output and custom server files cannot be used together. Replaced the standalone copy with production `node_modules`, `package*.json`, `.next`, `public`, and `dist/server` copies suitable for running the compiled custom server, and added ownership flags for the non-root runtime user.
- The static-file example used `__dirname` from compiled server code, which would resolve under `dist/server` and point at `dist/public` or `dist/uploads`. Updated paths to use `process.cwd()` so they resolve to the project-level `public/static` and `uploads` directories when the compiled server runs from the app root.

## Review Notes
- The main guidance is consistent with the official Next.js custom server documentation: use a custom server only when the integrated router cannot meet the app's requirements, and expect to give up some framework optimizations.
- The examples intentionally target Express 4-style route matching. If the article is later updated to Express 5, wildcard route syntax should be reviewed because Express 5 uses newer path-to-regexp behavior.
- The authentication example uses in-memory session behavior by default. For production, a persistent session store should be configured, especially when using multiple processes.
