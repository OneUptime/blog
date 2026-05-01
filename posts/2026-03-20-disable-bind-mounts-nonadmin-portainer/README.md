# How to Disable Bind Mounts for Non-Admin Users in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Bind Mounts, Container Security, Hardening

Description: Learn how to prevent non-administrator Portainer users from creating containers with host directory bind mounts.

## Why Disable Bind Mounts?

Bind mounts let a container access host filesystem directories directly. In the wrong hands, this is a serious security risk:

- A developer could mount `/etc/passwd` and read host account information.
- A malicious container could mount `/var/run/docker.sock` and gain control of the Docker daemon.
- A mount on `/` can give the container broad access to the host filesystem, often with write access unless mounted read-only.

Portainer allows administrators to disable bind mounts for non-admin users in Docker Standalone and Docker Swarm environments.

## Disabling Bind Mounts in Portainer

### For Docker Standalone and Docker Swarm Environments

1. In Portainer, open your Docker environment.
2. For Docker Standalone, expand **Host** and click **Setup**. For Docker Swarm, expand **Swarm** and click **Setup**.
3. In **Docker Security Settings**, enable **Disable bind mounts for non-administrators**.

### For Kubernetes Environments

Portainer's current Kubernetes environment setup does not expose an equivalent per-user bind mount toggle. Kubernetes environments use different controls, such as **Security constraints** and namespace restrictions.

## What Happens When Bind Mounts Are Disabled

When this setting is enabled, Portainer removes the option to attach to a host file system path for non-admin users and rejects bind mount attempts made through Portainer.

Admins can still create bind mounts - the restriction applies only to standard users.

## Using Named Volumes Instead

Redirect users from bind mounts to named volumes, which are safer:

```yaml
# Container with a named volume

services:
  app:
    image: myapp:latest
    volumes:
      - app-data:/data

    # Instead of a bind mount (blocked in Portainer for non-admin users)
    # - /host/path:/data

volumes:
  app-data:
```

## Verifying the Restriction via API

```bash
# Attempt to create a container with a bind mount as a non-admin user
# Portainer access tokens are sent in the X-API-Key header
curl -X POST "${PORTAINER_URL}/api/endpoints/1/docker/containers/create" \
  -H "X-API-Key: ${NON_ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "Image": "nginx:alpine",
    "HostConfig": {
      "Binds": ["/host/path:/container/path"]
    }
  }'
# Expected: Portainer rejects the request for a non-admin user when bind mounts are disabled.
```

## When to Allow Bind Mounts

Bind mounts are legitimate in some scenarios:

- Development environments where developers need host filesystem access.
- Log collection agents that must read `/var/log`.
- Monitoring agents that need `/proc` or `/sys` access.

In these cases, consider:
1. Using trusted (admin) users for these deployments.
2. Making the bind mount read-only when possible.
3. Deploying log agents via DaemonSets with appropriate privileges.

## Conclusion

Disabling bind mounts for non-admin users in Portainer prevents a class of container escape and privilege escalation attacks. Combined with Portainer's other Docker security settings, such as restricting privileged mode and device mappings, this forms a strong baseline security posture for multi-user Portainer installations.
