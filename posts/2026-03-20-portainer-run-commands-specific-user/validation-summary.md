# Validation Summary: How to Run Commands as a Specific User in Container Console

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Linux users and permissions
- Container security

## Sources Consulted
- Portainer Docs: Access a container's console - https://docs.portainer.io/sts/user/docker/containers/console
- Portainer Docs: Why can't I use the console with my container? - https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-cant-i-use-the-console-with-my-container
- Portainer Docs: Roles - https://docs.portainer.io/sts/admin/user/roles
- Portainer Docs: Docker roles and permissions - https://docs.portainer.io/sts/advanced/docker-roles-and-permissions
- Portainer Docs: Activity - https://docs.portainer.io/admin/logs/activity
- Portainer Docs: Change container ownership - https://docs.portainer.io/user/docker/containers/ownership
- Docker Docs: docker container exec - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: Docker Engine security - https://docs.docker.com/engine/security/

## Issues Found
- The shell selection omitted Alpine's `/bin/ash`, which Portainer documents explicitly for Alpine containers. Updated the shell guidance accordingly.
- The post described root access in a container as "unrestricted". Docker documents that containers run with a restricted capability set by default, so I changed the wording to "broad access inside the container" and added a brief capability caveat for tools like `strace` and `tcpdump`.
- The `User: 1000` example assumed `gid=0(root)`. Docker documents the accepted `--user` formats, but the resulting primary GID for a UID-only value depends on the image/runtime configuration. I replaced the hard-coded output with a configuration-dependent explanation.
- The recommendation to use `nsenter` from the host for containers without `su` was not Portainer-specific and was unnecessary here. I replaced it with the Portainer-supported approach of reconnecting with the target user.
- The RBAC section incorrectly said only Operator and Admin roles can open consoles. Portainer's role matrix shows Environment Administrators, Operators, and Standard Users with access to the container can open container consoles, while Helpdesk and Read-only users cannot. I corrected that and clarified that RBAC and Activity logs are Portainer Business Edition features.
- The post suggested "read-only console access" and disabling console access via environment access controls. Portainer documents access control and administrators-only ownership, not a read-only console mode. I corrected the guidance to use Portainer access control and ownership settings instead.
- The Docker CLI examples used `/bin/bash` generically. I changed them to `/bin/sh` for broader compatibility with container images and to match Docker's documented examples.

## Review Notes
- Portainer's console requires a shell to exist in the image, and Portainer documents `/bin/ash` for Alpine containers specifically.
- If the console fails because the container was not started with interactive/TTY enabled, Portainer documents enabling `Interactive & TTY` in the container settings.
