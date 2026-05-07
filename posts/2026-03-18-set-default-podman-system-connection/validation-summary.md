# Validation Summary: How to Set the Default Podman System Connection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman remote connections
- Podman CLI
- Bash
- jq

## Sources Consulted
- Podman system connection documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- Podman system connection default documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-default.1.html
- Podman system connection list documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-list.1.html
- Podman system connection add documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman main command documentation: https://docs.podman.io/en/stable/markdown/podman.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman version documentation: https://docs.podman.io/en/latest/markdown/podman-version.1.html

## Issues Found
- The post originally implied that setting a default system connection makes every plain `podman` command target that connection. Official Podman documentation scopes `--connection` and configured system connections to remote Podman use, and the Linux CLI defaults to local operation unless remote mode is enabled or implied by options/environment variables. I updated the wording to say "remote Podman commands" and added a note that Linux users should use `--remote` when they want commands to use the configured system connection.
- Verification commands such as `podman info` and `podman version` were used to test the selected default connection, but on Linux these may query the local engine instead of the configured remote connection. I changed those validation examples to `podman --remote info` and `podman --remote version` where the intent is to test the default system connection.
- The reset section suggested removing all remote connections to fall back to local. That is too broad and can delete useful connection definitions. I changed the example to unset remote environment overrides and omit `--remote` for local Linux Podman usage.

## Review Notes
The `CONTAINER_HOST` examples are accurate because Podman documents that `CONTAINER_HOST` sets the default `--url` value and enables remote mode. The `--connection` examples are also accurate because Podman documents `--connection` as a global option for remote Podman and states that it switches remote mode on.
