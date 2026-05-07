# How to Fix 'permission denied' Errors in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Linux, Permission, Troubleshooting

Description: A comprehensive guide to diagnosing and resolving 'permission denied' errors in Podman, covering rootless mode, file ownership, volume mounts, and user namespace mapping.

---

> Running into "permission denied" when working with Podman containers is one of the most common and frustrating issues, especially in rootless mode. This guide walks through every major cause and its fix.

If you have spent any time working with Podman, you have almost certainly encountered a "permission denied" error at some point. These errors can appear when pulling images, mounting volumes, running containers, or accessing files inside a container. The root cause is almost always related to how Linux handles file ownership, user namespaces, or security contexts. Because Podman is designed to run without a daemon and often without root privileges, permission issues are more visible than they are with Docker.

This guide covers the most common scenarios that produce permission denied errors and provides concrete solutions for each.

---

## Understanding Rootless Podman and User Namespaces

Podman's rootless mode creates a user namespace using your host user ID and the subordinate UID/GID ranges assigned to that user. When you run a container as a regular user, Podman uses entries in `/etc/subuid` and `/etc/subgid` to create that namespace. Inside the container, processes may run as root (UID 0), but by default that container root maps to your unprivileged user on the host, while other container UIDs map into your subordinate UID range.

This mapping is what causes most permission denied errors. A file owned by root on the host cannot be written to by your mapped user inside the container, and vice versa.

Check your current subordinate UID and GID mappings:

```bash
cat /etc/subuid
cat /etc/subgid
```

You should see an entry like:

```text
youruser:100000:65536
```

If your user is missing from these files, Podman cannot create proper user namespaces. Add an entry:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 youruser
```

After modifying these files, reset Podman's namespace configuration:

```bash
podman system migrate
```

## Permission Denied When Mounting Host Volumes

The most frequent permission denied error occurs when you mount a host directory into a container. The container process runs as a different UID than the host user who owns the directory.

For example, this command often fails:

```bash
podman run -v /home/user/data:/data:rw myimage
```

The container process might run as UID 0 inside the container, which maps to your host UID (e.g., 1000). But if the files in `/home/user/data` are owned by root or have restrictive permissions, the mapped user cannot access them.

### Solution 1: Use the :Z or :z Volume Option

On systems with SELinux enabled, you need to relabel the volume. The `:Z` flag applies a private SELinux label, while `:z` applies a shared label:

```bash
podman run -v /home/user/data:/data:Z myimage
```

### Solution 2: Match the Container User to the Host User

Run the container with the same UID as the host user who owns the files:

```bash
podman run --user $(id -u):$(id -g) -v /home/user/data:/data myimage
```

### Solution 3: Use the --userns=keep-id Flag

This flag maps your host UID to the same UID inside the container, preserving file ownership:

```bash
podman run --userns=keep-id -v /home/user/data:/data myimage
```

This is often the cleanest solution for development workflows where you want to edit files both inside and outside the container.

## Permission Denied When Pulling Images

If you get a permission denied error when pulling images, the storage directory may have incorrect ownership. In rootless mode, Podman stores images under `$HOME/.local/share/containers/storage/`.

Check ownership:

```bash
ls -la ~/.local/share/containers/storage/
```

If files are owned by root (perhaps from a previous `sudo podman` run), reset the host ownership:

```bash
sudo chown -R $(id -u):$(id -g) ~/.local/share/containers/
```

Or reset Podman's storage entirely and start fresh. This removes all containers, pods, images, networks, volumes, build cache, and machines for that user:

```bash
podman system reset
```

## Permission Denied on /tmp or Runtime Directories

Podman needs access to runtime directories like `/run/user/<UID>`. If this directory does not exist or has wrong permissions, you will see permission errors on container startup.

Verify the directory exists:

```bash
ls -la /run/user/$(id -u)
```

If it is missing, it usually means you are not logged in through a proper systemd user session (e.g., you are using `su` instead of `ssh` or a direct login). The `XDG_RUNTIME_DIR` environment variable should point to that session directory:

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
```

For `su` or misconfigured `sudo` sessions, start a real user session with `machinectl shell username@`, `ssh username@localhost`, or `systemd-run --machine=username@ --user ...` before running Podman.

## Permission Denied Inside the Container

Sometimes the error is not about host-to-container mapping but about file permissions inside the container image itself. A Dockerfile that creates files as root and then switches to a non-root user can cause this.

Inspect the file ownership inside the container:

```bash
podman run --rm myimage ls -la /app
```

Fix it in the Dockerfile by ensuring the application user owns the necessary files:

```dockerfile
FROM node:18
RUN useradd -m appuser
WORKDIR /app
COPY --chown=appuser:appuser . .
USER appuser
CMD ["node", "server.js"]
```

## Permission Denied with Podman Socket

If you are using the Podman socket for API access and encounter permission denied errors:

```bash
# Start the socket for your user

systemctl --user enable --now podman.socket

# Verify the socket path
ls -la /run/user/$(id -u)/podman/podman.sock
```

Set the `DOCKER_HOST` environment variable to point to your user socket:

```bash
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
```

## Permission Denied with Bind Mounts for Named Volumes

Named volumes in rootless Podman are stored under `~/.local/share/containers/storage/volumes/`. If you create a volume and then cannot write to it from inside a container, use `podman unshare` to adjust permissions:

```bash
podman volume create mydata
podman unshare chown -R 1000:1000 $(podman volume inspect mydata --format '{{.Mountpoint}}')
```

The `podman unshare` command runs a command inside the user namespace that Podman uses, so UID 1000 inside that namespace maps correctly.

## Debugging Permission Issues

When you are not sure what is causing the permission denied error, these commands help narrow it down.

Check the full error output with increased verbosity:

```bash
podman --log-level=debug run -v /home/user/data:/data myimage
```

Inspect the user namespace mapping for a running container:

```bash
podman top <container-id> huser user
```

Check the effective UID inside the container:

```bash
podman run --rm myimage id
```

Check for SELinux denials:

```bash
sudo ausearch -m avc -ts recent
```

## Conclusion

Permission denied errors in Podman almost always come down to three things: user namespace UID mapping, file ownership mismatches between host and container, or SELinux labeling. The `--userns=keep-id` flag solves most development workflow issues. For production, proper Dockerfile design with correct file ownership is the best approach. When in doubt, use `podman unshare` to inspect and modify files from the perspective of the container's user namespace, and check `podman --log-level=debug` output to see exactly where the permission check fails.
