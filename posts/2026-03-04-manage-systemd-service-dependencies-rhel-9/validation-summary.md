# Validation Summary: How to Manage systemd Service Dependencies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd unit files
- systemd dependency directives: `After`, `Before`, `Requires`, `Wants`, `BindsTo`, `PartOf`, `Conflicts`
- `systemctl list-dependencies`
- `systemd-analyze`

## Sources Consulted
- Local `systemd.unit(5)` manual page, systemd 255
- Local `systemd.service(5)` manual page, systemd 255
- Local `systemctl(1)` and `systemd-analyze(1)` help/man output, systemd 255
- systemd upstream `systemd.unit(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd upstream `systemctl(1)`: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd upstream `systemd-analyze(1)`: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- Red Hat Enterprise Linux 9 systemd unit file documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- Red Hat Enterprise Linux 9 network target documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/systemd-network-targets-and-services_configuring-and-managing-networking

## Issues Found
- The description of `Requires`/`Wants` implied that requirements always mean another unit must already be running. Updated it to say they pull related units into the same start transaction; `Wants` is explicitly a weak dependency.
- The `After=network-online.target postgresql.service` explanation implied the network and PostgreSQL were guaranteed ready. Updated it to say `network-online.target` has been reached and PostgreSQL's start job has finished, which matches systemd ordering semantics.
- The `Requires` section omitted the important interaction with `After=` and overstated stop propagation. Updated it to clarify that failed required units prevent startup in the common `Requires` plus `After` pattern, and that stop/restart propagation applies to explicit stop/restart jobs.
- The `BindsTo` section incorrectly implied restart propagation as the main behavior. Updated it to describe the documented behavior: if the bound unit stops or unexpectedly becomes inactive, the binding unit is stopped.
- The `Conflicts` section did not mention that `Conflicts=` alone does not imply ordering. Added a short note that `After=` or `Before=` is needed if one service must be fully stopped before the other starts.
- The common mistake about `After=` was tightened to say it waits for the other unit's start job to finish and does not pull the unit in by itself.

## Review Notes
The unit snippets use placeholder users and executable paths, so they are illustrative rather than directly runnable without creating the `myapp` user and binaries. The directives and command syntax are valid, and the post is technically accurate after the edits above.
