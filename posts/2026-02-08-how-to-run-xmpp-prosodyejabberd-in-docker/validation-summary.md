# Validation Summary: How to Run XMPP (Prosody/ejabberd) in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- XMPP
- Prosody
- ejabberd
- TLS certificates
- XMPP client-to-server and server-to-server networking

## Sources Consulted
- Prosody Docker image documentation: https://github.com/prosody/prosody-docker
- Prosody modules documentation: https://prosody.im/doc/modules
- Prosody HTTP server documentation: https://prosody.im/doc/http
- Prosody HTTP file sharing documentation: https://prosody.im/doc/modules/mod_http_file_share
- Prosody certificates documentation: https://prosody.im/doc/certificates
- Prosody account management documentation: https://prosody.im/doc/creating_accounts
- Prosody mod_listusers community module note: https://modules.prosody.im/mod_listusers
- ejabberd Docker ECS image documentation: https://github.com/processone/docker-ejabberd/tree/master/ecs
- ejabberd Docker Hub page: https://hub.docker.com/r/ejabberd/ecs/
- ejabberd authentication documentation: https://docs.ejabberd.im/admin/configuration/authentication/
- ejabberd listen modules documentation: https://docs.ejabberd.im/archive/25.03/listen/
- ejabberd API simple configuration documentation: https://docs.ejabberd.im/developer/ejabberd-api/simple-configuration/
- ejabberd example configuration: https://github.com/processone/ejabberd/blob/master/ejabberd.yml.example

## Issues Found
- The Prosody examples used the stale `prosody/prosody` image and an unsupported `ALLOW_REGISTRATION` environment variable. Updated the examples to use `prosodyim/prosody`, `PROSODY_VIRTUAL_HOSTS`, and documented account bootstrap variables.
- The Prosody Compose example mounted extra modules to `/usr/lib/prosody/modules`, but the image documents `/etc/prosody/modules` as the plugin path. Updated the volume target.
- The Prosody module list enabled deprecated `vcard4`. Replaced it with `vcard` while keeping `pep` enabled.
- The Prosody user listing command used obsolete community module command `prosodyctl mod_listusers`. Replaced it with the current `prosodyctl shell user list` command and enabled `admin_shell`.
- The Prosody port comments described HTTP admin interfaces on 5280/5281. Prosody uses those for HTTP/HTTPS services such as BOSH and WebSocket, so the comments were corrected.
- The ejabberd ECS Compose example used `/home/ejabberd/...` paths for config, logs, and database storage. Updated them to the documented `/opt/ejabberd/...` paths.
- The ejabberd config exposed MQTT port 1883 in Docker but did not configure the MQTT listener or module. Added the matching `mod_mqtt` listener and module entry.
- The ejabberd HTTP upload module was configured without the matching `/upload` request handler and upload URL path. Added `/upload: mod_http_upload` and changed `put_url` to include `/upload`.
- The ejabberd c2s listener referenced `c2s_shaper` without defining the corresponding shaper rules in the snippet. Removed the unresolved shaper reference.
- The TLS example wrote certificates into a directory that might not exist and claimed Prosody expects a single combined PEM file. Added `mkdir -p certs`, used Prosody's documented `HOSTNAME.crt` and `HOSTNAME.key` naming, and removed the incorrect combined PEM instruction.
- The ejabberd certificate mount path used `/home/ejabberd/certs`. Updated it to `/opt/ejabberd/conf/certs`.

## Review Notes
The examples still use `latest` image tags and Compose `version: "3.8"`. They remain usable, but production deployments should pin image versions and may omit the Compose `version` field with current Docker Compose.
