# Validation Summary: How to Use Ansible to Set Up PM2 for Node.js Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PM2
- Node.js
- npm
- NodeSource Debian/Ubuntu packages
- systemd startup integration

## Sources Consulted
- PM2 Startup Hook documentation: https://pm2.io/docs/runtime/guide/startup-hook/
- PM2 CLI reference: https://pm2.io/docs/runtime/reference/pm2-cli/
- PM2 ecosystem file documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
- PM2 log management documentation: https://pm2.io/docs/runtime/guide/log-management/
- PM2 load-balancing and cluster mode documentation: https://pm2.io/docs/runtime/guide/load-balancing/
- Ansible community.general.npm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/npm_module.html
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Node.js Release Working Group schedule: https://github.com/nodejs/Release
- NodeSource distributions documentation: https://deb.nodesource.com/

## Issues Found
- The example used Node.js 20, which is now end-of-life as of April 30, 2026. Updated the variable to Node.js 24, which the official Node.js release page lists as LTS on the validation date.
- The post described log rotation as built in. PM2 has built-in log handling, but log rotation is provided through the pm2-logrotate module used later in the tutorial. Updated the wording.
- The Ansible role used `become_user: "{{ app_user }}"` before creating that user, and the playbook created the log directory before the user/group existed. Moved user, group, and log directory creation to the start of the role.
- The PM2 startup task tried to execute the last line of `pm2 startup` output. When run as root with `-u` and `--hp`, PM2 configures the startup service directly; copying a generated command from stdout is for the manual non-root workflow. Removed the extra execution task.
- The PM2 start task used `pm2 start`, which is not idempotent for an already managed ecosystem file. Updated it and the handler to `pm2 startOrReload ... --update-env`.
- The Jinja template inserted JavaScript strings directly with single quotes, which could break when values contain quotes or other special characters. Updated the template to render values with `to_json`.
- The deployment snippet reloaded every changed app and described it as zero-downtime, even for fork-mode applications. Updated the task to use `reload` only for cluster-mode apps and `restart` for fork-mode apps, and clarified the explanation.
- The documented `--tags deploy` command had no matching tags in the deployment snippet. Added `tags: deploy` to those deployment tasks.

## Review Notes
- The tutorial still uses short Ansible module names such as `npm`, `git`, and `apt`. This is valid in many Ansible installations, but using fully qualified collection names such as `community.general.npm` and `ansible.builtin.git` would make the examples clearer in a future revision.
