# Validation Summary: How to Fix SELinux Issues with Portainer Agent - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Docker Engine
- Docker Compose
- SELinux
- RHEL / CentOS
- `ausearch`
- `audit2allow`
- `semodule`
- `restorecon`
- `sesearch`
- `curl`

## Sources Consulted
- Portainer docs: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Agent repository README - https://github.com/portainer/agent
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose service `volumes` reference - https://docs.docker.com/reference/compose-file/services/
- Red Hat Enterprise Linux 9 docs: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Developer: My advice on SELinux container labeling - https://developers.redhat.com/articles/2025/04/11/my-advice-selinux-container-labeling
- Red Hat Customer Portal: SELinux prevents access to /var/run/docker.sock - https://access.redhat.com/solutions/4344161

## Issues Found
- The post presented `:z` relabeling as the primary fix for Portainer Agent on SELinux-enabled Docker hosts. Portainer's current Docker Standalone Agent documentation instead states that SELinux-enabled Linux hosts require deploying the agent with `--privileged`. I changed Fix 1 to reflect the documented Portainer deployment pattern and updated the Compose example accordingly.
- The original examples applied `:z` to `/var/run/docker.sock` and described the resulting label as `svirt_sandbox_file_t`. Current Docker and Red Hat guidance treat `:z` as a relabel of host content itself, and current container SELinux policy uses shared labels such as `container_file_t:s0`. I narrowed the `:z` section so it only applies to additional safe bind mounts and explicitly warns against using it on the Docker socket.
- The Compose example omitted publishing port `9001`, which would prevent a normal remote Portainer Server from reaching the agent. I added `ports` and `restart` to match the working `docker run` example.
- The Docker socket context section checked the wrong policy object. Docker socket access denials are typically `connectto` denials on `container_runtime_t` with class `unix_stream_socket`, not just `sock_file` access to `container_var_run_t`. I corrected the explanation and the `sesearch` command while keeping the file-label check with `ls -Z`.
- The verification command used plain HTTP for `/ping`, but the standard Portainer Agent listens over HTTPS with a self-signed certificate in non-Edge mode, and `/ping` returns `204`. I changed the command to `curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:9001/ping` so it validates the agent correctly.
- The introduction described SELinux denials as "silent failures". The Portainer Agent communicates with Docker at startup and commonly surfaces these problems through audit denials and Docker-access failures rather than a silent healthy startup, so I corrected that wording.
- The custom policy section treated `audit2allow` as the default long-term answer. Red Hat's SELinux guidance recommends using `audit2allow` only after reviewing denials and confirming labels or existing policy do not already solve the issue. I added that caveat.

## Review Notes
- Portainer's current documentation marks Docker Standalone Agent installation as a legacy option and recommends the Edge Agent for most new deployments.
- `audit2allow` and `sesearch` are not guaranteed to be installed on minimal RHEL/CentOS systems; the post's commands are valid, but readers may need the relevant SELinux tooling packages first.
- Command behavior was validated against current official documentation and authoritative upstream sources. The Docker/SELinux commands were not executed in this workspace because the required runtime and SELinux tools are not available here.
