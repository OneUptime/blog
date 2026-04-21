# Validation Summary: How to Configure Time Synchronization for IPv6-Only Networks

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- IPv6 networking
- NTP
- Chrony / chronyd / chronyc
- systemd-timesyncd
- DNS AAAA lookups with dig
- Docker containers
- Virtual machines
- Kubernetes DaemonSets and ConfigMaps
- OpenSSH and Bash

## Sources Consulted
- Chrony 4.8 `chrony.conf(5)` manual: https://chrony-project.org/doc/4.8/chrony.conf.html
- Chrony 4.8 `chronyc(1)` manual: https://chrony-project.org/doc/4.8/chronyc.html
- NTP Pool Project usage documentation: https://www.ntppool.org/en/use.html
- Cloudflare Time Services NTP documentation: https://developers.cloudflare.com/time-services/ntp/
- Google Public NTP documentation: https://developers.google.com/time
- systemd `timesyncd.conf` documentation source and local `timesyncd.conf(5)` man page: https://github.com/systemd/systemd/blob/main/man/timesyncd.conf.xml
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- OpenSSH `ssh(1)` manual and local OpenSSH 9.6 `ssh -G` behavior: https://man.openbsd.org/ssh
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Docker Engine `docker run` documentation for privilege/capability behavior: https://docs.docker.com/engine/containers/run/
- Local command help for `ping`, `dig`, `ssh`, and systemd-timesyncd configuration inspection.

## Issues Found
- The post used `ipv6.pool.ntp.org`, which does not match the NTP Pool Project's documented IPv6 behavior. The NTP Pool documentation states that IPv6 addresses are provided for zones prefixed with `2`, such as `2.pool.ntp.org`. Updated the DNS check, Chrony pool, and systemd-timesyncd fallback to use `2.pool.ntp.org`.
- The Chrony master example mixed Google Public NTP with Cloudflare and NTP Pool sources. Google Public NTP serves leap-smeared time, while Cloudflare documents that it does not implement leap smearing and warns against mixing smeared and non-smeared sources. Removed `time.google.com` from the mixed-source example and kept non-smearing IPv6-capable sources.
- The Chrony upstream source lines did not force IPv6 address selection. Chrony supports the `ipv6` source option, so the public upstream `server` and `pool` lines now include `ipv6`.
- Several example addresses used `2001:db8:internal::10`, which is not valid IPv6 syntax because `internal` is not hexadecimal. Replaced these with valid RFC 3849 documentation-prefix examples such as `2001:db8:100::10`.
- The local clock fallback comment said it prevents wild drift. Chrony's `local` directive lets clients continue using the server's local clock when upstream sources are unavailable, but it does not prevent the master's clock from drifting. Reworded the comment to say it keeps clients on a common time source while isolated.
- The IPv4 connectivity test used `ping -4 8.8.8.8` without a count, which would run until interrupted if IPv4 connectivity unexpectedly existed. Added `-c 3`. Also replaced `ping6` with the current `ping -6` form shown by local `ping` help.
- The SSH test used `root@[$host]`, which OpenSSH treats as a literal hostname containing brackets for the normal destination form. Updated it to `root@$host` while retaining `ssh -6`.
- The sync test treated any `chronyc tracking` output containing `Reference ID` as synchronized. Chrony includes `Reference ID` in tracking output, while `Leap status` reports whether the host is not synchronized. Updated the script to require a `Leap status` line that is not `Not synchronised`.

## Review Notes
- The Chrony and systemd-timesyncd configuration keys used in the corrected examples are current and documented.
- The Kubernetes manifest structure is valid for an illustrative DaemonSet and ConfigMap. In production, prefer host-level time synchronization where possible and pin any third-party container image by digest.
- The `2001:db8::/32` addresses are correctly reserved for documentation examples. Operators should replace them with their assigned IPv6 prefix or ULA prefix before deployment.
