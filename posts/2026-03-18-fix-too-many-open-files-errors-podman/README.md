# How to Fix 'too many open files' Errors in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Linux, Troubleshooting, DevOps

Description: Learn how to diagnose and fix 'too many open files' errors in Podman containers by adjusting ulimits, tuning kernel parameters, and configuring container runtime settings.

---

> The "too many open files" error in Podman occurs when a container process exceeds the maximum number of file descriptors allowed. This guide walks through every layer of the fix, from container-level ulimits to host kernel parameters.

If you run containerized applications with Podman, you have likely encountered the dreaded "too many open files" error at some point. This error surfaces when a process inside a container tries to open more file descriptors than the operating system allows. Database servers, web servers handling many concurrent connections, and applications that open large numbers of log files are especially prone to this issue.

Understanding why this happens and how to fix it at every level will save you hours of debugging in production.

---

## Understanding File Descriptor Limits

Every process on a Linux system has a limit on the number of file descriptors it can hold open simultaneously. File descriptors represent open files, sockets, pipes, and other I/O resources. There are two limits that matter:

- **Soft limit**: The current effective limit for a process. A process can raise this up to the hard limit.
- **Hard limit**: The maximum value the soft limit can be raised to without root privileges.

You can check the current limits on your host with:

```bash
ulimit -n       # soft limit
ulimit -Hn      # hard limit
```

A typical default soft limit is 1024, which is far too low for many server applications.

## Why Podman Containers Hit This Limit

When Podman launches a container, it uses ulimit values from Podman's defaults, from `containers.conf`, or from values you pass on the command line. For `nofile`, current Podman defaults to 1048576 when it is not otherwise configured, but in rootless mode that value is capped by the invoking user's hard limit. If your user's hard limit is low, rootless containers cannot raise `nofile` above it.

The error typically looks like this in container logs:

```text
Error: too many open files
accept4: too many open files
socket: too many open files
```

## Fix 1: Set Ulimits at Container Runtime

The most direct fix is to pass the `--ulimit` flag when running your container:

```bash
podman run --ulimit nofile=65535:65535 my-application:latest
```

This sets both the soft and hard limits to 65535. You can also set them independently:

```bash
podman run --ulimit nofile=4096:65535 my-application:latest
```

Here the soft limit is 4096 and the hard limit is 65535. To verify the limits inside a running container:

```bash
podman exec my-container cat /proc/1/limits | grep "open files"
```

## Fix 2: Configure Default Ulimits in containers.conf

If you want every container to have higher limits without specifying them on every `podman run` command, edit the Podman configuration file.

For rootless Podman, edit `~/.config/containers/containers.conf`. For rootful Podman, edit `/etc/containers/containers.conf`:

```toml
[containers]
default_ulimits = [
  "nofile=65535:65535",
]
```

After saving this file, all new containers will use these defaults automatically. You do not need to restart any daemon since Podman is daemonless.

## Fix 3: Increase Host-Level Limits

If the host itself has low limits, container limits can still fail. First, check the system-wide file handle limit:

```bash
cat /proc/sys/fs/file-max
```

If this value is too low, increase it:

```bash
sudo sysctl -w fs.file-max=2097152
```

To make it persistent across reboots, add it to `/etc/sysctl.conf` or a file in `/etc/sysctl.d/`:

```bash
echo "fs.file-max = 2097152" | sudo tee /etc/sysctl.d/99-file-max.conf
sudo sysctl --system
```

For per-process `nofile` values above 1048576, also check the kernel ceiling:

```bash
cat /proc/sys/fs/nr_open
```

If your requested hard limit is higher than `fs.nr_open`, raise `fs.nr_open` as well:

```bash
echo "fs.nr_open = 2097152" | sudo tee /etc/sysctl.d/99-nr-open.conf
sudo sysctl --system
```

## Fix 4: Adjust User-Level Limits for Rootless Podman

For rootless Podman, you also need to ensure your user account has adequate limits. Edit `/etc/security/limits.conf`:

```ini
your-username  soft  nofile  65535
your-username  hard  nofile  65535
```

Alternatively, create a file in `/etc/security/limits.d/`:

```bash
echo "your-username soft nofile 65535" | sudo tee /etc/security/limits.d/99-nofile.conf
echo "your-username hard nofile 65535" | sudo tee -a /etc/security/limits.d/99-nofile.conf
```

You will need to log out and log back in for these changes to take effect. Verify with:

```bash
ulimit -n
```

## Fix 5: Adjust Limits for systemd-Managed Services

If Podman containers are managed by systemd, you need to set limits in the service unit file as well. In your systemd unit file, add:

```ini
[Service]
LimitNOFILE=65535
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart my-container.service
```

For user-level systemd services (rootless Podman), you can also set a default for all user services:

```bash
mkdir -p ~/.config/systemd/user.conf.d/
cat > ~/.config/systemd/user.conf.d/limits.conf << EOF
[Manager]
DefaultLimitNOFILE=65535
EOF
systemctl --user daemon-reload
```

## Fix 6: Set Limits in Podman Compose

If you use `podman-compose` or a Compose file, specify ulimits in your `docker-compose.yml`:

```yaml
services:
  my-app:
    image: my-application:latest
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

## Diagnosing the Problem

Before applying fixes, it helps to know exactly what is happening. Check how many file descriptors a container process is using:

```bash
# Find the container's PID

podman inspect --format '{{.State.Pid}}' my-container

# Count open file descriptors for that PID
ls /proc/<PID>/fd | wc -l

# See the current limits
cat /proc/<PID>/limits | grep "open files"
```

If the count is close to the limit, you have confirmed the issue. If the count is low but you still see errors, the problem might be in a child process. Check all processes in the container:

```bash
podman top my-container pid args
```

Then inspect each PID's file descriptor count.

## Choosing the Right Limit Value

Setting the limit to a high value like 1048576 is generally safe for modern applications that use `poll`, `epoll`, or similar APIs. The kernel allocates file descriptor structures on demand, so a high limit does not consume memory by itself. However, a runaway process could exhaust system resources if limits are set too high, and older applications that use `select(2)` can have problems with file descriptors above 1023. A value of 65535 is a reasonable default for most applications. Database servers and high-traffic web servers may need higher values.

## Conclusion

The "too many open files" error in Podman is a straightforward problem with solutions at multiple levels. Start by setting `--ulimit nofile=65535:65535` on your container run command for an immediate fix. For a permanent solution, configure `containers.conf`, raise host-level limits with `sysctl`, and adjust user limits in `/etc/security/limits.conf`. When using systemd to manage containers, remember to set `LimitNOFILE` in the unit file as well. With these changes in place, your containerized applications will have the file descriptor headroom they need to run reliably.
