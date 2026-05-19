# Validation Summary: How to Block Specific Countries with iptables on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- iptables
- ipset
- MaxMind GeoLite2 and geoipupdate
- systemd services
- netfilter-persistent hooks
- cron weekly jobs
- shell scripting

## Sources Consulted
- ipset official man page: https://ipset.netfilter.org/ipset.man.html
- iptables-extensions man page for set, limit, LOG, and NFLOG targets: https://man.he.net/man8/iptables-extensions
- Local iptables and iptables-restore man/help output for command syntax
- systemd.service official documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- MaxMind geoipupdate official repository and installation documentation: https://github.com/maxmind/geoipupdate
- MaxMind GeoIP Update program documentation: https://maxmind.github.io/geoipupdate/doc/geoipupdate.html
- MaxMind database update guidance: https://support.maxmind.com/knowledge-base/articles/download-and-update-maxmind-databases
- Debian netfilter-persistent man page: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html
- Local cron man page for /etc/cron.weekly and run-parts behavior
- ipdeny aggregated zone URL checks for HTTP and HTTPS availability

## Issues Found
- The logging example inserted a second DROP rule at the top of INPUT after the LOG rule. Because LOG is non-terminating and iptables `-I` defaults to position 1, running the example as written could place DROP before LOG and prevent logging. Changed the logging commands to insert LOG at position 1 and DROP at position 2.
- The update script destroyed each ipset before removing the iptables rule that referenced it. `ipset destroy` fails for sets still in use, so the update could leave stale entries in place. Moved the iptables rule deletion before `ipset destroy`.
- The MaxMind installation example omitted `apt update` after adding the MaxMind PPA. Added the update step to match MaxMind's current Ubuntu PPA instructions.
- The post claimed GeoIP databases are stored specifically in `/var/lib/GeoIP/`. Current geoipupdate database paths depend on package/build configuration and can commonly be `/usr/share/GeoIP` or another configured directory. Replaced the fixed `ls /var/lib/GeoIP/` command with `sudo geoipupdate -v` to verify the active configuration.
- The manual `sudo ipset save > /etc/iptables/ipsets.conf` command would perform shell redirection as the unprivileged user. Changed it to run the redirection inside a root shell, and changed restore to use ipset's documented `-file` option.

## Review Notes
The post is technically relevant and the overall approach is sound for IPv4 iptables/ipset-based GeoIP blocking. Future improvements could mention IPv6 country ranges and nftables-native sets for systems that have moved away from iptables workflows, but those are scope expansions rather than correctness fixes.
