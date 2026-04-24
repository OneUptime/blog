# How to Manage Podman Containers from Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Container Management, Docker-Compatible API, Linux

Description: Learn how to use Portainer to start, stop, inspect, and manage Podman containers through the Docker-compatible API, with notes on Podman-specific behaviors.

---

Once Portainer is connected to a supported Podman environment, you can manage Podman containers through the familiar Portainer UI. Most container operations work similarly to Docker through Podman's Docker-compatible API, with a few differences to be aware of.

## Container Operations via Portainer

After connecting Portainer to the Podman socket, the standard container operations work:

| Operation | Portainer UI | Works with Podman? |
|---|---|---|
| Start/Stop/Restart | Containers list | Yes |
| View Logs | Container > Logs tab | Yes |
| Execute command | Container > Console tab | Yes |
| Inspect container | Container > Inspect tab | Yes |
| View stats | Container > Stats tab | Yes (limited) |
| Pull images | Images > Pull | Yes |

## Starting a Container via Portainer

1. Go to **Containers > Add Container**.
2. Set the image (pulled from a registry or local).
3. Configure ports, volumes, and environment variables.
4. Click **Deploy the container**.

Portainer sends a Docker-compatible API call to Podman, which creates and starts the container.

## Viewing Container Logs

```bash
# Equivalent Podman command for what Portainer does:

podman logs <container-name>

# Portainer retrieves logs through Podman's Docker-compatible API.
# Enable auto refresh in Portainer to keep the log view updated.
```

## Exec into a Container

In Portainer go to **Containers > [container] > Console**, select the command and user, then click **Connect**.

Portainer opens an interactive console session for the container. In practice this is similar to `podman exec -it <container> /bin/sh` when `/bin/sh` is available; Alpine-based images typically need `/bin/ash`.

## Known Differences from Docker

**Rootless containers:** Portainer with rootless Podman may work, but it is not officially supported.

**Pods:** Because Portainer uses Podman's Docker-compatible container API, Podman pods are not exposed as a first-class object in Portainer. Each container in a pod appears as a separate item.

**cgroups v2:** Podman stats rely on cgroup information. In rootless environments, stats do not work on cgroups v1, and on cgroups v2 network usage is still unavailable.

## Updating Containers

In Portainer, recreate the container to pull a newer image:

1. Go to the container.
2. Click **Duplicate/Edit**.
3. Check **Always pull the image**.
4. Click **Deploy the container**.

Portainer will pull the updated image via Podman's pull API and recreate the container.
