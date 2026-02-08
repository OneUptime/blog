# How to Use Docker Compose with sysctls and Kernel Parameters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, sysctls, Kernel Parameters, Networking, Performance, DevOps, Docker

Description: Configure kernel parameters inside Docker containers using sysctls for network tuning, performance, and security hardening.

---

Linux kernel parameters (sysctls) control everything from network buffer sizes to the maximum number of open files. By default, Docker containers inherit some sysctl values from the host but cannot change them. Docker Compose lets you set specific sysctl values per container, which is essential for tuning high-performance network services, databases, and any application that needs non-default kernel behavior.

## Basic sysctl Configuration

Set sysctls in Docker Compose using the `sysctls` key:

```yaml
# docker-compose.yml - basic sysctl configuration
version: "3.8"

services:
  web:
    image: nginx:alpine
    sysctls:
      - net.core.somaxconn=65535
      - net.ipv4.tcp_syncookies=1
    ports:
      - "80:80"
```

You can also use the map syntax:

```yaml
services:
  web:
    image: nginx:alpine
    sysctls:
      net.core.somaxconn: 65535
      net.ipv4.tcp_syncookies: 1
```

Both formats are equivalent. The list syntax is more common in practice.

## Which sysctls Can You Set?

Docker allows setting sysctls that are namespaced, meaning they only affect the container, not the host. The main categories are:

**Network sysctls (net.*)** - These are the most commonly used:

```yaml
sysctls:
  # TCP/IP tuning
  - net.core.somaxconn=65535          # Maximum socket listen backlog
  - net.ipv4.tcp_syncookies=1          # Enable SYN cookie protection
  - net.ipv4.tcp_max_syn_backlog=65535 # Maximum SYN queue length
  - net.ipv4.ip_local_port_range=1024 65535  # Ephemeral port range
  - net.ipv4.tcp_tw_reuse=1           # Reuse TIME_WAIT sockets
  - net.ipv4.tcp_fin_timeout=15        # Reduce FIN_WAIT timeout
```

**IPC sysctls (kernel.shm*, kernel.msg*, kernel.sem)** - Used by databases:

```yaml
sysctls:
  - kernel.shmmax=1073741824     # Max shared memory segment (1GB)
  - kernel.shmall=4194304        # Total shared memory pages
  - kernel.sem=250 256000 32 1024  # Semaphore limits
```

Non-namespaced sysctls (like `vm.*` and most `kernel.*`) cannot be set inside a container without running in privileged mode.

## Tuning a High-Performance Web Server

For nginx or any web server handling thousands of concurrent connections:

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    sysctls:
      # Accept up to 65535 connections in the listen backlog
      - net.core.somaxconn=65535

      # Increase the SYN backlog for high connection rates
      - net.ipv4.tcp_max_syn_backlog=65535

      # Enable SYN cookies to handle SYN flood attacks
      - net.ipv4.tcp_syncookies=1

      # Reuse TIME_WAIT connections for new requests
      - net.ipv4.tcp_tw_reuse=1

      # Reduce TIME_WAIT timeout from 60s to 15s
      - net.ipv4.tcp_fin_timeout=15

      # Widen the ephemeral port range
      - net.ipv4.ip_local_port_range=1024 65535

      # Increase maximum receive buffer size
      - net.core.rmem_max=16777216

      # Increase maximum send buffer size
      - net.core.wmem_max=16777216
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

Make sure your nginx.conf matches these kernel settings:

```nginx
# nginx.conf - settings that match the sysctl tuning
events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    # Backlog matches somaxconn
    server {
        listen 80 backlog=65535;
    }
}
```

## Tuning a Database Server

PostgreSQL and MySQL benefit from specific sysctl settings:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16
    sysctls:
      # Shared memory - required for PostgreSQL large shared_buffers
      - kernel.shmmax=2147483648      # 2GB max shared memory segment
      - kernel.shmall=524288          # Total shared memory in pages

      # Semaphores - PostgreSQL uses semaphores for process synchronization
      - kernel.sem=250 256000 32 1024

      # Network tuning for connection handling
      - net.core.somaxconn=1024
      - net.ipv4.tcp_keepalive_time=600
      - net.ipv4.tcp_keepalive_intvl=30
      - net.ipv4.tcp_keepalive_probes=10
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 4G

volumes:
  pgdata:
```

For Redis with high connection counts:

```yaml
services:
  redis:
    image: redis:7-alpine
    sysctls:
      # Redis warns if this is lower than tcp-backlog setting
      - net.core.somaxconn=65535

      # Enable memory overcommit (Redis fork for background saves)
      # Note: This requires privileged mode as it is not namespaced
      # - vm.overcommit_memory=1    # Must set on host instead
    command: redis-server --tcp-backlog 65535 --maxmemory 2gb
```

The `vm.overcommit_memory` sysctl is not namespaced, so you must set it on the host:

```bash
# Set on the host for Redis background saves
sudo sysctl vm.overcommit_memory=1
echo "vm.overcommit_memory=1" | sudo tee -a /etc/sysctl.d/99-redis.conf
```

## Network Security Hardening

Use sysctls to harden container networking:

```yaml
version: "3.8"

services:
  secure-app:
    image: myapp:latest
    sysctls:
      # Prevent IP spoofing
      - net.ipv4.conf.all.rp_filter=1

      # Ignore ICMP broadcasts (smurf attack prevention)
      - net.ipv4.icmp_echo_ignore_broadcasts=1

      # Enable SYN cookies
      - net.ipv4.tcp_syncookies=1

      # Disable IP source routing
      - net.ipv4.conf.all.accept_source_route=0

      # Log suspicious packets
      - net.ipv4.conf.all.log_martians=1

      # Disable ICMP redirects
      - net.ipv4.conf.all.accept_redirects=0
      - net.ipv4.conf.all.send_redirects=0
```

## Proxy and Load Balancer Tuning

For HAProxy, Envoy, or any proxy handling many upstream connections:

```yaml
version: "3.8"

services:
  haproxy:
    image: haproxy:2.9-alpine
    ports:
      - "80:80"
      - "443:443"
    sysctls:
      # Large connection backlog
      - net.core.somaxconn=65535
      - net.ipv4.tcp_max_syn_backlog=65535

      # Wide ephemeral port range for upstream connections
      - net.ipv4.ip_local_port_range=1024 65535

      # Reuse TIME_WAIT connections to backends
      - net.ipv4.tcp_tw_reuse=1
      - net.ipv4.tcp_fin_timeout=10

      # Larger socket buffers for high throughput
      - net.core.rmem_max=16777216
      - net.core.wmem_max=16777216
      - net.ipv4.tcp_rmem=4096 87380 16777216
      - net.ipv4.tcp_wmem=4096 87380 16777216

      # Allow more connections in the netfilter tracking table
      - net.netfilter.nf_conntrack_max=262144
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
```

Note: `net.netfilter.nf_conntrack_max` requires the container to have the `NET_ADMIN` capability:

```yaml
services:
  haproxy:
    cap_add:
      - NET_ADMIN
    sysctls:
      - net.netfilter.nf_conntrack_max=262144
```

## IPv6 Configuration

Control IPv6 behavior per container:

```yaml
services:
  app:
    image: myapp:latest
    sysctls:
      # Disable IPv6 if not needed
      - net.ipv6.conf.all.disable_ipv6=1

  dual-stack-app:
    image: myapp:latest
    sysctls:
      # Enable IPv6 with privacy extensions
      - net.ipv6.conf.all.disable_ipv6=0
      - net.ipv6.conf.all.use_tempaddr=2
```

## Verifying sysctl Values

Check that your sysctl settings are applied:

```bash
# Read a specific sysctl value inside a running container
docker compose exec web sysctl net.core.somaxconn

# Read all network sysctls
docker compose exec web sysctl -a 2>/dev/null | grep net.core

# Compare container values to host values
echo "Host:" && sysctl net.core.somaxconn
echo "Container:" && docker compose exec web sysctl net.core.somaxconn
```

## Sysctls with Docker Run

For standalone containers, use the `--sysctl` flag:

```bash
# Set sysctls when running a container directly
docker run --rm --sysctl net.core.somaxconn=65535 --sysctl net.ipv4.tcp_syncookies=1 nginx:alpine sysctl net.core.somaxconn
```

## Privileged Mode for Non-Namespaced sysctls

Some sysctls cannot be set inside a container because they affect the entire host. If you absolutely must set these, you need privileged mode:

```yaml
services:
  tuner:
    image: alpine
    privileged: true
    # WARNING: This affects the HOST, not just the container
    command: >
      sh -c "
        sysctl -w vm.overcommit_memory=1
        sysctl -w vm.swappiness=10
        sysctl -w fs.file-max=2097152
      "
```

This is a security risk because a privileged container can modify any host setting. Prefer setting non-namespaced sysctls directly on the host through `/etc/sysctl.d/` configuration files.

## Troubleshooting

**Error: "sysctl is not in a separate kernel namespace":** You are trying to set a non-namespaced sysctl. Either set it on the host or use privileged mode.

**Error: "invalid argument":** The value format is wrong. Some sysctls expect space-separated values (like `ip_local_port_range`), not comma-separated.

**Values reset after container restart:** This is expected. Sysctls are applied each time the container starts. They are not persisted between restarts. Your compose file is the source of truth.

## Summary

Docker Compose sysctls let you tune kernel parameters per container without affecting the host or other containers. Focus on network sysctls for web servers and proxies, shared memory sysctls for databases, and security sysctls for hardening. Always verify your settings are applied with `sysctl -a` inside the container. For non-namespaced parameters like `vm.*` settings, configure them on the host rather than trying to work around Docker's restrictions.
