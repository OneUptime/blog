# Validation Summary: How to Configure /etc/hosts for Local IPv4 Name Resolution on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- IPv4
- `/etc/hosts`
- glibc Name Service Switch (NSS)
- DNS resolver configuration
- Docker
- Docker Compose

## Sources Consulted
- `hosts(5)` Linux man page: https://man7.org/linux/man-pages/man5/hosts.5.html
- `nsswitch.conf(5)` Linux man page: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
- `resolv.conf(5)` Linux man page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- GNU C Library manual, Host Names: https://www.gnu.org/software/libc/manual/html_node/Host-Names.html
- Docker `docker run` reference (`--add-host`): https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference (`extra_hosts`): https://docs.docker.com/reference/compose-file/services/
- Local CLI help output for `getent --help`
- Local CLI help output for `ping -h`

## Issues Found
- The introduction said the kernel checks `/etc/hosts` before DNS. On Linux systems using NSS, hostname resolution order is handled by the system resolver and `/etc/nsswitch.conf`, not directly by the kernel. I corrected that wording.
- The post said `/etc/hosts` changes take effect immediately with no caveats. The `hosts(5)` man page notes that changes normally take effect immediately except when applications cache the file, so I updated the body text and conclusion to reflect that nuance.
- The `dns` bullet under `/etc/nsswitch.conf` was slightly imprecise. I clarified that `dns` refers to the resolver using DNS servers configured in `/etc/resolv.conf`.
- The blocking example claimed `0.0.0.0` "fails faster" than `127.0.0.1`. That performance claim is application-dependent and not supported by the authoritative sources consulted, so I removed the comment while keeping the valid `0.0.0.0` example.

## Review Notes
- The simplified `hosts: files dns` example is valid, but many current Linux distributions use a longer `hosts:` line such as `files mdns4_minimal [NOTFOUND=return] dns` or `resolve`, depending on distro and resolver stack.
