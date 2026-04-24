# Validation Summary: How to Install Portainer on Synology NAS via Task Scheduler

## Status
validated

## Post Type
Guide

## Technologies Covered
- Synology DSM 7.2+
- Synology Task Scheduler
- Synology Container Manager
- Portainer Community Edition
- Docker CLI
- Bash

## Sources Consulted
- Synology Knowledge Center: Task Scheduler https://kb.synology.com/en-my/DSM/help/DSM/AdminCenter/system_taskscheduler?version=7
- Synology Knowledge Center: Tips for creating tasks and writing scripts in Task Scheduler https://kb.synology.com/en-uk/DSM/tutorial/common_mistake_in_task_scheduler_script
- Synology Knowledge Center: Overview | Container Manager https://kb.synology.com/en-us/DSM/help/ContainerManager/docker_overview?version=7
- Synology news: DSM 7.2 release announcement (Container Manager formerly Docker) https://www.synology.com/en-us/company/news/article/DSM72
- Portainer documentation: Install Portainer CE with Docker on Linux https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer documentation: Updating on Docker Standalone https://docs.portainer.io/start/upgrade/docker
- Docker CLI reference: `docker inspect` https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: `docker image inspect` https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker CLI reference: `docker image prune` https://docs.docker.com/reference/cli/docker/image/prune/

## Issues Found
- The post treated Container Manager as a generic DSM 7 package. I corrected the description and prerequisites to DSM 7.2+, because Synology introduced Container Manager as the Docker successor in DSM 7.2.
- Both scripts used `portainer/portainer-ce:latest`. I changed them to `portainer/portainer-ce:lts` to match current Portainer installation and update guidance.
- The boot-time install script relied on a fixed `sleep 10`, and the DSM update section suggested a task triggered by Container Manager service startup without official documentation to support that workflow. I replaced this with a Docker-daemon availability check in the boot-up task.
- The logging section pointed readers to `Send run details by email` while describing file-based logging. I updated it to Synology's documented `Settings > Save output results` flow and added directory creation before shell redirection so the log-file example is runnable.
- The verification step only directed readers to `http://<synology-ip>:9000`. I updated it to prefer `https://<synology-ip>:9443` and kept `9000` as optional HTTP access, which matches current Portainer behavior.

## Review Notes
- Docker was not installed in the local review workspace on 2026-04-24, so command syntax and behavior were validated against official Docker, Portainer, and Synology documentation rather than local CLI output.
- The post still exposes both `9443` and `9000`. Portainer's current docs treat `9443` as the default secure UI port and `9000` as optional legacy HTTP access, so keeping both is technically valid but `9443` should remain the primary access path.
