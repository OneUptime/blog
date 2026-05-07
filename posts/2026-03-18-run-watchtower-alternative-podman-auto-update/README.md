# How to Run Watchtower Alternative with Podman Auto-Update

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Auto-Update, Watchtower, Container, Linux, DevOps, Automation, Systemd

Description: Learn how to use Podman's built-in auto-update feature as a native alternative to Watchtower for automatically keeping your containers up to date.

---

> Watchtower is a popular tool for auto-updating Docker containers, but Podman has this capability built in. No extra container is needed. Podman auto-update works natively with systemd to keep your containers current.

In the Docker ecosystem, Watchtower is the standard tool for automatically pulling new container images and restarting containers. Podman takes a different approach: instead of running a separate container to watch other containers, Podman includes a built-in `podman auto-update` command that checks for newer images and restarts containers when updates are available. Combined with systemd timers, this provides a native, lightweight, and secure auto-update mechanism with no additional containers required. This guide explains how to set it up.

---

## Why Not Just Run Watchtower on Podman?

While Watchtower technically can run on Podman, it was designed for Docker and relies on the Docker socket. Using it with Podman requires enabling the Podman socket and granting Watchtower privileged access to it. Podman's native auto-update approach is better because:

| Aspect | Watchtower on Podman | Podman Auto-Update |
|--------|---------------------|--------------------|
| Extra container needed | Yes | No |
| Socket access required | Yes (privileged) | No |
| Systemd integration | Manual | Built-in |
| Rollback support | No | Yes (with systemd) |
| Per-container control | Via labels | Via labels |
| Logging | Container logs | Systemd journal |

---

## Step 1: Understand How Podman Auto-Update Works

Podman auto-update follows this process:

1. It checks each container that has the `io.containers.autoupdate` label.
2. It compares the running image digest with the registry's latest digest.
3. If a newer image is available, it pulls the new image.
4. It restarts the container using its systemd service file with the new image.

There are two update policies:

- `registry` - Checks the remote registry for a newer version of the image tag.
- `local` - Updates the container if a newer local image exists (useful for CI/CD pipelines that push images locally).

---

## Step 2: Create a Container with the Auto-Update Label

When running any container you want to auto-update, add the `io.containers.autoupdate` label:

```bash
# Run an Nginx container with the auto-update label

podman run -d \
  --name nginx-web \
  -p 8080:80 \
  --label io.containers.autoupdate=registry \
  docker.io/library/nginx:latest
```

The label `io.containers.autoupdate=registry` tells Podman to check the remote registry for updates to this container's image.

You can apply this label to any container. Here is another example with a Redis container:

```bash
# Run Redis with auto-update enabled
podman run -d \
  --name redis-cache \
  -p 6379:6379 \
  --label io.containers.autoupdate=registry \
  -v redis-data:/data:Z \
  docker.io/library/redis:7-alpine
```

---

## Step 3: Create Systemd Service Files

Podman auto-update requires containers to be managed by systemd. You can create service files using Quadlet (recommended) or the legacy `podman generate systemd` command.

### Recommended Method (Quadlet)

Create Quadlet files in `~/.config/containers/systemd/` (rootless) or `/etc/containers/systemd/` (root).

For the Nginx container, create `nginx-web.container`:

```ini
[Unit]
Description=Nginx Web Container

[Container]
ContainerName=nginx-web
Image=docker.io/library/nginx:latest
PublishPort=8080:80
Label=io.containers.autoupdate=registry
AutoUpdate=registry

[Service]
Restart=always

[Install]
WantedBy=default.target
```

For the Redis container, create `redis-cache.container`:

```ini
[Unit]
Description=Redis Cache Container

[Container]
ContainerName=redis-cache
Image=docker.io/library/redis:7-alpine
PublishPort=6379:6379
Label=io.containers.autoupdate=registry
AutoUpdate=registry
Volume=redis-data:/data:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```

### Legacy Method (podman generate systemd)

> **Note:** `podman generate systemd` is deprecated in Podman 4.4 and later. Use Quadlet files instead.

```bash
# Generate a systemd service file for the Nginx container (deprecated)
podman generate systemd --name nginx-web --new --files

# Generate a systemd service file for the Redis container (deprecated)
podman generate systemd --name redis-cache --new --files
```

The `--new` flag is important: it tells systemd to create a fresh container from the image each time the service starts, which is how auto-update applies new images.

### Install the Service Files

For Quadlet root containers:

```bash
# Reload systemd so it generates services from the Quadlet files
sudo systemctl daemon-reload

# Enable the generated services so they start on boot
sudo systemctl enable nginx-web.service
sudo systemctl enable redis-cache.service
```

For Quadlet rootless containers:

```bash
# Reload the user systemd daemon so it generates services from the Quadlet files
systemctl --user daemon-reload

# Enable the generated services
systemctl --user enable nginx-web.service
systemctl --user enable redis-cache.service
```

If you used the legacy `podman generate systemd` method, install the generated `.service` files instead.

For generated root container services:

```bash
# Move the generated files to the systemd system directory
sudo mv container-nginx-web.service /etc/systemd/system/
sudo mv container-redis-cache.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the services so they start on boot
sudo systemctl enable container-nginx-web.service
sudo systemctl enable container-redis-cache.service
```

For generated rootless container services:

```bash
# Create the user systemd directory if it does not exist
mkdir -p ~/.config/systemd/user/

# Move the generated files
mv container-nginx-web.service ~/.config/systemd/user/
mv container-redis-cache.service ~/.config/systemd/user/

# Reload the user systemd daemon
systemctl --user daemon-reload

# Enable the services
systemctl --user enable container-nginx-web.service
systemctl --user enable container-redis-cache.service
```

### Stop the Original Containers and Start via Systemd

```bash
# Stop and remove the manually started containers
podman stop nginx-web redis-cache
podman rm nginx-web redis-cache

# Start them through systemd instead if you used Quadlet root services
sudo systemctl start nginx-web.service
sudo systemctl start redis-cache.service

# Or start them through systemd if you used Quadlet rootless services
systemctl --user start nginx-web.service
systemctl --user start redis-cache.service

# Or start them through systemd if you used generated legacy root services
sudo systemctl start container-nginx-web.service
sudo systemctl start container-redis-cache.service

# Or use the user manager for generated legacy rootless services
systemctl --user start container-nginx-web.service
systemctl --user start container-redis-cache.service
```

---

## Step 4: Test Auto-Update Manually

Before setting up a timer, verify that auto-update works:

```bash
# Check which containers have updates available (dry run)
podman auto-update --dry-run

# Example output:
# UNIT                           CONTAINER       IMAGE                           POLICY      UPDATED
# container-nginx-web.service    abc123def456    docker.io/library/nginx:latest  registry    false
# container-redis-cache.service  789ghi012jkl    docker.io/library/redis:7-alpine registry   false

# Run the actual update (pulls new images and restarts if needed)
podman auto-update

# For rootless containers, just run it as your user:
podman auto-update
```

The `--dry-run` flag checks for updates without applying them. This is useful for monitoring or testing.

---

## Step 5: Enable the Automatic Timer

Podman ships with a systemd timer that runs auto-update on a schedule:

### System-Level Timer (Root)

```bash
# Enable the podman auto-update timer
sudo systemctl enable podman-auto-update.timer
sudo systemctl start podman-auto-update.timer

# Verify the timer is active
sudo systemctl list-timers | grep podman

# Check the default schedule
sudo systemctl cat podman-auto-update.timer
```

### User-Level Timer (Rootless)

```bash
# Enable the user-level timer
systemctl --user enable podman-auto-update.timer
systemctl --user start podman-auto-update.timer

# Verify
systemctl --user list-timers | grep podman
```

The default schedule runs daily. To change the frequency, override the timer:

```bash
# Create an override for the timer to run every 6 hours
sudo systemctl edit podman-auto-update.timer
```

Add the following content:

```ini
# Override the default daily schedule to run every 6 hours
[Timer]
OnCalendar=
OnCalendar=*-*-* 00/6:00:00
RandomizedDelaySec=900
```

The empty `OnCalendar=` line clears the default schedule before setting the new one.

---

## Step 6: Monitor Auto-Update Activity

Check the journal for auto-update events:

```bash
# View auto-update logs from the systemd journal
sudo journalctl -u podman-auto-update.service --no-pager --since "24 hours ago"

# For rootless setups
journalctl --user -u podman-auto-update.service --no-pager --since "24 hours ago"

# Check the last time the timer ran
sudo systemctl status podman-auto-update.timer
```

---

## Step 7: Rollback a Failed Update

One advantage of the systemd integration is rollback capability. By default, `podman auto-update` rolls back to the previous image if restarting the systemd unit fails after an update:

```bash
# Check if a service failed after an update
sudo systemctl status nginx-web.service

# View the failure logs
sudo journalctl -u nginx-web.service --no-pager -n 50
```

For a manual rollback with Quadlet, pin the service to the previous image digest:

```ini
[Container]
Image=docker.io/library/nginx@sha256:<previous-digest>
```

Then reload systemd and restart the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx-web.service
```

---

## Step 8: Selective Auto-Update Policies

You do not have to auto-update every container. Use labels selectively:

```bash
# This container auto-updates from the registry
podman run -d --name app-frontend \
  --label io.containers.autoupdate=registry \
  docker.io/myorg/frontend:latest

# This container only updates when a new local image is available
# (useful when you build images locally via CI/CD)
podman run -d --name app-backend \
  --label io.containers.autoupdate=local \
  docker.io/myorg/backend:latest

# This container does NOT auto-update (no label)
podman run -d --name database \
  docker.io/library/postgres:15
```

---

## Complete Example: Auto-Updating a Media Stack

Here is a practical example of setting up auto-update for a complete media server stack using Quadlet files.

Create `~/.config/containers/systemd/jellyfin.container`:

```ini
[Unit]
Description=Jellyfin Media Server

[Container]
ContainerName=jellyfin
Image=docker.io/jellyfin/jellyfin:latest
PublishPort=8096:8096
Volume=%h/jellyfin/config:/config:Z
AutoUpdate=registry

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Create `~/.config/containers/systemd/sonarr.container`:

```ini
[Unit]
Description=Sonarr TV Manager

[Container]
ContainerName=sonarr
Image=docker.io/linuxserver/sonarr:latest
PublishPort=8989:8989
Volume=%h/sonarr/config:/config:Z
AutoUpdate=registry

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Then enable everything:

```bash
# Reload systemd to pick up the Quadlet files
systemctl --user daemon-reload

# Enable and start the containers
systemctl --user enable jellyfin.service sonarr.service
systemctl --user start jellyfin.service sonarr.service

# Enable the auto-update timer
systemctl --user enable podman-auto-update.timer
systemctl --user start podman-auto-update.timer
```

---

## Conclusion

Podman's built-in auto-update mechanism is a native, secure alternative to Watchtower that requires no additional container. By labeling containers with `io.containers.autoupdate=registry` and managing them through systemd, you get automatic image pulls, container restarts, and journal-based logging. The systemd timer controls the schedule, and the `--dry-run` flag lets you check for updates without applying them. For anyone running containers on Podman, this is the recommended approach to keeping images up to date.
