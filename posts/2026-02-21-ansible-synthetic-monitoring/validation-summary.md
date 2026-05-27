# Validation Summary: How to Use Ansible to Set Up Synthetic Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, inventory, roles, templates, cron, apt, command, and privilege escalation
- community.general npm module
- Playwright for browser-based synthetic checks
- Bash and cURL synthetic checks
- Prometheus Pushgateway exposition format
- Prometheus alerting rules and Alertmanager
- Grafana dashboards

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `community.general.npm` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/npm_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ad hoc command CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible.html
- Playwright browser installation documentation: https://playwright.dev/docs/browsers
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway

## Issues Found
- The role used `ansible.builtin.npm`, but the npm module is provided by the `community.general` collection, not `ansible-core`. Changed the task to use `community.general.npm`.
- The package list installed `chromium-browser`, but Playwright manages its own browser binaries and officially supports installing browser system dependencies through `npx playwright install --with-deps chromium`. Removed `chromium-browser` from the apt package list and updated the Playwright install command.
- The command `ansible-playbook ... --tags checks` would not select the script deployment tasks because those tasks had no `checks` tag. Added `tags: checks` to the check script, runner wrapper, and metrics pusher template tasks.
- The Playwright example used `waitUntil: 'networkidle'`, which Playwright documentation discourages for readiness checks. Changed it to `waitUntil: 'load'` and explicitly waited for the navigation selector to become visible.
- The Playwright example described Navigation Timing values as Core Web Vitals. Changed the comment to "navigation timing metrics" because the snippet does not measure LCP, CLS, or INP.
- The Playwright example used `process.exit()` inside the try/catch path, which could prevent `finally` cleanup from closing the browser. Replaced early exits with thrown errors and `process.exitCode`.
- The ad hoc Ansible command used `--become-user synthetic` without enabling privilege escalation. Added `--become`.

## Review Notes
The remaining examples are illustrative and use placeholder hosts and `example.com` URLs, which is appropriate for a tutorial. A production version should pin Node.js/Playwright versions and document the required `community.general` collection installation.
