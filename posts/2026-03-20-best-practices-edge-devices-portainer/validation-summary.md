# Validation Summary: Best Practices for Edge Device Management with Portainer - Devices

## Status
validated

## Post Type
Guide / Best practices

## Technologies Covered
- Portainer Edge Stacks and Edge Groups
- Portainer Role-Based Access Control (RBAC)
- Docker Compose
- Docker secrets
- Docker logging drivers
- Docker CLI (`docker volume`, `docker image`, `docker system`)
- Bash shell scripting

## Sources Consulted
- Portainer official documentation, Add a new Edge Stack: https://docs.portainer.io/user/edge/stacks/add
- Portainer official documentation, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer official documentation, Roles: https://docs.portainer.io/admin/user/roles
- Portainer official documentation, Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer official documentation, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer official documentation, Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Portainer official documentation, How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Docker official documentation, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker official documentation, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker official documentation, Services in Compose: https://docs.docker.com/reference/compose-file/services/
- Docker official documentation, Secrets in Compose: https://docs.docker.com/reference/compose-file/secrets/
- Docker official documentation, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker official documentation, JSON File logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker official documentation, `docker volume ls`: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker official documentation, `docker image ls`: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker official documentation, `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
1. The Git deployment steps were written for standard Docker stacks, not Edge Stacks, even though the post is about edge device management. I updated the workflow to use **Edge Stacks** and the documented **Repository** build method, and noted that **GitOps updates** for Edge Stacks are a Portainer Business Edition feature.
2. The access-control example described custom roles (`viewer`, `developer`, `operator`, `admin`) as if they were Portainer roles. Portainer documents a different built-in RBAC model, so I replaced the example with actual Portainer roles and permissions relevant to Docker and Edge environments.
3. The configuration example recommended environment variables for sensitive values and included the obsolete top-level Compose `version` key. I corrected this by using environment variables for non-sensitive configuration and Docker Compose secrets for passwords and API keys, and removed the obsolete `version` field.
4. The logging example used the `json-file` driver with a `tag` option. Docker's official `json-file` documentation does not support `tag` for that driver, so I removed it and narrowed the guidance to log rotation, which the example actually configures.
5. The audit script had a hard-coded timestamp, used `echo` escape sequences that are not portable, and labeled dangling images as "Images without containers". I replaced the output with `printf`, switched the date to `$(date)`, and corrected the image section to match Docker's documented `dangling=true` behavior.
6. The Portainer hardening example used an outdated `--ssl` flag, omitted required top-level secret and volume definitions for the shown Compose snippet, and used a less current image reference than Portainer's own examples. I updated it to documented TLS flags, added `--http-disabled`, and supplied the missing Compose definitions.

## Review Notes
- The health check examples are syntactically valid, but they still depend on the underlying images containing `curl` and `pg_isready`.
- The `deploy.resources` example in Practice 6 is valid Compose syntax, but enforcement can vary by target platform and implementation.
- Portainer RBAC and the Edge Stack GitOps workflow shown in the post are Business Edition-oriented features; that limitation is now called out where it matters.
- The `--admin-password-file` flag in the Portainer example is intended for initial admin creation, not for changing an existing admin password later.
