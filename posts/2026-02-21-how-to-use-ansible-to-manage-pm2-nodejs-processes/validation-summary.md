# Validation Summary: How to Use Ansible to Manage PM2 Node.js Processes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PM2
- Node.js
- npm
- NodeSource Debian packages
- systemd
- logrotate

## Sources Consulted
- PM2 ecosystem file documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
- PM2 startup hook documentation: https://pm2.io/docs/runtime/guide/startup-hook/
- PM2 CLI reference: https://pm2.io/docs/runtime/reference/pm2-cli/
- PM2 load-balancing and zero-downtime reload documentation: https://pm2.io/docs/runtime/guide/load-balancing/
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible community.general.npm module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/npm_module.html
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci
- NodeSource distributions documentation: https://github.com/nodesource/distributions

## Issues Found
- The PM2 installation task used `ansible.builtin.npm`, but current Ansible documentation places the npm module in the `community.general` collection. Changed the task to use `community.general.npm`.
- The PM2 ecosystem template rendered values such as `instances: max` without JSON quoting, which would produce invalid JavaScript for the role defaults. Updated string and mixed-type template fields to use `to_json` so values like `"max"` render correctly and environment values are safely quoted.
- The deployment examples used `npm ci --production`. Current npm documentation describes omitting development dependencies with `--omit=dev`, so both install commands were updated.
- The systemd startup example attempted to execute a generated sudo command from PM2 output. That output can include shell syntax and environment expansion that is not appropriate for `ansible.builtin.command`. Updated the example to run `pm2 startup systemd -u ... --hp ...` directly with `become: yes`.
- The complete role used `become_user` without explicitly enabling privilege escalation. Added `become: yes` to the role tasks that need to run as `app_user` or write under privileged paths.

## Review Notes
- PM2's `reload` behavior is correctly described for cluster mode; PM2 restarts workers one at a time and falls back to restart if reload cannot complete.
- The `community.general.npm` module requires the `community.general` collection, which is commonly available with the full Ansible package but is not part of `ansible-core`.
- The NodeSource setup URL for Node.js 20 is plausible and matches NodeSource distribution documentation, but future posts may want to use Node.js 22 or 24 depending on the target LTS version at publication time.
