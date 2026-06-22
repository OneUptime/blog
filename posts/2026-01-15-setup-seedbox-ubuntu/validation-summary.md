# Validation Summary: How to Set Up a Seedbox on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- qBittorrent-nox and qBittorrent Web API
- Deluge daemon and Deluge Web UI
- rTorrent and ruTorrent
- Nginx and PHP-FPM
- WireGuard
- UFW
- rsync daemon
- incron
- OpenSSH SFTP
- vsftpd / FTPS
- autodl-irssi
- vnStat
- fail2ban
- unattended-upgrades
- systemd

## Sources Consulted
- qBittorrent wiki, WebUI and Web API documentation: https://github.com/qbittorrent/qBittorrent/wiki
- qBittorrent Web API documentation: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-4.1%29
- Ubuntu manpage for wg-quick: https://manpages.ubuntu.com/manpages/jammy/man8/wg-quick.8.html
- Ubuntu manpage for rsyncd.conf: https://manpages.ubuntu.com/manpages/jammy/man5/rsyncd.conf.5.html
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Ubuntu manpage for sshd_config: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- Ubuntu manpage for vsftpd.conf: https://manpages.ubuntu.com/manpages/jammy/man5/vsftpd.conf.5.html
- Ubuntu package archive for php-geoip: https://archive.ubuntu.com/ubuntu/pool/universe/p/php-geoip/
- Local command help/manpage checks for ufw, rsync systemd unit behavior, systemd service syntax, and OpenSSH configuration parsing where available.

## Issues Found
- qBittorrent service user setup used `--no-create-home` while the service needed a writable profile/configuration location. Changed the user setup to use `/var/lib/qbittorrent`, set ownership, and added `--profile=/var/lib/qbittorrent` to the service.
- qBittorrent default Web UI credentials were outdated for current releases. Replaced the fixed `admin` / `adminadmin` claim with guidance to retrieve the generated temporary password from the systemd journal.
- The Nginx ruTorrent examples used `/var/run/php/php-fpm.sock`, which is not the default versioned PHP-FPM socket path on supported Ubuntu releases. Added detection of the installed `/run/php/php*-fpm.sock` path and used it in both Nginx snippets.
- The rTorrent system user setup did not explicitly set the home directory used for `.rtorrent.rc`. Updated the `adduser` command to use `/home/rtorrent`.
- The WireGuard example used a custom routing table and source rule while later claiming `curl https://api.ipify.org` should show the VPN IP. Removed the inconsistent custom table/rule lines so the full-tunnel `AllowedIPs = 0.0.0.0/0, ::/0` behavior matches the test.
- The firewall section did not allow the rsync daemon port even though the rsync section configured daemon mode. Added UFW port 873.
- The rsync section mixed daemon configuration with an SSH-based rsync client command and referenced a non-existent `/home/downloads/complete/` path. Updated the client script to use the configured rsync daemon module and password file, and enabled the rsync daemon service.
- The rsync daemon ran as `nobody:nogroup`, which would not reliably read the service-owned download directories created with restrictive umasks. Changed the read-only module to run as root so it can read completed downloads.
- The incron example referenced `/usr/local/bin/notify-complete.sh` without creating it and installed the rule for the current user despite allowing `rtorrent`. Added a minimal completion hook and installed the incrontab for `rtorrent`.
- The vsftpd TLS example explicitly enabled TLS 1.0 via `ssl_tlsv1=YES`. Changed it to `ssl_tlsv1=NO` to avoid enabling the obsolete protocol version.
- The monitoring script used `jq` without installing it. Added `jq` to the monitoring package install command.
- Troubleshooting commands used `nslookup` and `iftop` without installing their packages. Added `dnsutils` and `iftop` to the initial utility installation.
- qBittorrent Web API scripts called authenticated endpoints without logging in. Added Web API login and cookie handling to the bandwidth manager and status dashboard examples.

## Review Notes
The guide is technically relevant and salvageable as a practical seedbox setup tutorial. Some areas remain intentionally provider- or environment-specific, such as VPN provider keys, actual torrent client bind-interface settings, PHP package availability across Ubuntu releases, tracker-specific autodl-irssi settings, and production choices around exposing web UIs or rsync over the network. Those are acceptable caveats for this guide, but future revisions could add reverse proxy TLS examples and client-specific port/bind configuration steps.
