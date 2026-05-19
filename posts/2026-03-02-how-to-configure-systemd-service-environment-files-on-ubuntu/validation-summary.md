# Validation Summary: How to Configure systemd Service Environment Files on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd service units
- `Environment=`
- `EnvironmentFile=`
- systemd credentials with `LoadCredential=`
- Linux process environments and `/proc/<PID>/environ`

## Sources Consulted
- systemd.exec official documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.service official documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.unit official documentation: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- Ubuntu package details for systemd on Ubuntu 22.04 Jammy: https://packages.ubuntu.com/jammy/systemd
- Local Ubuntu man pages for `systemd.exec(5)`, `systemd.service(5)`, `systemd.unit(5)`, `systemd.syntax(7)`, and `systemctl(1)`

## Issues Found
- The post recommended `EnvironmentFile=` for secrets. systemd documentation warns that unit environment variables are exposed over D-Bus and are not suitable for secrets. I changed the wording to recommend environment files for deployment-specific configuration and point readers to systemd credentials for sensitive secrets.
- The complete service example used `Type=notify` with a generic Gunicorn command. `Type=notify` requires readiness notification support, which the example did not configure. I changed it to `Type=exec`, which is appropriate for a long-running foreground service command.
- The permissions section stated that the service user needs read access to the environment file. For system services, systemd reads `EnvironmentFile=` as the service manager before executing the service. I clarified that root-only access is sufficient unless the service user also needs to inspect the file directly.
- The variable expansion section implied that `$VARIABLE` expansion applies broadly throughout unit files and included a mismatched `BASE_DIR` comment. I narrowed the claim to service command lines and fixed the example comment and command path.
- The systemd credentials section claimed Ubuntu 22.04 requires systemd 250+ for `LoadCredential`. Ubuntu 22.04 ships systemd 249, and `LoadCredential=` was added in systemd 247. I corrected the version guidance and credential storage description.
- The `/proc/<PID>/environ` grep example did not match the sample `API_SECRET_KEY` variable. I updated the pattern.
- The debugging section described `systemctl show --property=Environment` as showing all environment variables the service sees. It only reports the unit's configured inline environment property. I corrected the description.
- The command for testing the environment file used shell command substitution around `cat` and `grep`, which does not match systemd's `EnvironmentFile=` parser and breaks quoted values. I replaced it with a `systemd-run` command that asks systemd to parse the file.
- The final gotcha incorrectly said `EnvironmentFile=` variables are not available to `ExecStartPre`. systemd applies the same command-line environment expansion model to `ExecStartPre`, `ExecStart`, `ExecStartPost`, `ExecReload`, and stop commands. I corrected that explanation.

## Review Notes
The remaining examples are syntactically consistent with current systemd documentation. The post still uses environment variables for illustrative database URLs and API keys, but now includes the needed caveat that systemd credentials are the more appropriate mechanism for sensitive secrets.
