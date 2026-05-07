# Validation Summary: How to Use Podman with Cockpit Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cockpit
- `cockpit-podman`
- Podman
- systemd
- Podman Quadlet
- Linux package management with `dnf` and `apt`
- Cockpit TLS and access configuration

## Sources Consulted
- Cockpit Feature Internals: https://cockpit-project.org/guide/latest/features
- Cockpit startup behavior: https://cockpit-project.org/guide/latest/startup
- Cockpit configuration reference: https://cockpit-project.org/guide/latest/cockpit.conf.5.html
- Cockpit HTTPS/TLS guide: https://cockpit-project.org/guide/latest/https
- Cockpit installation guidance for Debian and Ubuntu: https://cockpit-project.org/running.html
- Red Hat Enterprise Linux 9 web console container management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/managing-containers-by-using-the-rhel-web-console
- Podman `generate systemd` reference: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet/systemd unit reference: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `stats` reference: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Cockpit 332 release notes: https://cockpit-project.org/blog/cockpit-332.html

## Issues Found
- The remote-management section implied that every added host must have `cockpit.socket` enabled and that Cockpit connects directly to remote Cockpit instances. I corrected this to match current Cockpit behavior: only the machine you open in the browser needs `cockpit.socket` enabled, and host-switcher connections to additional machines are made over SSH from that machine.
- The post did not mention that Cockpit's multi-machine host switcher is deprecated in current documentation. I added a note to reflect that the feature is deprecated as of Cockpit 322, while still documenting the existing workflow.
- The `machines.d` JSON example used hex color values. Cockpit's documented formats are color names or `rgb(...)`, so I replaced the example values with supported color names.
- The `podman generate systemd` note said the command may be removed in a future Podman release. Current Podman documentation instead marks it as deprecated and in maintenance mode, with Quadlet recommended for new deployments. I updated the note accordingly.
- The comment above `/etc/cockpit/disallowed-users` described the file as restricting access by group. That file blocks specific user accounts, so I corrected the comment.

## Review Notes
- The Debian and Ubuntu install commands are valid, but current Cockpit documentation recommends using distro backports when you want a newer Cockpit release than the base repository provides.
- As of Cockpit 332, `cockpit-podman` automatically starts `podman.socket` when needed, so enabling `podman.socket` in the automation script is optional rather than strictly required.
