# How to Set Up Auto-Remove for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Auto-Remove, Cleanup, Container

Description: Configure containers in Portainer to automatically remove themselves after they stop for cleaner container lifecycle management.

---

Portainer lets you expose Docker's auto-remove behavior through the container creation form, so short-lived containers can clean themselves up after they stop.

## Accessing the Container Form

When creating a container in Portainer:
1. Navigate to **Containers > Add container**
2. Fill in basic settings such as the image and container name
3. In the **Actions** section, toggle **Auto remove** on
4. Click **Deploy the container**

This setting tells Portainer to remove the container automatically once it exits, which is useful for one-off runs.

## Equivalent Docker Command

```bash
# Run a one-off container and remove it automatically when it exits
docker run --rm --name temp-job busybox echo "done"
```

In Docker CLI, Portainer's **Auto remove** option maps to `docker run --rm`.

## When to Use Auto-Remove

Use auto-remove for short-lived containers such as ad hoc jobs, test runs, or temporary utilities. Avoid it when you need to inspect the stopped container afterward, because Docker removes the container when it exits.

## Volume Behavior

```bash
# Anonymous volumes are removed with the container, named volumes are kept
docker run --rm \
  -v /foo \
  -v app-data:/data \
  --name temp-job \
  busybox true
```

With `--rm`, Docker also removes anonymous volumes. Named volumes, such as `app-data:/data`, are not removed automatically.

## Restart Policy Caveat

Auto-remove should not be combined with a restart policy. Docker treats `--rm` and `--restart` as incompatible options, so leave the restart policy at **Never** when enabling auto-remove.

---

*Monitor container resource usage and performance with [OneUptime](https://oneuptime.com).*
