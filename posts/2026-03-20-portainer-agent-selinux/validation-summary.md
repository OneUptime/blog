# Validation Summary: How to Fix Agent Issues When SELinux Is Enabled - A Practical Guide

## Status
validated

## Post Type
Guide / troubleshooting tutorial

## Technologies Covered
- Portainer Agent
- Docker Engine
- Docker Compose
- SELinux
- RHEL / CentOS / Fedora container policy tooling
- SELinux audit and policy tools (`ausearch`, `aureport`, `audit2allow`, `semanage`, `restorecon`)

## Sources Consulted
- Portainer Documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation: Updating on Podman - https://docs.portainer.io/start/upgrade/podman
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Red Hat Enterprise Linux 9 Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/using_selinux/Red_Hat_Enterprise_Linux-9-Using_SELinux-en-US.pdf
- Red Hat Enterprise Linux 8 Considerations in adopting RHEL 8 - https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/8/pdf/considerations_in_adopting_rhel_8/Red_Hat_Enterprise_Linux-8-Considerations_in_adopting_RHEL_8-en-US.pdf
- Red Hat Enterprise Linux 10 Building, running, and managing containers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/pdf/building_running_and_managing_containers/Red_Hat_Enterprise_Linux-10-Building_running_and_managing_containers-en-US.pdf
- `container_selinux` man page - https://www.mankier.com/8/container_selinux

## Issues Found
- The post treated `:z` / `:Z` relabeling and `security_opt: label:disable` as the main SELinux fix for Portainer Agent. I changed the deployment examples to use `--privileged` / `privileged: true`, because Portainer's current Agent documentation explicitly requires privileged deployment on SELinux-enabled Linux hosts.
- The examples used `portainer/agent:latest`. I changed them to `portainer/agent:lts` and added a note to match the Agent tag to the Portainer Server release track/version, because Portainer documents version alignment instead of using `latest` generically.
- The volume-path remediation used `chcon -Rt svirt_sandbox_file_t /var/lib/docker/volumes/`, which is not the preferred fix for Docker-managed storage and can overwrite expected labels. I replaced it with `restorecon` for restoring default labels and a `semanage fcontext -a -e /var/lib/docker /srv/data/docker` example for non-standard Docker data roots.
- The network-port section suggested `http_port_t` for the Agent's published port. I removed that and kept `container_port_t`, scoped only to cases where the audit log shows an actual SELinux bind denial on port `9001`.
- The boolean section included unrelated or incorrect booleans (`container_connect_any`, `domain_kernel_load_modules`) and overgeneralized guidance (`container_use_cephfs`). I narrowed it to `container_manage_cgroup` only when AVC denials specifically reference cgroup access.
- The data-volume section used `chcon -Rt container_file_t` on `portainer_agent_data`, which is not the default Docker label-restoration approach and only applies to Edge Agent-style data volumes. I changed it to a conditional context check plus `restorecon`.
- The audit-log commands were too narrow or misleading (`grep portainer`, `ausearch -c docker --raw | grep DENIED`). I replaced them with Red Hat-recommended AVC searches and broader denial inspection commands.
- The final heading said "Dockerfile Label" while the content was a Docker Compose example. I corrected the heading to match the actual configuration being shown.

## Review Notes
- Portainer currently documents Docker Standalone Agent as a legacy option and recommends Edge Agent for most new deployments. I did not change the scope of the article because the standalone Agent workflow is still technically valid and the post is specifically about fixing it under SELinux.
- SELinux port labeling for `9001` is conditional. Many deployments will not need it; the determining factor is whether AVC denials explicitly show a blocked bind on that port.
- `container_manage_cgroup` is not a general Portainer requirement. It is only relevant when the denial output specifically points to cgroup access.
