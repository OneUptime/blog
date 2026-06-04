# Validation Summary: How to Run TeamSpeak Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- TeamSpeak 3 Server
- ServerQuery
- MariaDB
- SQLite
- Linux shell commands

## Sources Consulted
- Docker Official Image documentation for TeamSpeak: https://hub.docker.com/_/teamspeak
- TeamSpeak support article for TeamSpeak 3 server ports: https://support.teamspeak.com/hc/en-us/articles/360002712257-Which-ports-does-the-TeamSpeak-3-server-use
- TeamSpeak Server 3.13.x announcement and changelog: https://community.teamspeak.com/t/teamspeak-server-3-13-x/13301
- TeamSpeak support article for permissions concepts: https://support.teamspeak.com/hc/en-us/articles/360002757557-Where-are-the-permissions
- TeamSpeak support article for changing or resetting the serveradmin ServerQuery password: https://support.teamspeak.com/hc/en-us/articles/360002712898-How-do-I-change-or-reset-the-password-of-the-serveradmin-Server-Query-account

## Issues Found
- The quick-start `docker run` command exposed port `10022/tcp` for SSH ServerQuery but did not enable the SSH query protocol. Added `TS3SERVER_QUERY_PROTOCOLS=raw,ssh` to match the exposed ports and the later Compose example.
- The server group permission example used `permid=140` for `i_channel_needed_modify_power`. Permission IDs are version-sensitive and `140` does not reliably identify that permission. Changed the example to use `permsid=i_channel_needed_modify_power`.
- The health check claimed to verify that the UDP voice port was accepting connections. UDP does not establish connections in the TCP sense, and a basic `nc -zu` probe is not a reliable service health check. Changed the example to check the raw ServerQuery TCP port.
- The security section described `query_ip_allowlist.txt` as an access restriction where only listed IPs can connect. For current TeamSpeak 3 server behavior, the allowlist is for trusted clients that are exempt from ServerQuery flood protection; actual access restriction should be done with Docker networking or firewall rules. Corrected the wording and comments.
- The security section referred to a "default" ServerQuery admin password. The Docker image generates initial ServerQuery credentials on first boot. Changed the wording to "generated" password.

## Review Notes
The post is technically relevant and the Docker image, port mappings, MariaDB environment variables, volume path, and core ServerQuery workflow align with the official TeamSpeak Docker image documentation. The Compose examples use `version: "3.8"`, which is still accepted by Docker Compose, though modern Compose no longer requires the top-level `version` field.
