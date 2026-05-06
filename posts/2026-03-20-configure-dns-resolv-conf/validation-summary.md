# Validation Summary: How to Configure DNS Servers in /etc/resolv.conf

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux DNS stub resolver
- `/etc/resolv.conf`
- glibc resolver behavior
- NetworkManager
- systemd-resolved
- Docker networking
- Kubernetes DNS

## Sources Consulted
- Linux man-pages: `resolv.conf(5)` - https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Linux man-pages: `host.conf(5)` - https://man7.org/linux/man-pages/man5/host.conf.5.html
- NetworkManager Reference Manual: `NetworkManager.conf` - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- Docker Docs: Networking overview / DNS services - https://docs.docker.com/engine/network/
- Kubernetes Docs: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Docs: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- systemd Docs: `resolvectl` - https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html

## Issues Found
- The section title and inline note claimed a complete list of resolver options, but the post only covered a subset. I changed this to "Common Configuration Options" so the scope matches the content.
- The `domain` explanation said it cannot be used with `search`. In the resolver documentation, `domain` is the obsolete single-entry form of `search`, so I corrected the explanation and removed the conflicting `domain company.internal` line from the enterprise example.
- The `search` limit was outdated. glibc 2.26 and later no longer impose the old 6-domain / 256-character limit, so I updated the note to distinguish current glibc from glibc 2.25 and earlier.
- The `attempts` explanation was inaccurate. The resolver docs describe it as the total number of query attempts before giving up, not retries per nameserver, so I corrected that wording.
- The `ndots` explanation was reversed. I fixed the description so `ndots:1` means names containing a dot are tried as absolute names first, while higher values cause more search-list expansion first.
- The `/etc/resolv.conf` examples used inline comments on `nameserver` lines. The documented comment format for `resolv.conf` is comment characters in the first column, so I converted those to standalone comment lines.
- The Docker example used `172.17.0.1` as if it were the resolver address. Docker’s current documentation says the default bridge receives a copy of the host `resolv.conf`, while custom networks use the embedded DNS server at `127.0.0.11`, so I corrected the example to an explicit Docker embedded-DNS case.
- The Kubernetes example treated `10.96.0.10` as a fixed kube-dns address and said Kubernetes "requires" `ndots:5`. I changed the nameserver comment to make clear that the cluster DNS Service IP varies, and rewrote the `ndots:5` note to match Kubernetes docs: it is the default used so search paths work for generated service names.
- The verification/debug block used `RESOLV_HOST_CONF` and `RESOLV_CONF` with `nscd`. `RESOLV_HOST_CONF` applies to `/etc/host.conf`, not `/etc/resolv.conf`, and I did not find authoritative support for `RESOLV_CONF` in the documented glibc resolver interface. I replaced that block with checks that are documented and aligned with current systems: `getent` under `strace`, `ls -l /etc/resolv.conf`, and `resolvectl status`.
- The `chattr +i` note overstated the effect as "root can't overwrite". I softened that to the accurate operational description that it prevents normal writes until the immutable bit is removed.

## Review Notes
- The post is now technically sound for current Linux systems, but some behavior is libc-specific. The search-list limit note is written explicitly in terms of glibc because other libc implementations can differ.
- On systems that use `systemd-resolved` or NetworkManager, `/etc/resolv.conf` may be a managed symlink or stub file, so the effective DNS configuration can differ from hand-edited file contents. The post already notes this, and the verification section now points readers to `resolvectl status`.
