# Validation Summary: How to Reset the Portainer Admin Password

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Kubernetes
- `kubectl`

## Sources Consulted
- Portainer docs: Reset the admin user's password - https://docs.portainer.io/advanced/reset-admin
- Portainer docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer docs: Account settings - https://docs.portainer.io/user/account-settings
- Portainer docs: Install Portainer CE with Docker on Linux (STS) - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Docker docs: `docker compose config` - https://docs.docker.com/reference/cli/docker/compose/config/
- Docker docs: `docker compose volumes` - https://docs.docker.com/reference/cli/docker/compose/volumes/
- Docker docs: `docker compose ps` - https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker docs: Format command and log output - https://docs.docker.com/go/formatting/
- Kubernetes docs: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes docs: `kubectl scale` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The helper container output example was incorrect. The post showed a JSON object with `Username` and `Password`, but Portainer's official docs show log-style output with a success line and a generated password line. I updated the example to match the documented output format.
- The Docker Compose example used `docker compose config --volumes`, which is not a valid Docker Compose CLI option. I replaced it with a working command that inspects the stopped Portainer service container and reuses whatever is mounted at `/data`.
- The bind-mount discovery example used `docker inspect portainer | grep -A5 '"Mounts"'`, which is not a reliable way to identify the Portainer data mount. I changed it to a `docker inspect --format` example that prints the mounts directly so the `/data` mount can be identified accurately.
- The `--admin-password` example was too minimal to work as a practical Portainer first-run command and used `portainer/portainer-ce:latest` instead of the current STS tag shown in Portainer's docs. I updated it to a functional Docker run example with the documented ports, socket mount, data volume, container name, restart policy, and `portainer/portainer-ce:sts`.
- The Kubernetes example hardcoded `claimName: portainer` without noting that this may differ by deployment. I added a short note to change the PVC name if needed, matching Portainer's documentation caveat.

## Review Notes
- The post is technically valid after the above corrections.
- Portainer's current official examples use the `:sts` image tag. Teams standardizing on LTS releases may want to substitute the corresponding LTS tag in their own deployments.
- The `--admin-password` flag only applies when the initial admin account is being created; it is not a post-install password reset mechanism.
