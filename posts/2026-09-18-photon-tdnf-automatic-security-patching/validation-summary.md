# Validation Summary: How to Automate Photon OS Security Patching with tdnf-automatic

## Status

validated

## Post Type

Technical guide with shell commands, INI configuration, and systemd timer configuration.

## Technologies Covered

- Photon OS and RPM package management
- tdnf and tdnf-automatic
- Repository security advisory metadata
- systemd services, timers, and journalctl
- Canary patch deployment and restart coordination

## Sources Consulted

- [Photon OS 5 tdnf-automatic documentation](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/tdnf-automatic/) — documented configuration, CLI flags, and timer variants.
- [Upstream automatic.conf](https://raw.githubusercontent.com/vmware/tdnf/dev/etc/tdnf/automatic.conf) — section names, accepted settings, and packaged values.
- [Upstream tdnf-automatic implementation](https://raw.githubusercontent.com/vmware/tdnf/dev/bin/tdnf-automatic.in) — root requirement, configuration parsing, mode selection, advisory reporting, and security installation command.
- [Generic timer](https://raw.githubusercontent.com/vmware/tdnf/dev/etc/systemd/tdnf-automatic.timer) and [generic service](https://raw.githubusercontent.com/vmware/tdnf/dev/etc/systemd/tdnf-automatic.service) — schedule, persistence, oneshot execution, and OSTree exclusion.
- [Installation service](https://raw.githubusercontent.com/vmware/tdnf/dev/etc/systemd/tdnf-automatic-install.service) and [notification service](https://raw.githubusercontent.com/vmware/tdnf/dev/etc/systemd/tdnf-automatic-notifyonly.service) — command-line overrides.
- [Photon packaging specification](https://raw.githubusercontent.com/vmware/photon/5.0/SPECS/tdnf/tdnf.spec) — separate automatic package and installed configuration and unit paths.
- [systemd timer manual source, v252](https://github.com/systemd/systemd/blob/v252/man/systemd.timer.xml) — resetting calendar assignments, random delays, accuracy tolerance, and missed-run persistence.
- [systemd time manual source, v252](https://github.com/systemd/systemd/blob/v252/man/systemd.time.xml) — Sunday calendar syntax and timezone handling.
- [systemctl manual source, v252](https://github.com/systemd/systemd/blob/v252/man/systemctl.xml) — unit inspection, timer listing, drop-in editing, daemon reload, enablement, and stopping disabled units.
- [journalctl manual source, v252](https://github.com/systemd/systemd/blob/v252/man/journalctl.xml) — unit selection and the `today` time expression.
- [systemd service manual source, v252](https://github.com/systemd/systemd/blob/v252/man/systemd.service.xml) — successful oneshot services becoming inactive.
- [RPM manual](https://rpm.org/docs/6.0.x/man/rpm.8) — querying installed packages with `rpm -q`.
- [Photon OSTree host updating operations](https://vmware.github.io/photon/docs-v5/administration-guide/photon-rpm-ostree/host-updating-operations/) — separate image-based update lifecycle.

## Issues Found

1. **Canary promotion would remain in notification mode.** The initial configuration sets `show_updates=yes`, but the original promotion step changed only `apply_updates`. In the inspected upstream implementation, generic execution installs only when `show_updates` is false and `apply_updates` is true. Updated promotion to set both values, corrected the description of the generic timer, and linked the implementation.
2. **Required privileges were unstated.** The implementation rejects non-root execution, including notification-only runs. Added a root-shell prerequisite without changing the commands.
3. **Security reporting was described too broadly as security-filtered.** Security installation invokes `tdnf --security update`, but its report is built with unfiltered `tdnf updateinfo info`. Clarified that notifications can include other advisory types and that the security selection applies to installation.
4. **Disabling competing timers does not stop them.** Clarified that previously enabled variants must be stopped as well as disabled, using `systemctl disable --now` with their unit names.
5. **The fifteen-minute timing description omitted accuracy tolerance.** Clarified that the random delay is followed by the timer accuracy tolerance, which defaults to one minute. The schedule itself remains unchanged.

## Review Notes

- Reviewed all command blocks and configuration fields against official documentation and upstream source. The reporting configuration uses the correct singular `[emitter]` section, supported boolean values, and valid numeric delay values.
- Confirmed the packaged generic timer is persistent by default and invokes the matching oneshot service without an installation override. The post deliberately overrides persistence and preserves the distinction between a scheduled run and a verified patch outcome.
- The upstream implementation was necessary to resolve behavior that the high-level Photon documentation does not fully explain. The post does not pin a tdnf version; installed packages and repository snapshots must still be checked on each target host. Development-branch sources can change.
- Notification mode refreshes metadata and reports advisories; it does not download and verify candidate RPM signatures. The instruction to establish package-signature validity before unattended installation remains a separate prerequisite.
- Advisory completeness, package activation, kernel reboot requirements, process restarts, and application health cannot be established from timer status. The post correctly requires operational verification and a canary rollout.
- The original Photon documentation link resolved. GitHub HTML fetching was unavailable through the browsing tool, so configuration and implementation were read from the official repository's raw endpoints. The freedesktop manual pages returned HTTP 403; equivalent official systemd manual sources were consulted instead. These access restrictions are not evidence that the original URLs are incorrect.
- This was a documentation and source review in a macOS workspace, not an execution test on a Photon host. No system services, repositories, or installed packages were changed. Final verification covered JSON structure, shell syntax, configuration parsing, and the scoped diff.
