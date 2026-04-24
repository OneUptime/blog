# Validation Summary: How to Fix Portainer Firewall Issues After Synology DSM Updates

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Synology DSM firewall
- Synology Task Scheduler
- Synology SSH access
- Portainer CE
- Docker Engine networking and published ports
- Docker CLI (`docker ps`, `docker logs`, `docker port`, `docker network`)

## Sources Consulted
- Portainer CE install on Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer troubleshooting for HTTP vs HTTPS access: https://docs.portainer.io/2.33-lts/faqs/troubleshooting/access-and-authentication/client-sent-an-http-request-to-an-https-server
- Docker port publishing: https://docs.docker.com/engine/network/port-publishing/
- Docker with iptables / DOCKER-USER guidance: https://docs.docker.com/engine/network/firewall-iptables/
- Docker CLI reference: `docker container ls` / `docker ps`: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: `docker container logs` / `docker logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference: `docker container port` / `docker port`: https://docs.docker.com/reference/cli/docker/container/port/
- Docker CLI reference: `docker network ls`: https://docs.docker.com/reference/cli/docker/network/ls/
- Synology DSM firewall help: https://kb.synology.com/en-global/DSM/help/DSM/AdminCenter/connection_security_firewall
- Synology firewall tutorial: https://kb.synology.com/en-au/DSM/tutorial/How_do_I_configure_firewall_in_DSM
- Synology Task Scheduler help: https://kb.synology.com/en-my/DSM/help/DSM/AdminCenter/system_taskscheduler
- Synology Task Scheduler scripting tips: https://kb.synology.com/en-uk/DSM/tutorial/common_mistake_in_task_scheduler_script
- Synology Terminal / SSH help: https://kb.synology.com/api/v1/findHelpFile/dsm/dsm/6.0/enu/6.0-7321/synology_armada370_ds115j/100/AdminCenter/system_terminal.html

## Issues Found
1. **Portainer port guidance was outdated**: The post treated port `9000` as the main Portainer web port. Current Portainer documentation uses `9443` for HTTPS by default and only exposes `9000` for legacy HTTP if explicitly enabled. I updated the diagnosis, firewall, and verification steps to use `9443` first and mention `9000` only as an optional legacy port.

2. **The local connectivity checks used the wrong protocol**: The original `curl http://localhost:9000` and the generic `for port in 9000 9443 3000 8080` loop assumed HTTP for every port. That is incorrect for Portainer's default `9443` HTTPS listener. I replaced these checks with HTTPS-aware `curl -k` commands and Portainer-specific port inspection.

3. **The SSH example used an overly specific login account**: Synology documents SSH access for accounts in the administrators group, not a hard-coded `admin` login. I changed the example to `ssh <administrator-account>@<synology-ip>`.

4. **Firewall rule behavior was oversimplified**: The post originally described rule order only as top-to-bottom. Synology's documentation states that rules in `All interfaces` are evaluated before rules in a specific interface, and then the first match wins within each table. I corrected the explanation and updated the troubleshooting steps accordingly.

5. **The firewall profile UI wording was inaccurate**: The post said to click `Create profile`, but Synology's firewall help documents profile creation via the `+` control in the Firewall Profile section. I corrected that instruction.

6. **The service restart command was not adequately supported**: The original article used `sudo synoservicectl --restart pkgctl-ContainerManager`, which I could not validate from current official Synology end-user documentation. I removed that shell command and kept the GUI restart steps through Package Center.

7. **The `iptables` workaround was technically wrong and unsafe**: The script inserted `INPUT` rules for container ports and a broad `iptables -I INPUT -s 172.17.0.0/16 -j ACCEPT` rule. Docker's official firewall documentation explains that published-port traffic is handled through Docker-managed rules and that custom filtering should use `DOCKER-USER`, not ad hoc `INPUT` exceptions. I replaced this section with a safe post-startup verification task instead of an incorrect firewall rewrite.

8. **The Docker network troubleshooting section used weaker checks than necessary**: The original section assumed a missing `docker0` interface and paired that with the same unsupported restart command. I changed the guidance to use Docker-native checks (`docker network ls` and `docker network inspect bridge`) and kept the restart advice in the DSM UI.

9. **Some claims were stronger than the official sources support**: Synology's official docs explain firewall profiles, rule priority, and Task Scheduler behavior, but they do not appear to explicitly document DSM updates resetting rules. I softened the wording in the introduction and problem statement so the post stays technically accurate without overclaiming.

## Review Notes
- Portainer CE has used HTTPS on port `9443` by default since CE 2.9; HTTP on `9000` is legacy compatibility behavior, not the current default.
- Docker's documentation explicitly advises against modifying Docker-created firewall rules directly; when additional filtering is needed, `DOCKER-USER` is the supported insertion point.
- Synology Task Scheduler UI wording can vary slightly by DSM release, so the post now uses the officially documented `Triggered Task > User-defined script` flow and refers to the startup event generically.
