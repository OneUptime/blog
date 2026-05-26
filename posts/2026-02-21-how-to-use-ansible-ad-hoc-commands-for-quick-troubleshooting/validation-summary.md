# Validation Summary: How to Use Ansible Ad Hoc Commands for Quick Troubleshooting

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible ping, shell, and service modules
- systemd and journalctl
- Linux process, filesystem, memory, and network troubleshooting commands
- curl
- PostgreSQL pg_isready
- Redis CLI
- Bash shell aliases

## Sources Consulted
- Ansible ad hoc command documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- curl documentation on connection timeouts: https://everything.curl.dev/usingcurl/connections/timeout.html
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- Local command help output for systemctl, curl, and ss.

## Issues Found
- The connectivity section implied that Ansible-unreachable hosts are likely unreachable by users. This was too strong because ansible.builtin.ping verifies Ansible login and usable Python, not ICMP or application reachability. Updated the explanation to mention host downtime, management-network issues, and SSH/Python check failures.
- The crashed-service command used `systemctl is-failed` without `--quiet`, which can print non-failed states such as `active`. Updated it to `systemctl is-failed --quiet nginx && hostname || true` so only failed services produce host output.
- The multi-line resource check used unescaped command substitutions inside a locally double-quoted Ansible argument, causing commands such as `$(hostname)` and `$(free ...)` to run on the control node before Ansible executed. Escaped the command substitutions so they run on the managed hosts.
- The log search and open-port examples could make Ansible mark hosts failed when `grep` found no matches, which is an expected troubleshooting outcome. Added `|| true` where a no-match result should not be treated as command failure.
- The process-count example used plain `grep myapp`, which could match the grep process and returned a failure when no process existed. Changed it to `grep '[m]yapp' || true`.
- The file descriptor example could break when `pgrep -f myapp` returned multiple PIDs or no PID. Updated it to inspect the first matching PID and print `0` when no process is found.
- The performance workflow used `curl` against `http://db.internal:5432`, which is not appropriate for a PostgreSQL service port. Replaced it with `pg_isready -h db.internal -p 5432 -t 2`.

## Review Notes
The examples assume Linux managed hosts with common troubleshooting tools installed, such as systemd, journalctl, ss, curl, dig, traceroute, iostat, lsof, redis-cli, and pg_isready. Some commands may need package installation or privilege escalation depending on the distribution and host policy.
