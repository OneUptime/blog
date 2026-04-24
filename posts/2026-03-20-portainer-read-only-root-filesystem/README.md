# How to Run Portainer with Read-Only Root Filesystem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Read-Only Filesystem, Container Hardening, Docker Security

Description: Learn how to run Docker containers with a read-only root filesystem via Portainer to prevent malicious writes and reduce the attack surface.

---

Running containers with a read-only root filesystem prevents any process inside the container from writing to the container's writable layer - including malware, accidental config overwrites, and exploitation payloads. Docker Compose supports this with `read_only`, and Portainer stacks let you apply the same setting in the web editor.

## Enabling Read-Only Root Filesystem in a Stack

Set `read_only: true` in your Compose service definition:

```yaml
services:
  api:
    image: my-api:latest
    read_only: true
    volumes:
      - api_data:/app/data
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 64m
      - type: tmpfs
        target: /run
        tmpfs:
          size: 10m
    environment:
      NODE_ENV: production

volumes:
  api_data:
```

The `tmpfs` mounts provide writable scratch space for temporary files while keeping the image filesystem read-only.

## Enabling via Portainer UI

For Portainer stacks, use **Stacks > Add stack** and add `read_only: true` to the Compose service definition in the web editor.

If you need tmpfs mounts through the Portainer UI, create a tmpfs-backed volume under **Volumes > Add volume** using driver options `type=tmpfs`, `device=tmpfs`, and `o=size=...`, then attach it to the container under **Volumes**.

## Testing Which Paths Fail

Before enabling read-only mode, identify the paths the container changes in its writable layer:

```bash
# Start the container normally
docker run -d --name my-api-test my-api:latest

# Exercise the application, then inspect filesystem changes
docker container diff my-api-test | head -50

# Clean up when finished
docker rm -f my-api-test
```

## Common Application Requirements

| Application | Common Writable Paths to Check |
|-------------|-------------------------|
| Node.js | `/tmp`, plus framework-specific cache paths such as `/app/node_modules/.cache` |
| Python | `/tmp`, plus directories where Python writes `__pycache__` files unless bytecode generation is disabled |
| Nginx | `/var/cache/nginx`, `/var/run` |
| PHP-FPM | `/var/run`, `/tmp` |
| Java | `/tmp` |

## Nginx with Read-Only Filesystem

The default Nginx configuration requires writable `/var/cache/nginx` and `/var/run`. Configure tmpfs for each:

```yaml
services:
  nginx:
    image: nginx:alpine
    read_only: true
    volumes:
      - type: tmpfs
        target: /var/cache/nginx
        tmpfs:
          size: 64m
      - type: tmpfs
        target: /var/run
        tmpfs:
          size: 10m
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./html:/usr/share/nginx/html:ro
```

## Verifying Read-Only Enforcement

Confirm the filesystem is read-only:

```bash
# Try writing to the root filesystem - should fail
docker exec -it $(docker ps -qf name=api) \
  sh -c "echo test > /test.txt && echo 'FAIL: writable' || echo 'PASS: read-only'"

# Try writing to tmpfs - should succeed
docker exec -it $(docker ps -qf name=api) \
  sh -c "echo test > /tmp/test.txt && echo 'PASS: tmpfs writable' || echo 'FAIL'"
```

## Read-Only for Portainer Itself

Portainer stores its state in `/data`, so keep that path writable:

```bash
docker run -d \
  --name portainer \
  --read-only \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```
