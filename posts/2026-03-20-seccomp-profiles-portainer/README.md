# How to Configure Seccomp Profiles for Containers in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Seccomp, Container Hardening, Linux Security

Description: Apply seccomp profiles to restrict system calls available to containers, reducing attack surface by limiting what containerized processes can ask the kernel to do.

## Introduction

Seccomp (Secure Computing Mode) is a Linux kernel feature that restricts which system calls a process can make. Docker applies a default seccomp profile that blocks ~44 dangerous syscalls. Custom profiles let you restrict containers even further for workloads you understand well. Fewer allowed syscalls mean a smaller attack surface. This guide covers creating and applying custom seccomp profiles via Portainer.

## Step 1: Understanding the Default Profile

```bash
# Docker's default seccomp profile blocks or conditionally restricts syscalls like:

# - ptrace (debugging/tracing other processes)
# - mount/umount (filesystem manipulation)
# - kexec_load (loading new kernel)
# - keyctl (kernel key management)
# - add_key, request_key

# Check if a container is using the default profile
docker inspect my_container --format '{{.HostConfig.SecurityOpt}}'
# [] means default seccomp profile is applied

# View Docker's published default profile source
curl -fsSL https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json | head -20
```

## Step 2: Create a Restrictive Custom Profile

```bash
# /etc/docker/seccomp/nginx-profile.json
# Start from Docker's default profile and remove extra syscalls after testing.
sudo mkdir -p /etc/docker/seccomp
curl -fsSL https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json \
  | jq '(.syscalls[] | select(.action == "SCMP_ACT_ALLOW") | .names) -= [
      "ptrace", "process_vm_readv", "process_vm_writev",
      "process_madvise", "kcmp", "pidfd_getfd"
    ] | .syscalls |= map(select(.names | length > 0))' \
  | sudo tee /etc/docker/seccomp/nginx-profile.json >/dev/null
```

## Step 3: Apply Seccomp Profile in Docker Compose

```yaml
# docker-compose.yml - Custom seccomp profile
services:
  nginx:
    image: nginx:alpine
    security_opt:
      # Apply custom restrictive profile
      - seccomp=/etc/docker/seccomp/nginx-profile.json
    ports:
      - "80:80"

  api:
    image: myapp/api:latest
    # Omit security_opt to use Docker's default profile

  # Disable seccomp entirely (NOT recommended for production)
  debug_container:
    image: ubuntu:22.04
    security_opt:
      - seccomp=unconfined
    command: ["tail", "-f", "/dev/null"]
```

## Step 4: Generate a Profile from Container Activity

```bash
# Step 1: Run container with audit mode (log but don't block)
docker run -d \
  --security-opt seccomp=/etc/docker/seccomp/audit.json \
  --name nginx_audit \
  nginx:alpine

# audit.json - logs all syscalls
# {
#   "defaultAction": "SCMP_ACT_LOG",
#   "syscalls": []
# }

# Step 2: Collect syscall logs from kernel audit
sudo ausearch -m SECCOMP -c nginx -i \
  | sed -n 's/.*syscall=\([^ ]*\).*/\1/p' \
  | sort -u

# Step 3: Use oci-seccomp-bpf-hook to auto-generate profiles
# Install: https://github.com/containers/oci-seccomp-bpf-hook
sudo podman run -d --name nginx_trace \
  --annotation io.containers.trace-syscall="of:/tmp/profile.json" \
  nginx:alpine
# Exercise the container, then stop it so the hook writes the profile.
sudo podman stop nginx_trace

# Step 4: The generated profile only allows observed syscalls
cat /tmp/profile.json
```

## Step 5: Profile for Node.js Application

```bash
# node-api-seccomp.json - start from Docker's default and remove tracing syscalls
curl -fsSL https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json \
  | jq '(.syscalls[] | select(.action == "SCMP_ACT_ALLOW") | .names) -= [
      "ptrace", "process_vm_readv", "process_vm_writev",
      "process_madvise", "kcmp", "pidfd_getfd"
    ] | .syscalls |= map(select(.names | length > 0))' \
  > node-api-seccomp.json
```

## Step 6: Verify Profile is Active

```bash
# Check security options on running container
docker inspect nginx_secured --format '{{.HostConfig.SecurityOpt}}'
# Returns: [seccomp=/etc/docker/seccomp/nginx-profile.json]

# Test that blocked syscalls are denied
docker run --rm --security-opt seccomp=/etc/docker/seccomp/nginx-profile.json \
  alpine sh -c 'apk add --no-cache strace >/dev/null && strace -c sleep 1'
# strace uses ptrace - if blocked, it should show "Operation not permitted"

# Verify application still works normally
curl http://localhost:80
# Should work if allowed syscalls cover nginx's needs
```

## Conclusion

Custom seccomp profiles are the most granular syscall-level security control for containers. Start with Docker's default profile (already applied unless you opted out), then tighten further for specific workloads you understand well. A web server needs far fewer syscalls than a general-purpose system utility. The profile generation approach - audit then allowlist - is safer than hand-crafting allow lists. Portainer's `security_opt` field in stack configurations makes it straightforward to deploy containers with custom profiles at scale.
