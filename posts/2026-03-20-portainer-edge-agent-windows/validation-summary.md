# Validation Summary: How to Run Portainer Edge Agent on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Docker Desktop
- Docker Engine / Windows Containers
- Docker Compose
- PowerShell
- NSSM
- Windows Firewall

## Sources Consulted
- Portainer Documentation, "Install Edge Agent Standard on Docker Standalone" - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Documentation, "Install Edge Agent Async on Docker Standalone" - https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer Documentation, "The Portainer Edge Agent" - https://docs.portainer.io/advanced/edge-agent
- Portainer Documentation, "Updating the Edge Agent" - https://docs.portainer.io/start/upgrade/edge
- Portainer source, Edge deployment command generator - https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts
- Docker Docs, "General FAQs for Desktop" - https://docs.docker.com/desktop/troubleshoot-and-support/faqs/general/
- Docker Docs, "Understand permission requirements for Windows" - https://docs.docker.com/desktop/setup/install/windows-permission-requirements/
- Docker Docs, "Version and name top-level elements" - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "docker container logs" - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, "Change your Docker Desktop settings" - https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Microsoft Learn, "about_Pipeline_Chain_Operators" - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipeline_chain_operators?view=powershell-7.5

## Issues Found
- The Linux-container `docker run` example mixed Linux socket mounts with a Windows host bind mount and omitted the `/:/host` and `/data` mounts Portainer currently generates. I replaced it with the current Portainer standalone Linux-container pattern.
- The Windows Containers example used Unix-style named-pipe mounting and omitted both the Docker volumes bind mount and persistent data volume. I replaced it with Portainer's current Windows standalone command using `--mount type=npipe`, `C:\ProgramData\docker\volumes`, and `C:\data`.
- The Compose example included an obsolete top-level `version`, missed the `/:/host` and `portainer_agent_data` mounts, and set `EDGE_PING_INTERVAL`, which is not a current Edge Agent environment variable. I removed the obsolete or invalid parts and aligned the file with the current standalone deployment pattern.
- The NSSM startup script used `||`, which is only available in PowerShell 7+. Because the post allows PowerShell 5.1, I rewrote the script to use a PowerShell-compatible `if` check and updated it to the current Windows mount syntax.
- The async mode example used `EDGE_PING_INTERVAL`, `EDGE_CMD_INTERVAL`, and `EDGE_SNAPSHOT_INTERVAL`, but current Portainer async deployments use `EDGE_ASYNC=1` and configure intervals in Portainer itself. I removed the invalid environment variables and corrected the explanation.
- The verification section used the wrong `docker logs` argument order and showed an incorrect polling path example. I corrected the command and generalized the expected output.
- The troubleshooting section told readers to switch to `docker context use default`, which is not reliable guidance for current Docker Desktop Linux-container mode. I changed this to tell readers to switch to the Docker Desktop context shown by `docker context ls`.
- The troubleshooting section claimed the `EDGE_KEY` can expire. I corrected this to focus on matching the key and environment ID to the Portainer environment.
- The prerequisites and setup flow implied that Business Edition was generally required and omitted the BE-only tunnel server address field. I corrected the licensing guidance and added the BE-only field.

## Review Notes
- The post now uses `YOUR_PORTAINER_VERSION` as a placeholder because Portainer recommends matching the agent image tag to the Portainer Server version.
- If the Portainer Server was started with a custom `AGENT_SECRET`, the same `AGENT_SECRET` must also be supplied to the Edge Agent. The post still assumes the default server configuration.
- The Windows Service section is appropriate for Windows Server or Windows Containers deployments where Docker starts automatically. It is not a general Docker Desktop WSL2 startup workaround.
