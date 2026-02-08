# How to Use Docker Compose cap_add and cap_drop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Security, Linux Capabilities, Container Security, DevOps

Description: Master Docker Compose cap_add and cap_drop to fine-tune Linux capabilities for tighter container security.

---

Containers run with a default set of Linux capabilities that grant them specific kernel-level privileges. By default, Docker drops many dangerous capabilities but still grants a fairly generous set. If you want to lock down your containers properly, or if your application needs a specific privilege that Docker strips away, you need `cap_add` and `cap_drop`.

## Understanding Linux Capabilities

Linux capabilities break the traditional root/non-root binary into granular permissions. Instead of giving a process full root access, you can grant it just the specific privileges it needs. For example, a web server might need to bind to port 80 (which requires `NET_BIND_SERVICE`) but has no reason to modify file ownership (which requires `CHOWN`).

Docker containers start with a default capability set that includes capabilities like `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `KILL`, `SETGID`, `SETUID`, `NET_BIND_SERVICE`, `SYS_CHROOT`, and several others. This is already a reduced set compared to full root, but it is still more than most applications need.

You can see the full list of Linux capabilities by checking the capabilities manual page.

```bash
# List all available Linux capabilities on your system
man capabilities

# Or view the abbreviated list
capsh --print
```

## The Principle of Least Privilege

Security best practice says to give every process the minimum permissions it needs to function. With Docker Compose, the approach is straightforward: drop all capabilities, then add back only what your application requires.

```yaml
# Drop all capabilities and add back only what is needed
version: "3.8"

services:
  web:
    image: nginx:alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
      - CHOWN
      - SETUID
      - SETGID
    ports:
      - "80:80"
```

This Nginx container can bind to privileged ports and manage file ownership (which Nginx needs during startup), but it cannot do anything else that requires elevated privileges.

## cap_drop: Removing Capabilities

The `cap_drop` directive removes capabilities from a container. The most common and recommended approach is to drop everything first.

```yaml
# Drop all capabilities for maximum security
services:
  api:
    image: my-api:latest
    cap_drop:
      - ALL
```

You can also selectively drop specific capabilities while keeping the rest of the defaults.

```yaml
# Selectively drop dangerous capabilities
services:
  worker:
    image: my-worker:latest
    cap_drop:
      - SYS_ADMIN
      - NET_RAW
      - SYS_PTRACE
      - MKNOD
```

Here are some capabilities you should almost always drop if you are not using `ALL`:

| Capability | What It Allows | Why Drop It |
|---|---|---|
| SYS_ADMIN | Broad system administration | Overly powerful, nearly equivalent to root |
| NET_RAW | Raw socket access | Enables network sniffing and spoofing |
| SYS_PTRACE | Process tracing | Can be used to escape container isolation |
| MKNOD | Create device files | Rarely needed, potential attack vector |
| AUDIT_WRITE | Write to kernel audit log | Not needed for most applications |
| SYS_MODULE | Load kernel modules | Extremely dangerous in containers |

## cap_add: Granting Capabilities

The `cap_add` directive adds capabilities to a container. You typically use this after dropping all capabilities to add back only what is necessary.

```yaml
# Application that needs to manipulate network interfaces
services:
  network-tool:
    image: my-network-tool:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_ADMIN
      - NET_RAW
```

Here are commonly needed capabilities for different types of applications.

### Web Servers

Web servers that bind to ports below 1024 need `NET_BIND_SERVICE`.

```yaml
# Web server with minimal capabilities
services:
  nginx:
    image: nginx:alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
      - CHOWN
      - SETUID
      - SETGID
      - DAC_OVERRIDE
```

### Network Monitoring Tools

Tools like `tcpdump` or custom network monitors need raw socket access.

```yaml
# Network monitoring container
services:
  monitor:
    image: my-network-monitor:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_RAW
      - NET_ADMIN
    network_mode: host
```

### System Administration Containers

Some containers need broader access for administration tasks, though this should be rare.

```yaml
# System administration container with restricted capabilities
services:
  admin:
    image: admin-tools:latest
    cap_drop:
      - ALL
    cap_add:
      - SYS_PTRACE
      - SYS_ADMIN
      - DAC_READ_SEARCH
```

## Figuring Out Which Capabilities Your Container Needs

The trial-and-error method is surprisingly effective. Drop all capabilities, run your container, and check what fails.

```bash
# Run your container with all capabilities dropped
docker run --cap-drop=ALL my-image:latest

# If it fails, check the logs for "Operation not permitted" errors
docker logs <container-id>
```

You can also trace the capability checks using tools like `strace` or `auditd`.

```bash
# Run with strace to see which capabilities are checked
docker run --cap-drop=ALL --cap-add=SYS_PTRACE my-image:latest \
  strace -f -e trace=capget,capset -p 1
```

Another approach is to use the `pscap` tool from the `libcap-ng-utils` package.

```bash
# Check what capabilities a running container process has
docker exec my-container cat /proc/1/status | grep Cap

# Decode the capability bitmask
capsh --decode=00000000a80425fb
```

## Real-World Example: Full Application Stack

Here is a complete Compose file demonstrating capability management across a multi-service application.

```yaml
# Production stack with properly scoped capabilities
version: "3.8"

services:
  # Reverse proxy - needs to bind port 80/443 and manage workers
  proxy:
    image: nginx:alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
      - CHOWN
      - SETUID
      - SETGID
    ports:
      - "80:80"
      - "443:443"

  # Application server - runs on unprivileged port, needs nothing special
  app:
    build: ./app
    cap_drop:
      - ALL
    expose:
      - "8080"

  # Database - needs file ownership management
  postgres:
    image: postgres:16
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - FOWNER
      - SETUID
      - SETGID
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Redis - minimal privileges needed
  redis:
    image: redis:7-alpine
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID

  # Log shipper - needs to read files from other containers
  filebeat:
    image: elastic/filebeat:8.12.0
    cap_drop:
      - ALL
    cap_add:
      - DAC_READ_SEARCH
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro

volumes:
  pgdata:
```

Notice that the `app` service drops all capabilities and adds none back. If your application runs on an unprivileged port and does not need any special system access, this is the ideal configuration.

## Verifying Your Configuration

After setting up capabilities, verify that they are applied correctly.

```bash
# Start the stack
docker compose up -d

# Check capabilities for a specific container
docker inspect --format='{{.HostConfig.CapAdd}}' myproject-app-1
docker inspect --format='{{.HostConfig.CapDrop}}' myproject-app-1

# Verify from inside the container
docker exec myproject-app-1 cat /proc/1/status | grep -i cap
```

## Combining with Other Security Features

Capability management works best alongside other Docker security features.

```yaml
# Hardened container with multiple security layers
services:
  secure-app:
    image: my-app:latest
    cap_drop:
      - ALL
    read_only: true
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
    user: "1000:1000"
```

The `no-new-privileges` security option prevents processes from gaining additional capabilities through setuid binaries or capability inheritance. Combined with `cap_drop: ALL`, this creates a very restricted execution environment.

## Common Mistakes

**Adding SYS_ADMIN instead of finding the right capability.** SYS_ADMIN is a catch-all that grants a huge range of privileges. Almost every time you think you need SYS_ADMIN, there is a more specific capability that will work.

**Forgetting to test after dropping capabilities.** Always run your full test suite with the restricted capability set. Some failures only appear under specific conditions.

**Not using cap_drop at all.** If your Compose file has no `cap_drop` directives, your containers are running with Docker's fairly permissive defaults. At minimum, drop the capabilities you know you do not need.

Taking the time to properly configure capabilities is one of the highest-impact security improvements you can make to your Docker deployment. Start with `cap_drop: ALL` and add back only what you need. Your security team will thank you.
