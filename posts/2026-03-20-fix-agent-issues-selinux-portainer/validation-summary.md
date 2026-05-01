# Validation Summary: How to Fix Agent Issues When SELinux Is Enabled

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer Agent
- Docker
- SELinux
- RHEL / CentOS / Fedora
- Linux audit and policy tools (`ausearch`, `audit2allow`, `semodule`, `sealert`, `setenforce`, `restorecon`)

## Sources Consulted
- Portainer Documentation, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation, Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Docker Docs, Bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs, `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs, Running containers: https://docs.docker.com/engine/containers/run/
- Red Hat Documentation, Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- `container_selinux` man page: https://www.mankier.com/8/container_selinux
- `ausearch` man page: https://www.mankier.com/8/ausearch
- `audit2allow` man page: https://www.mankier.com/1/audit2allow
- `semodule` man page: https://www.mankier.com/8/semodule
- `setenforce` man page: https://www.mankier.com/8/setenforce
- `sealert` man page: https://www.mankier.com/8/sealert

## Issues Found
- The post presented `:z` / `:Z` relabeling as the primary fix. Portainer's current Linux Agent documentation says that if SELinux must remain enabled, the Agent should be deployed with `--privileged`. I updated the introduction and Option 1 to reflect Portainer's supported deployment guidance.
- The audit-log examples filtered with `ausearch -c docker`, which is too narrow and can miss relevant AVC denials from container runtime activity. I broadened the `ausearch` example and made the `sealert` filter more appropriate for Docker, Portainer, and container-related events.
- The custom policy example fed interpreted audit output into `audit2allow`. I updated it to use raw AVC records and added Red Hat's caveat that labeling problems should be ruled out before generating a local policy module.
- The Docker socket relabel command used `chcon -t container_file_t /var/run/docker.sock`, which is not the documented default SELinux type for `/run/docker.sock`. I replaced it with `restorecon -v /var/run/docker.sock` and clarified that the default type is `container_var_run_t`.

## Review Notes
- `--privileged` is the Portainer-documented approach for SELinux-enabled Linux hosts, but it materially reduces container isolation. The post now notes that tradeoff.
- Some troubleshooting utilities used in the post, especially `sealert`, may not be installed on minimal systems until the relevant SELinux troubleshooting packages are added.
- Portainer documentation elsewhere recommends matching the Agent image tag to the Portainer Server version. This post still uses `portainer/agent:latest`, so explicit version pinning could be tightened in a future revision.
