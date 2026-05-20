# Validation Summary: How to Configure Darkstat for Network Statistics on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Darkstat
- systemd service management
- OpenSSH local port forwarding
- Nginx reverse proxy
- Certbot
- UFW
- iproute2

## Sources Consulted
- Ubuntu Manpage Repository: darkstat(8), https://manpages.ubuntu.com/manpages/questing/man8/darkstat.8.html
- Ubuntu darkstat package metadata for Noble: `apt-cache show darkstat`
- Ubuntu darkstat package files from `darkstat_3.0.719-1.1build2_amd64.deb`: `/etc/darkstat/init.cfg`, `/etc/init.d/darkstat`, and `/usr/share/doc/darkstat/README.Debian`
- Debian Sources: darkstat HTTP routing in `http.c`, https://sources.debian.org/data/main/d/darkstat/3.0.718-2/http.c
- Debian Sources: darkstat hosts page handling in `hosts_db.c`, https://sources.debian.org/data/main/d/darkstat/3.0.718-2/hosts_db.c
- Debian Sources: darkstat graph intervals in `graph_db.c`, https://sources.debian.org/data/main/d/darkstat/3.0.718-2/graph_db.c
- Debian Sources: darkstat local network parsing in `acct.c`, https://sources.debian.org/data/main/d/darkstat/3.0.718-2/acct.c
- Local OpenSSH man page for `ssh -L` syntax
- Local iproute2 man page for `ip route get`
- Local UFW help output for `allow` and `status numbered`
- Local systemd help output for `enable`, `start`, `status`, and `restart`

## Issues Found
- The sample `DIR="-d /var/lib/darkstat"` was incorrect for Ubuntu's `/etc/darkstat/init.cfg`. The Debian/Ubuntu init script expects `DIR` to be a plain directory path and passes it to Darkstat as `--chroot $DIR`. Changed it to `DIR="/var/lib/darkstat"`.
- The sample used `BINDADDR`, but the Ubuntu package init script reads `BINDIP`. Changed it to `BINDIP="-b 127.0.0.1"`.
- The sample used a standalone `CHROOT` variable, which the Ubuntu init script does not read. Replaced it with `OPTIONS="--syslog"` and updated the explanation to describe how `DIR` controls the packaged chroot/database location.
- The default-route interface command assumed the interface name was always field 5. That fails for route output without a gateway. Replaced it with an `awk` loop that extracts the token after `dev`.
- The Graphs section referred only to hourly and daily views and said data was stored via `-d`. Darkstat's graph database includes second, minute, hour, and day views, and the Ubuntu package uses `DIR`, not `-d`. Updated the wording.
- The Dump Statistics section used `/hosts.html?full=1` and described it as raw or machine-readable output. Current Darkstat serves the hosts area under `/hosts/`, and `full` is a query parameter on that page. Updated the URL to `/hosts/?full=yes` and described it as the full hosts HTML table.
- The verbosity example used `EXTRA="--verbose"`, but the Ubuntu init script reads `OPTIONS`. Changed it to `OPTIONS="--verbose"`.
- The persistence section referred to `-d` and periodic database updates. The packaged init script uses `--import darkstat.db --export darkstat.db` relative to `DIR`, and Darkstat exports on clean shutdown or signal. Updated the wording to clean daemon restarts.

## Review Notes
The post is technically relevant and generally accurate after the corrections. Future improvements could mention that exposing the Nginx reverse proxy on plain HTTP should only be temporary before Certbot enables HTTPS.
