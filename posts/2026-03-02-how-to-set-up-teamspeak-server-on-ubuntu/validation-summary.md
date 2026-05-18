# Validation Summary: How to Set Up TeamSpeak Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- TeamSpeak 3 Server (version 3.13.7)
- Ubuntu 22.04 / 24.04
- systemd (service unit configuration)
- UFW (Uncomplicated Firewall)
- SQLite (default TS3 database backend)
- TeamSpeak ServerQuery interface

## Sources Consulted
- TeamSpeak official downloads page: https://teamspeak.com/en/downloads/
- TeamSpeak server quickstart (amd64): https://github.com/Dh0mp5eur/TeamSpeak3-Server/blob/master/amd64/opt/teamspeak3-server_linux-amd64/doc/server_quickstart.txt
- TeamSpeak download CDN forum thread (URL migration): https://forum.teamspeak.com/threads/139600-Question-about-the-new-download-URL-files-teamspeak-services-com
- netcup community tutorial: https://github.com/netcup-community/community-tutorials/blob/main/community-tutorials/install-teamspeak-server/01-en.md
- TeamSpeak community / forum threads on systemd integration
- Live curl verification of the download URL (HTTP 200)

## Issues Found
- **Incorrect download CDN hostname.** The post originally referenced `https://files.teamspeak-systems.com/releases/server/3.13.7/teamspeak3-server_linux_amd64-3.13.7.tar.bz2`. The correct, currently active TeamSpeak CDN hostname is `files.teamspeak-services.com`. I verified via `curl -I` that the corrected URL returns HTTP 200 (10 MB tarball) while the original hostname does not serve the file. Fixed in the README.

## Review Notes
- The TeamSpeak 3 server binary inside the `teamspeak3-server_linux_amd64/` archive is indeed named `ts3server_linux_amd64` (not `ts3server`), so the systemd `ExecStart` path is correct as written. The binary defaults to foreground mode (no `daemon=1`), so it is compatible with the default systemd `Type=simple` used in the unit file.
- The `ts3server.ini` keys (`default_voice_port`, `voice_ip`, `query_port`, `query_ip`, `filetransfer_port`, `dbplugin=ts3db_sqlite3`, etc.) all match the documented TS3 server configuration schema.
- Default ports listed (UDP 9987 voice, TCP 10011 ServerQuery, TCP 30033 file transfer) are correct.
- Minor stylistic inconsistency (not a technical error): the UFW section opens TCP 10011 from a specific IP, while the `ts3server.ini` example binds `query_ip=127.0.0.1`. With the loopback bind the firewall rule is moot; the post does note that the ServerQuery rule can be skipped, so the reader has enough context to reconcile this.
- TeamSpeak 3 Server 3.13.7 remains the current upstream release; no version-related deprecations to flag at the time of review.
