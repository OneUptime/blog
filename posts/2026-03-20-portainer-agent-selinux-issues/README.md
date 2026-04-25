# How to Fix SELinux Issues with Portainer Agent - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, SELinux, RHEL, CentOS, Security

Description: Resolve SELinux permission denials that prevent the Portainer Agent from accessing the Docker socket or volumes on RHEL/CentOS systems.

## Introduction

On RHEL, CentOS, and other SELinux-enabled systems, SELinux may block the Portainer Agent from accessing the Docker socket or host volumes. These denials usually show up in the audit log or as the agent failing to communicate with Docker. This guide covers diagnosing and fixing SELinux issues.

## Diagnosing SELinux Denials

```bash
# Check if SELinux is enabled and enforcing

getenforce
# If: Enforcing - SELinux is active and blocking
# If: Permissive - SELinux logs but doesn't block

# Check audit log for denials related to Docker/container
sudo ausearch -m avc -ts recent | grep -i "docker\|container\|portainer"

# Or check audit.log directly
sudo grep "avc:.*denied" /var/log/audit/audit.log | grep -i "docker\|container" | tail -20

# Check dmesg for SELinux messages if auditd is not running
sudo dmesg | grep -i "avc\|selinux" | tail -20
```

## Fix 1: Use --privileged on SELinux-enabled Docker Hosts

Portainer's Docker Standalone Agent documentation assumes SELinux is disabled on the machine running Docker. If you require SELinux, Portainer documents deploying the agent with `--privileged`:

```bash
docker run -d \
  --name portainer_agent \
  --restart always \
  --privileged \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

```yaml
# docker-compose.yml
services:
  agent:
    image: portainer/agent:latest
    restart: always
    privileged: true
    ports:
      - "9001:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
```

This disables SELinux separation for the container, so use it with care.

## Fix 2: Use the :z Volume Mount Option for Additional Bind Mounts

The `:z` option relabels a bind-mounted host file or directory for shared container access. Use it only on additional bind mounts that are safe to relabel. Do not use it on `/var/run/docker.sock`, and be careful with system-managed paths because relabeling changes labels on the host itself.

On current container SELinux policy, the relabeled content uses a shared container label such as `container_file_t:s0`.

## Fix 3: Set SELinux to Permissive Temporarily for Diagnosis

```bash
# Set permissive mode (temporarily, for testing)
sudo setenforce 0
getenforce  # Should show: Permissive

# If agent works in permissive mode, SELinux was the issue
# Re-enable enforcing
sudo setenforce 1
```

## Fix 4: Create a Custom SELinux Policy

If you need a tighter long-term alternative to running the agent privileged, create a custom SELinux policy after reviewing the denials. Use `audit2allow` only after confirming that labels or existing policy do not already solve the problem:

```bash
# Generate a policy from the audit log denials
sudo ausearch -m AVC -ts recent | audit2allow -M portainer-agent

# Review the generated policy
cat portainer-agent.te

# Install the policy
sudo semodule -i portainer-agent.pp

# Verify
sudo semodule -l | grep portainer
```

## Fix 5: Check the Docker Socket SELinux Context

The socket path is typically labeled `container_var_run_t`, but a Docker socket `connectto` denial is usually checked against `container_runtime_t` on a `unix_stream_socket`.

```bash
# Check current SELinux context of Docker socket
ls -Z /var/run/docker.sock
# Typical on RHEL/CentOS: system_u:object_r:container_var_run_t:s0 /var/run/docker.sock

# Restore default context if wrong
sudo restorecon -v /var/run/docker.sock

# Check the allow rule used for connecting to the Docker socket
sesearch -A --source=container_t --target=container_runtime_t --class=unix_stream_socket --perm=connectto
```

## Verifying the Fix

```bash
# Check agent container is running correctly
docker ps | grep portainer_agent

# Check logs for startup or Docker access errors
docker logs portainer_agent | grep -E "starting Agent API server|unable to retrieve information from Docker|error" | head -10

# Test that agent responds over HTTPS (expected status: 204)
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:9001/ping
```

## Conclusion

SELinux denials are a common hurdle when deploying Portainer on enterprise Linux distributions. On SELinux-enabled Docker hosts, Portainer documents deploying the agent with `--privileged`. If you need a tighter long-term solution, review the AVC denials carefully and build a custom policy rather than broadly relabeling system paths or leaving SELinux in permissive mode.
