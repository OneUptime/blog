# How to Disable Host PID Access for Non-Admin Users in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Host PID, Container Security, Hardening

Description: Learn how to prevent non-admin Portainer users from creating containers with host PID namespace access.

## What Is Host PID Access?

The `--pid=host` Docker flag makes a container share the host's PID (process ID) namespace. With this setting:

- The container can see all host processes.
- The container can potentially kill or interact with host processes.
- Combined with other capabilities, it can be used for privilege escalation.

This is a significant security risk in multi-tenant Portainer deployments.

## Disabling Host PID in Portainer

1. Go to **Environments** in Portainer.
2. Select your Docker environment.
3. Open **Setup**.
4. Under **Docker Security Settings**, enable **Disable the use of host PID 1 for non-administrators**.
5. Click **Save settings**.

## Why This Matters

Consider this scenario: a developer deploys a container with host PID access and enough additional privileges to run `nsenter`:

```bash
# Inside a sufficiently privileged container that already uses --pid=host
nsenter -t 1 -m -u -i -n -p -- bash
# This can enter the host namespaces and provide host-level access
```

Portainer's setting prevents non-admin users from requesting host PID access through Portainer.

## Corresponding Kubernetes Setting

In Kubernetes environments, you can enforce this via Pod Security Admission labels or Portainer's Kubernetes security policies:

```yaml
# Kubernetes: block host namespaces, including hostPID
kubectl label --overwrite namespace production \
  pod-security.kubernetes.io/enforce=restricted

# Pod Security Admission enforces this at the API level
```

## Checking for Containers Using Host PID

```bash
# Find any running containers with hostPID enabled
docker inspect $(docker ps -q) | \
  jq '.[] | select(.HostConfig.PidMode == "host") | .Name'
```

## Security Implications by Feature

| Feature | Risk When Enabled for Non-Admins |
|---------|----------------------------------|
| Host PID | Process snooping, kill arbitrary processes |
| Host IPC | Shared memory attacks between containers |
| Host Network | Network snooping, port conflicts |
| Privileged mode | Full root on host |
| Bind mounts | Host filesystem exposure |

## Portainer Security Settings Summary

For maximum security, disable all these for non-admin users:

```text
Environments > [Env] > Setup > Docker Security Settings:
☒ Disable privileged mode for non-administrators
☒ Disable bind mounts for non-administrators
☒ Disable the use of host PID 1 for non-administrators
☒ Disable device mappings for non-administrators
☒ Disable container capabilities for non-administrators
☒ Disable sysctl settings for non-administrators
```

## Conclusion

Disabling host PID access is a simple configuration change in Portainer that reduces a significant host-exposure risk. Along with disabling privileged mode, bind mounts, device mappings, extra container capabilities, and sysctl settings, it forms a stronger container security baseline for shared Portainer environments.
