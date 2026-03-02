# How to Configure LXD Profiles for Container Templates on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Container, Configuration, DevOps

Description: Learn how to create and manage LXD profiles on Ubuntu to standardize container configurations, define resource limits, and apply templates to new containers.

---

LXD profiles are reusable configuration templates applied to containers. Instead of manually configuring every container with the same CPU limits, network settings, and mounted devices, you define a profile once and apply it at launch. Multiple profiles can stack on a container, layering configurations in a predictable order.

## What Profiles Contain

A profile can define:
- Resource limits (CPU, memory, disk)
- Network devices (NICs)
- Disk devices (storage volumes)
- Kernel parameters (`sysctls`)
- Security settings (privilege level, nesting)
- Environment variables
- Any other container configuration

## The Default Profile

LXD installs with a `default` profile applied to every container:

```bash
# View the default profile
lxc profile show default
```

```yaml
config: {}
description: Default LXD profile
devices:
  eth0:
    name: eth0
    network: lxdbr0
    type: nic
  root:
    path: /
    pool: default
    type: disk
name: default
```

It adds one NIC (attached to `lxdbr0`) and a root disk in the `default` storage pool. Every container inherits this unless you specify otherwise.

## Creating Profiles

```bash
# Create an empty profile
lxc profile create webserver

# List all profiles
lxc profile list
```

## Setting Configuration in Profiles

```bash
# Set resource limits
lxc profile set webserver limits.cpu 2
lxc profile set webserver limits.memory 4GiB

# Set an environment variable for all containers using this profile
lxc profile set webserver environment.NODE_ENV production
lxc profile set webserver environment.TZ UTC

# Set security options
lxc profile set webserver security.nesting false
lxc profile set webserver security.privileged false
```

## Adding Devices to Profiles

```bash
# Add a root disk device with a size limit
lxc profile device add webserver root disk \
  path=/ \
  pool=default \
  size=30GiB

# Add a NIC using a specific network
lxc profile device add webserver eth0 nic \
  nictype=bridged \
  parent=lxdbr0

# Add a shared directory mount (host path -> container path)
lxc profile device add webserver shared-logs disk \
  source=/var/log/containers \
  path=/var/log/app \
  readonly=false
```

## Editing a Profile Directly

For complex profiles, edit the YAML directly:

```bash
# Open profile in editor
lxc profile edit webserver
```

This opens an editor with the profile YAML. You can make multiple changes at once:

```yaml
config:
  limits.cpu: "2"
  limits.memory: 4GiB
  environment.NODE_ENV: production
  environment.TZ: UTC
  security.nesting: "false"
description: Standard web server profile
devices:
  eth0:
    name: eth0
    network: lxdbr0
    type: nic
  root:
    path: /
    pool: default
    size: 30GiB
    type: disk
name: webserver
```

## Creating Profiles from YAML

For scripted or reproducible setup, pipe YAML into `lxc profile create`:

```bash
# Create a database server profile
cat | lxc profile create dbserver <<'EOF'
config:
  limits.cpu: "4"
  limits.memory: 16GiB
  limits.memory.swap: "false"
  environment.TZ: UTC
description: PostgreSQL database server profile
devices:
  eth0:
    name: eth0
    network: lxdbr0
    type: nic
  root:
    path: /
    pool: default
    size: 100GiB
    type: disk
name: dbserver
EOF
```

## Practical Profile Examples

### Profile: Privileged Container (Legacy Apps)

Some older applications require privileged mode. Keep this isolated to a specific profile rather than making it the default:

```bash
lxc profile create privileged-app
lxc profile set privileged-app security.privileged true
lxc profile set privileged-app raw.lxc "lxc.apparmor.profile=unconfined"
```

### Profile: Nested Virtualization

For containers that need to run Docker or other container runtimes:

```bash
lxc profile create docker-host
lxc profile set docker-host security.nesting true
lxc profile set docker-host security.syscalls.intercept.mknod true
lxc profile set docker-host security.syscalls.intercept.setxattr true
lxc profile set docker-host limits.cpu 4
lxc profile set docker-host limits.memory 8GiB
```

### Profile: High-Security Container

For containers handling sensitive data with restricted capabilities:

```bash
lxc profile create high-security
lxc profile set high-security security.privileged false
lxc profile set high-security security.nesting false
lxc profile set high-security limits.cpu 1
lxc profile set high-security limits.memory 1GiB

# Drop all capabilities then add only what's needed
lxc profile set high-security raw.lxc "lxc.cap.drop=all
lxc.cap.keep=net_bind_service"
```

### Profile: CI/CD Runner

```bash
lxc profile create ci-runner
lxc profile set ci-runner limits.cpu 4
lxc profile set ci-runner limits.memory 8GiB
lxc profile set ci-runner security.nesting true
lxc profile set ci-runner security.syscalls.intercept.mknod true
lxc profile device add ci-runner root disk pool=default size=50GiB path=/
```

## Applying Profiles to Containers

### At Launch Time

```bash
# Use only the webserver profile (no default profile)
lxc launch ubuntu:24.04 mysite --no-profiles --profile webserver

# Stack profiles: default first, then webserver overrides
lxc launch ubuntu:24.04 mysite --profile default --profile webserver

# Multiple profiles: applied left to right, later profiles win conflicts
lxc launch ubuntu:24.04 mycontainer \
  --profile default \
  --profile webserver \
  --profile monitoring
```

### Applying Profiles to Existing Containers

```bash
# Add a profile to a running container
lxc profile add mycontainer monitoring

# Remove a profile
lxc profile remove mycontainer old-profile

# Replace all profiles
lxc profile assign mycontainer "default,webserver"
```

## Profile Inheritance and Overrides

When multiple profiles are applied, settings are merged. For devices, later profiles override devices with the same name. Container-level settings override all profiles:

```bash
# Profile sets 4 CPUs, but this container needs 6
lxc launch ubuntu:24.04 heavy-app --profile default --profile webserver
lxc config set heavy-app limits.cpu 6  # container override wins
```

## Copying and Exporting Profiles

```bash
# Copy a profile
lxc profile copy webserver webserver-prod

# Export profile as YAML
lxc profile show webserver > webserver-profile.yaml

# Import on another LXD instance
cat webserver-profile.yaml | lxc profile create webserver
# or
lxc profile edit webserver < webserver-profile.yaml
```

## Listing Containers Using a Profile

```bash
# See which containers use a profile
lxc profile show webserver | grep "Used by"

# Or list all containers with their profiles
lxc list --format csv | while IFS=, read name state ip1 ip2 type profiles; do
  echo "$name: $profiles"
done
```

## Updating Profiles Across Containers

Changes to a profile immediately affect all containers using it (on restart for most settings):

```bash
# Update memory limit in the profile
lxc profile set webserver limits.memory 8GiB

# All containers using this profile now have the new limit
# (some settings require container restart)

# Force restart all containers using a profile
for container in $(lxc profile show webserver | grep "Managed:" -A1 | grep "^  -" | awk '{print $2}'); do
  echo "Restarting $container..."
  lxc restart "$container"
done
```

## Deleting Profiles

```bash
# Remove profile from all containers first
# Then delete
lxc profile delete webserver

# A profile in use by containers cannot be deleted
# Error: Profile still in use
```

Profiles are the right tool for managing any LXD environment with more than a handful of containers. Define your standard configurations as profiles, apply them consistently, and modify the profile when you need to update all containers in a tier.
