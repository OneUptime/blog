# Validation Summary: How to Set Up a Node.js Application with PM2 on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js (v20 LTS)
- NodeSource APT repository
- nvm (Node Version Manager)
- npm
- PM2 (Process Manager 2)
- Express.js
- pm2-logrotate module
- systemd (via `pm2 startup`)
- Nginx (reverse proxy, upstream, gzip_static)
- Ubuntu

## Sources Consulted
- PM2 official documentation — Application declaration / ecosystem file: https://pm2.keymetrics.io/docs/usage/application-declaration/
- PM2 cluster mode / reload behavior: https://pm2.keymetrics.io/docs/usage/cluster-mode/
- PM2 startup script docs: https://pm2.keymetrics.io/docs/usage/startup/
- pm2-logrotate module README: https://github.com/keymetrics/pm2-logrotate
- NodeSource Node.js distributions: https://github.com/nodesource/distributions
- nvm install instructions: https://github.com/nvm-sh/nvm
- Express.js v4 API: https://expressjs.com/en/api.html
- Nginx upstream and proxy_pass directives: https://nginx.org/en/docs/http/ngx_http_upstream_module.html, https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- npm ci docs: https://docs.npmjs.com/cli/v10/commands/npm-ci

## Issues Found
- **Invalid ecosystem.config.js fields**: The `ecosystem.config.js` example included `max_size: '100M'` and `retain: 10` as keys inside the app's config object. These are not valid PM2 ecosystem fields — they are configuration options for the separate `pm2-logrotate` module (which is configured later in the post via `pm2 set pm2-logrotate:max_size 100M`). PM2 silently ignores unknown keys, so leaving them in place would mislead readers into thinking log rotation is configured via the ecosystem file. I removed both fields and added a short note pointing readers to the pm2-logrotate section for log rotation.

## Review Notes
- `npm ci --production` is shown in the "Deploying Code Updates" section. It still works, but since npm v9 the recommended flag is `--omit=dev`. Both produce equivalent behavior today, so I did not change it — flagging here as a future improvement.
- The Express example app handles only `SIGTERM` for graceful shutdown. PM2's default kill signal for graceful reload is `SIGINT` (it then sends `SIGKILL` after `kill_timeout`, which defaults to 1600ms). For full graceful-reload behavior under PM2 cluster reload, an app should also listen for `SIGINT`. This is example code and still works for systemd-driven shutdowns, so I left it as-is.
- nvm `v0.39.0` is used in the install command. The latest stable release line is `v0.40.x`. v0.39.0 still works fine; consider bumping to a newer version in a future revision.
- `gzip_static on;` requires the `ngx_http_gzip_static_module` to be compiled in. It is included in Ubuntu's default `nginx` package, so the snippet works out of the box on Ubuntu.
- `pm2 startup` autodetects the init system on modern Ubuntu (systemd). The example output `pm2 startup systemd -u ubuntu --hp /home/ubuntu` is the documented format and remains correct.
