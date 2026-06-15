# Validation Summary: How to Fix Docker 'Port Already Allocated' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Docker Desktop
- Linux networking tools (`lsof`, `netstat`, `ss`)
- macOS networking tools (`lsof`)
- Windows PowerShell and `netsh`

## Sources Consulted
- Docker Docs: Running containers, port publishing with `-p` and `-P` - https://docs.docker.com/engine/containers/run/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: `docker container ls` / `docker ps` filters, including `publish` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs: Compose file services `ports` syntax - https://docs.docker.com/reference/compose-file/services/#ports
- Docker Docs: Compose `version` top-level element is obsolete - https://docs.docker.com/reference/compose-file/version-and-name/
- Microsoft Learn: `netsh interface` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Hyper-V troubleshooting and port reservation conflict guidance - https://learn.microsoft.com/en-us/troubleshoot/windows-server/virtualization/hyper-v-installation-configuration-operational-failure
- Local Docker CLI help for `docker`, `docker ps`, `docker run`, `docker container prune`, and `docker port`
- Local command help for `ss`, `netstat`, and `lsof`

## Issues Found
- The post said the conflict could come from a "zombie process." A zombie process cannot keep a listening socket open in the usual sense, so this was changed to "lingering process."
- The stale-container explanation implied stopped containers can be the direct port holder. Stopped containers do not bind host ports, so this was narrowed to running containers or stale Docker Desktop port bindings.
- The `docker ps --filter "publish=8080"` comment was clarified to say it finds running containers by published port.
- The Compose example used `version: '3.8'`, which current Docker Compose treats as obsolete and only informational. It was removed.
- The Windows reserved-port remediation used `netsh int ipv4 add excludedportrange`, which reserves/excludes a port rather than making it available. It was replaced with guidance to choose a different port, or delete an intentionally created exclusion with `netsh int ipv4 delete excludedportrange`.

## Review Notes
The remaining commands and configuration snippets are technically valid. The destructive "nuclear option" commands are accurate but intentionally broad; future editorial review may want to add a warning that they stop and remove all containers on the host.
