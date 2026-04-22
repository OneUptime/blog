# How to Set Up Read-Only Containers in Portainer - Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Read-Only, Hardening, Container Security

Description: Configure containers to run with read-only root filesystems in Portainer for improved security posture, combined with targeted writable tmpfs mounts and volumes for necessary runtime files.

---

Running containers with a read-only root filesystem is a security best practice that prevents malware or exploited applications from modifying the container root filesystem. Portainer makes it easy to configure this in your stack definitions.

## Why Read-Only Containers?

A compromised container with a writable filesystem can:
- Install backdoors or persistence mechanisms
- Modify configuration files
- Write malicious executables to PATH directories

A read-only root filesystem limits the blast radius:
- No new files can be written to the image-backed root filesystem
- Configuration baked into the image cannot be tampered with directly
- Malware has fewer filesystem locations for persistence

## Enabling Read-Only in Portainer Stacks

Add `read_only: true` to any service:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    read_only: true      # Root filesystem is read-only
    tmpfs:
      # Provide writable in-memory directories for runtime needs
      - /tmp:size=64m
      - /run:size=32m
    volumes:
      # Persist data that must survive container restart
      - app-logs:/app/logs
      - app-uploads:/app/uploads
    restart: unless-stopped

volumes:
  app-logs:
  app-uploads:
```

## Common Writable Path Requirements

Most applications need some writable paths. Identify and provide them:

| Application Type | Needed Writable Paths |
|-----------------|----------------------|
| Web app (Node.js) | `/tmp`, `/app/logs`, possibly `/app/data` |
| Nginx | `/var/run`, `/var/log/nginx`, `/var/cache/nginx` |
| Python app | `/tmp`, `/app/logs` |
| Java app | `/tmp`, application log or heap dump directories |

Configure them as either `tmpfs` (ephemeral) or named volumes (persistent):

```yaml
services:
  nginx:
    image: nginx:stable-alpine
    read_only: true
    tmpfs:
      - /var/run            # PID files - ephemeral OK
      - /var/cache/nginx    # Cache - ephemeral OK
    volumes:
      - nginx-logs:/var/log/nginx  # Logs - persistent preferred

volumes:
  nginx-logs:
```

## Testing Read-Only Containers

After enabling `read_only`, test that the container works correctly:

```bash
CONTAINER=stack_webapp_1  # Replace with the actual container name or ID

# Try to write to the root filesystem (should fail)

docker exec "$CONTAINER" touch /test-file
# touch: /test-file: Read-only file system

# Verify writable tmpfs paths work
docker exec "$CONTAINER" touch /tmp/test-file
# Success (tmpfs is writable)

# Verify volume mounts work
docker exec "$CONTAINER" touch /app/logs/test.log
# Success (volume mount is writable)
```

## Combining with Other Security Settings

For maximum hardening, combine `read_only` with other security settings:

```yaml
services:
  secure-app:
    image: myapp:1.2.3
    read_only: true
    tmpfs:
      - /tmp
    # Drop all Linux capabilities
    cap_drop:
      - ALL
    # Add back only what's needed
    cap_add:
      - NET_BIND_SERVICE    # Only if app binds to port <1024
    # Prevent privilege escalation
    security_opt:
      - no-new-privileges:true
    # Run as non-root user
    user: "1000:1000"
```

## Kubernetes Equivalent

In Kubernetes manifests (deployed via Portainer):

```yaml
spec:
  containers:
    - name: app
      image: myapp:1.2.3
      securityContext:
        readOnlyRootFilesystem: true   # Equivalent to read_only: true
        runAsNonRoot: true
        runAsUser: 1000
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir:
        medium: Memory
```

## Troubleshooting Read-Only Issues

If an application fails to start with `read_only: true`:

1. Check container logs in Portainer for permission denied errors
2. Identify which paths the application needs to write to
3. Add those paths as tmpfs entries or volume mounts

```bash
# Run with strace, if it is installed in the image, to identify file writes (for debugging)
docker run --rm -it \
  --entrypoint strace \
  myapp:1.2.3 -f -e trace=%file ./app 2>&1 | grep -E "openat.*O_(WRONLY|RDWR)|creat|mkdir|rename|unlink|truncate"
```

## Summary

Read-only containers provide a meaningful security improvement with minimal configuration overhead. Enable `read_only: true` in Portainer stacks and add tmpfs entries for ephemeral runtime paths. Start with development environments to identify required writable paths, then roll the security setting out to production.
