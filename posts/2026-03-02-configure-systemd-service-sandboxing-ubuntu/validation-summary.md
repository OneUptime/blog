# Validation Summary: How to Configure systemd Service Sandboxing on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- systemd service units
- systemd sandboxing directives
- Linux capabilities
- Linux namespaces
- seccomp system call filtering

## Sources Consulted
- systemd.exec(5), local Ubuntu systemd 255 man page and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.resource-control(5), local Ubuntu systemd 255 man page and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- systemd-analyze(1), local Ubuntu systemd 255 help/man page and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- capabilities(7), local Linux man page: https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- The `ProtectSystem=` comments described `full` and `strict` incorrectly. I changed them to match systemd documentation: `true` makes `/usr`, `/boot`, and `/efi` read-only; `full` also makes `/etc` read-only; `strict` makes the whole filesystem read-only except `/dev`, `/proc`, and `/sys`.
- The guidance said services needing `/etc` writes should use `ProtectSystem=full`, but `full` makes `/etc` read-only. I changed the guidance to recommend explicit `ReadWritePaths=` allow-listing for required writable paths.
- The `DeviceAllow=` example combined `PrivateDevices=true` with specific device allow-listing. systemd documents `DeviceAllow=`/`DevicePolicy=` as the mechanism for allowing specific devices, while `PrivateDevices=` replaces `/dev` with a minimal private device tree. I changed the example to use `DevicePolicy=closed`.
- The `RestrictAddressFamilies=none` comment said it denied all network sockets. systemd denies creation of sockets for all address families, so I clarified the comment.
- The TCP/UDP `RestrictAddressFamilies=` example included `AF_UNIX`; I clarified that the example allows TCP/UDP plus local Unix sockets.
- The `PrivateUsers=` description said the service cannot see system users. systemd maps users and groups other than root, nobody, and the service's own user to nobody, so I corrected that description.
- The `ProtectKernelLogs=` description only mentioned read access. systemd denies access to the kernel log ring buffer, so I changed it to "access" rather than "read access."

## Review Notes
The post is technically relevant and valid after the corrections. The examples are general-purpose hardening snippets; in real deployments, directives such as `SystemCallFilter=@system-service`, `PrivateUsers=true`, `CapabilityBoundingSet=`, and `ProtectSystem=strict` should still be applied incrementally because service-specific runtime needs can vary.
