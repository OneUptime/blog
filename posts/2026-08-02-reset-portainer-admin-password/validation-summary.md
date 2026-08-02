# Validation Summary: How to Reset a Forgotten Portainer Admin Password Without Losing Configuration

## Status
validated

## Post Type
Technical recovery guide and troubleshooting tutorial

## Technologies Covered
- Portainer Server and the `portainer/helper-reset-password` image
- Docker Engine containers, named volumes, and bind mounts
- Docker Compose volume naming
- Docker Swarm services and node-local volumes
- Kubernetes Deployments, Pods, PersistentVolumes, and PersistentVolumeClaims
- Bcrypt password hashes
- OAuth, LDAP, Active Directory, and Portainer internal authentication

## Sources Consulted
- [Portainer: Reset the admin user's password](https://docs.portainer.io/advanced/reset-admin)
- [Portainer: How do I reset my Portainer password?](https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-do-i-reset-my-portainer-password)
- [Portainer: Reset a user's password](https://docs.portainer.io/admin/user/password)
- [Portainer: Account settings and changing your own password](https://docs.portainer.io/user/account-settings)
- [Portainer: Switch back to internal authentication](https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-can-i-switch-back-to-internal-authentication)
- [Portainer: What a Portainer backup includes](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: CLI configuration options](https://docs.portainer.io/advanced/cli)
- [Portainer: Encrypting the Portainer database](https://docs.portainer.io/advanced/db-encryption)
- [Portainer: Requirements and persistent-storage behavior](https://docs.portainer.io/start/requirements-and-prerequisites)
- [Portainer: Official password-reset helper repository](https://github.com/portainer/helper-reset-password)
- [Portainer helper source: database path and encrypted-database limitation](https://github.com/portainer/helper-reset-password/blob/develop/cmd/helper-reset-password/main.go)
- [Docker: Volumes, lifecycle, service locality, and backup/restore](https://docs.docker.com/engine/storage/volumes/)
- [Docker: `docker container run`](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker: Compose project naming](https://docs.docker.com/compose/how-tos/project-name/)
- [Docker: `docker service scale`](https://docs.docker.com/reference/cli/docker/service/scale/)
- [Docker: `docker service ps`](https://docs.docker.com/reference/cli/docker/service/ps/)
- [Docker: `docker service inspect`](https://docs.docker.com/reference/cli/docker/service/inspect/)
- [Kubernetes: Persistent Volumes and access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: `kubectl scale`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/)
- [Kubernetes: `kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes: `kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)

## Issues Found
- The post originally implied that the helper could update every Portainer data store and said that a missing `/data/portainer.db` always indicated a wrong or empty mount. The current helper explicitly does not support encrypted databases and only looks for `portainer.db`; an encrypted installation uses `portainer.edb`. The introduction and troubleshooting guidance now state this limitation and warn readers not to rename or open the encrypted file as an unencrypted database. This prevents an encrypted installation from being misdiagnosed and directs the reader to another signed-in administrator or Portainer support for a supported recovery path.

## Review Notes
- All Docker, Swarm, and Kubernetes commands and the Kubernetes Pod manifest are syntactically valid and match the current official recovery procedure.
- The helper flags `--password`, `--password-hash`, and `--data-path`, their mutual-exclusion rule, generated-password behavior, and User ID 1 account behavior match the current official helper source and documentation.
- The UI reset, internal-authentication route, backup scope, first-initialization restriction for Portainer Server's admin-password flags, Docker volume lifecycle, Compose name prefixing, and Swarm node-local storage cautions are technically accurate.
- The guide correctly tells readers to verify deployment-specific container, service, namespace, Deployment, volume, and PVC names rather than assuming the examples are universal.
