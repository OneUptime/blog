# Validation Summary: How to Configure iptables Firewall Rules for NFS on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (NFSv3 and NFSv4)
- iptables (netfilter)
- rpcbind / portmapper (port 111)
- rpc.mountd, rpc.statd, lockd (NLM)
- sysctl (kernel runtime parameters)
- iptables-persistent (Debian/Ubuntu)
- systemd (nfs-kernel-server service)

## Sources Consulted
- RFC 7530 (NFSv4 protocol) — https://datatracker.ietf.org/doc/html/rfc7530
- Linux NFS-HOWTO — http://nfs.sourceforge.net/nfs-howto/
- `man 5 nfs`, `man 8 rpc.mountd`, `man 8 rpc.statd`
- `man 8 iptables`, `man 8 iptables-extensions` (state, multiport modules)
- Linux kernel docs: `Documentation/admin-guide/sysctl/fs.rst` (lockd `nlm_tcpport`/`nlm_udpport`)
- Debian/Ubuntu `nfs-kernel-server` and `nfs-common` package contents (defaults files)
- Debian `iptables-persistent` package — https://manpages.debian.org/bookworm/iptables-persistent/

## Issues Found
No technical issues found. Verified items:

- NFSv4 only requiring port 2049/TCP (port 111 not strictly needed) — correct; NFSv4 embeds MOUNT and NLM into the protocol itself.
- NFSv3 port set (111, 2049, plus dynamic mountd/statd/lockd) — correct.
- `RPCMOUNTDOPTS` in `/etc/default/nfs-kernel-server` and `STATDOPTS` in `/etc/default/nfs-common` — correct file paths and variable names for Debian/Ubuntu.
- `--port` and `--outgoing-port` flags for `rpc.mountd` / `rpc.statd` — match the man pages.
- `fs.nfs.nlm_tcpport` and `fs.nfs.nlm_udpport` sysctls — correct keys for fixing NLM (lockd) ports in NFSv3.
- iptables syntax (`-p tcp/udp --dport`, `-m state --state ESTABLISHED,RELATED`, `-m multiport --dports`) — all valid.
- `iptables-save` to `/etc/iptables/rules.v4` and `apt install iptables-persistent` — correct path and package.
- `nfs-kernel-server` systemd service name — correct on Debian/Ubuntu.

## Review Notes
- Rule ordering: in the NFSv4 example the `ESTABLISHED,RELATED` rule is placed last. Functionally the rules still work for new inbound NFS connections (which match the explicit ACCEPTs above), but conventionally and for efficiency the established/related rule is placed first so reply-direction packets short-circuit before being re-evaluated. Not technically wrong, just stylistically suboptimal.
- On newer Debian/Ubuntu releases (and on Fedora/RHEL) `/etc/nfs.conf` is the preferred configuration source and `/etc/default/nfs-*` files are gradually being deprecated. The post correctly scopes its examples to "Debian/Ubuntu" where the `/etc/default/*` files still work, but readers on the very latest releases may want to consult `nfs.conf(5)` as well.
- `-m state` is the legacy match; `-m conntrack --ctstate ESTABLISHED,RELATED` is the modern equivalent. Both still work in current iptables; no change required.
- On RHEL/CentOS/Fedora the systemd service is `nfs-server`, not `nfs-kernel-server`. The post correctly stays within Debian/Ubuntu scope.
