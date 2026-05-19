# Validation Summary: How to Debug Firewall Issues When Services Are Unreachable on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- UFW
- iptables / iptables-nft
- nftables
- tcpdump
- Docker firewall integration
- PostgreSQL network access configuration
- Nginx and Apache listener configuration
- AppArmor and SELinux audit checks
- Linux connection tracking

## Sources Consulted
- Local command help output for `ss`, `nc`, `iptables`, `nft`, `tcpdump`, `journalctl`, `ufw`, `aa-status`, `openssl s_client`, and `sysctl`
- Linux man-pages: iptables TRACE target and iptables-nft tracing behavior: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux man-pages: `xtables-monitor --trace`: https://man7.org/linux/man-pages/man8/xtables-monitor.8.html
- Netfilter nftables man page for counters and `nft monitor trace`: https://www.netfilter.org/projects/nftables/manpage.html
- Docker Engine packet filtering and firewalls documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Engine with iptables documentation, including `DOCKER-USER`: https://docs.docker.com/engine/network/firewall-iptables/
- Ubuntu Server PostgreSQL documentation for `/etc/postgresql/<version>/main`, `listen_addresses`, and `pg_hba.conf`: https://documentation.ubuntu.com/server/how-to/databases/install-postgresql/
- PostgreSQL current documentation for `pg_hba.conf` and remote TCP/IP requirements: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- Apache HTTP Server 2.4 binding documentation for the `Listen` directive: https://httpd.apache.org/docs/current/bind.html
- RFC 9293, Transmission Control Protocol, for SYN/RST and connection refused behavior: https://www.rfc-editor.org/rfc/rfc9293

## Issues Found
- The post implied local tests bypass all firewalls and that local failures are not firewall-related. Changed this to say local tests bypass external network firewalls and that local failures usually point to the local service path, because host firewall rules can still affect local traffic in unusual configurations.
- The connection behavior section treated `Connection refused` as proof that the firewall was not involved. Changed this to include active firewall rejects, because TCP reset or reject behavior can also surface as an immediate refusal.
- The nftables counter example used `nft add rule`, which can place the counter after rules that already accept or drop traffic. Changed it to `nft insert rule` so the temporary counter is evaluated before later rules in the chain.
- The tcpdump interpretation said a SYN with no SYN-ACK means the firewall is dropping packets. Softened this to note that something is dropping the packet or preventing the response, with host firewall DROP as a common cause.
- The iptables TRACE example watched `OUTPUT --dport 80`, which does not match normal server replies for an inbound connection to port 80. Changed it to `OUTPUT --sport 80`.
- The iptables TRACE viewing instructions only mentioned kernel logs. Added `xtables-monitor --trace` for iptables-nft systems, which is the default backend on current Ubuntu releases, while keeping kernel log guidance for iptables-legacy.
- The PostgreSQL examples hard-coded version `14`. Changed them to `/etc/postgresql/*/main/...` to match Ubuntu's versioned PostgreSQL configuration layout without implying one current version.
- The Apache example searched for the obsolete `BindAddress` directive. Changed it to search for `Listen`, which is the Apache HTTP Server 2.4 directive for binding addresses and ports.
- Several examples used `grep ":$PORT"` or `grep ':80'` against `ss` output, which can match unintended ports such as `8080` when checking `80`. Changed them to use `ss`'s `sport = :PORT` filter for exact matching, and updated the diagnostic script to test that the filtered output is non-empty.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Some examples remain intentionally generic and may need adaptation for local interface names, PostgreSQL versions, Docker firewall backend choice, or distributions that do not use Ubuntu's package layout.
