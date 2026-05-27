# Validation Summary: How to Use Ansible to Deploy a Node.js Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and modules
- Node.js and npm
- NodeSource Debian/Ubuntu packages
- PM2 process management
- Nginx reverse proxy configuration
- Ansible Vault

## Sources Consulted
- Ansible `apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `deb822_repository` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible `shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.npm` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/npm_module.html
- NodeSource distributions documentation: https://github.com/nodesource/distributions/blob/master/DEV_README.md
- PM2 ecosystem file documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
- PM2 CLI reference: https://doc.pm2.io/en/runtime/reference/pm2-cli/
- PM2 cluster mode documentation: https://pm2.keymetrics.io/docs/usage/cluster-mode/
- PM2 startup documentation: https://pm2.keymetrics.io/docs/usage/startup/
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx release notes: https://docs.nginx.com/nginx/releases/

## Issues Found
- Replaced the deprecated `apt_key` plus `apt_repository` pattern with `ansible.builtin.deb822_repository` and added `python3-debian`, which the module requires. The Ansible docs state that `apt-key` is deprecated and recommend `deb822_repository` for modern Debian-based systems.
- Fixed the npm install and build order. The original snippet installed production-only dependencies before the build, which can omit build tools from `devDependencies`. The corrected flow installs dependencies, conditionally runs `npm run build`, then prunes development dependencies with `npm prune --omit=dev`.
- Made the build step actually conditional. The original task title said it ran only if `package.json` had a build script, but the command always ran. Added a package script check before running the build.
- Linked the generated PM2 ecosystem file into each release and added `configure-pm2.yml` to the full deployment playbook. The original full deployment never ran the PM2 configuration playbook, and the deploy command expected `ecosystem.config.js` in the current release.
- Switched PM2 deployment and rollback commands from restart semantics to reload semantics. PM2 documents `reload` and `startOrReload` as the zero-downtime cluster-mode path, while restart kills and starts processes.
- Removed `wait_ready: true` from the generic PM2 ecosystem file. That option requires the application to send a `ready` message, which the tutorial did not implement.
- Removed `args: warn: false` from the shell task because current Ansible shell module documentation no longer includes that parameter.
- Updated the Nginx HTTP/2 configuration from `listen 443 ssl http2;` to `listen 443 ssl;` plus `http2 on;`, matching current Nginx documentation where the `listen ... http2` parameter is deprecated.

## Review Notes
- The post is technically valid after the fixes. Future improvements could replace the shell-based release cleanup with a more structured Ansible approach and avoid sharing one `node_modules` directory across releases, but those are maintainability considerations rather than correctness blockers.
