# Validation Summary: How to Configure IPSec Site-to-Site Tunnel with Pre-Shared Keys

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPsec
- IKEv2
- strongSwan
- Pre-shared keys (PSK)
- Linux networking
- IPv4 routing
- systemd

## Sources Consulted
- strongSwan Documentation, "Introduction to strongSwan": https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan Documentation, "Configuration Files": https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Documentation, "Installation Documentation": https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan Documentation, "Logging": https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan Documentation, "Forwarding and Split-Tunneling": https://docs.strongswan.org/docs/latest/howtos/forwarding.html
- strongSwan Documentation, "charon-systemd": https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- strongSwan Documentation, "swanctl Tool": https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- Debian manpage for `ipsec.conf(5)` (strongSwan starter backend): https://manpages.debian.org/testing/strongswan-starter/ipsec.conf.5.en.html
- Debian manpage for `ipsec.secrets(5)` (strongSwan starter backend): https://manpages.debian.org/testing/strongswan-starter/ipsec.secrets.5.en.html
- Debian manpage for `ipsec(8)` (strongSwan starter backend): https://manpages.debian.org/testing/strongswan-starter/ipsec.8.en.html
- RFC 3706, "A Traffic-Based Method of Detecting Dead Internet Key Exchange (IKE) Peers": https://datatracker.ietf.org/doc/html/rfc3706
- RFC 7296, "Internet Key Exchange Protocol Version 2 (IKEv2)": https://datatracker.ietf.org/doc/html/rfc7296

## Issues Found
- The post used the legacy `ipsec.conf`/`ipsec.secrets` backend without saying so, while current strongSwan documentation recommends `swanctl.conf` for new deployments. I added a brief note so the guidance is accurate about the backend being used.
- The IKEv2 connection examples used `authby=secret`. In current strongSwan documentation, `authby` is deprecated for IKEv2 and `leftauth`/`rightauth` should be used instead. I replaced the deprecated setting with explicit PSK authentication directives on both peers.
- The example used `dpdtimeout=30s` in an IKEv2 configuration. Current `ipsec.conf(5)` documents `dpdtimeout` as applying only to IKEv1, while `dpddelay` controls the IKEv2 liveness-check interval. I corrected the option to `dpddelay=30s`.
- The startup commands used `systemctl start strongswan`, which corresponds to the `charon-systemd`/`swanctl` backend, not the legacy `ipsec.conf` starter backend shown in the post. I replaced that with `ipsec start`, which matches the documented legacy workflow.
- The troubleshooting command `ipsec stroke loglevel ike 3` was not appropriate as the primary current guidance for this post and the log handling depends on the legacy syslog-based backend. I replaced it with log file monitoring commands that match strongSwan's documented logging behavior for the starter backend.
- The troubleshooting comment said `ipsec restart` restarts a specific connection, but `ipsec(8)` documents it as restarting the whole starter/daemon stack. I corrected the wording.
- The IP forwarding section implied that enabling `net.ipv4.ip_forward` alone is sufficient. strongSwan's forwarding guidance also requires correct routing for hosts behind each gateway and potentially firewall rules for forwarded traffic. I clarified that requirement in the prose.
- The introduction described strongSwan as "the most widely used" open-source IPsec implementation on Linux, which is a comparative claim not established by the consulted documentation. I changed that to the safer factual wording "a widely used".
- The note that IKEv2 is "more secure than IKEv1" was too broad for the way it was stated. I removed that claim and kept the configuration directive itself.

## Review Notes
- The post now accurately documents a supported but deprecated strongSwan configuration path. For new deployments, strongSwan's current documentation prefers `swanctl.conf` with the `charon-systemd` service and `swanctl` commands.
- The example uses RFC 5737 documentation addresses (`203.0.113.0/24`), which is appropriate for a tutorial and should not be copied verbatim into production.
