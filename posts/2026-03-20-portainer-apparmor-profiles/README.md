# How to Configure AppArmor Profiles for Containers in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AppArmor, Container Security, Linux Security, Docker Hardening

Description: Learn how to apply AppArmor profiles to Docker containers via Portainer to restrict file access, network operations, and capabilities at the kernel level.

---

AppArmor (Application Armor) is a Linux Security Module that restricts program capabilities using per-program profiles. On AppArmor-enabled hosts, Docker applies a default AppArmor profile to containers; custom profiles provide finer-grained control. AppArmor is available on Ubuntu, Debian, and openSUSE systems.

## Checking AppArmor Status

```bash
# Check if AppArmor is enabled and docker-default profile is loaded

sudo apparmor_status | grep docker-default

# Output should include:
# docker-default
```

## Docker's Default AppArmor Profile

Docker automatically applies the `docker-default` profile, which:

- Blocks writing to `/proc/sys/`, `/sys/`, and kernel module loading
- Restricts ptrace and mount operations
- Allows most normal application operations

## Creating a Custom AppArmor Profile

Create a stricter profile for a web application that only needs to serve files:

```text
# /etc/apparmor.d/docker-my-api
#include <tunables/global>

profile docker-my-api flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Allow reading app files
  /app/ r,
  /app/** r,

  # Allow writing only to logs and temp
  /app/logs/ rw,
  /app/logs/** rw,
  /tmp/ rw,
  /tmp/** rw,

  # Allow network
  network tcp,
  network udp,

  # Block sensitive paths
  deny /etc/shadow r,
  deny /etc/passwd w,
  deny /proc/sys/kernel/** w,
  deny /sys/** w,

  # Block dangerous capabilities
  deny capability sys_ptrace,
  deny capability sys_admin,
  deny capability net_admin,
}
```

Load the profile:

```bash
sudo apparmor_parser -r -W /etc/apparmor.d/docker-my-api
sudo apparmor_status | grep my-api
```

## Applying an AppArmor Profile in a Stack

Reference the loaded profile in your Compose file:

```yaml
services:
  api:
    image: my-api:latest
    security_opt:
      - apparmor:docker-my-api    # Profile name as loaded by apparmor_parser
```

## Applying via Portainer UI

For standalone containers, Portainer added `-security-opt` support in version 2.40.0. In supported versions:

1. Go to **Containers > Add container**.
2. Open **Advanced container settings**.
3. Add `apparmor:docker-my-api` as a security option.

The profile must be loaded on the Docker host before starting the container.

## AppArmor Complain Mode for Testing

Use complain mode to log most violations without blocking - useful for discovering what a profile would block. Explicit `deny` rules still apply and are not logged unless you audit them:

```text
# Set complain mode during development:
profile docker-my-api flags=(attach_disconnected,mediate_deleted,complain) {
  # ... profile rules
}
```

Monitor violations:

```bash
# Watch AppArmor kernel messages in real time
sudo dmesg --follow | grep apparmor

# Or inspect recent kernel log entries on systemd hosts
sudo journalctl -k | grep apparmor | tail -20
```

Review logged violations and update the profile using `aa-logprof`:

```bash
sudo aa-logprof
# Review the logged events and update /etc/apparmor.d/docker-my-api when prompted
```

## Disabling AppArmor for a Container

If AppArmor is causing issues and you need to debug:

```yaml
services:
  api:
    security_opt:
      - apparmor:unconfined    # Disables AppArmor for this container
```

Restore the default profile after debugging by removing the security_opt entry.

## Combining AppArmor with Seccomp

For maximum restriction, apply both AppArmor and seccomp:

```yaml
services:
  api:
    security_opt:
      - apparmor:docker-my-api
      - seccomp:/etc/docker/seccomp/my-api-profile.json
```

The two mechanisms complement each other: seccomp filters system calls, AppArmor controls file/network access.
