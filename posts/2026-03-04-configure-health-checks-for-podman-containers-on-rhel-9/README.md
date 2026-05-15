# How to Configure Health Checks for Podman Containers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Container, Linux

Description: Step-by-step guide on configure health checks for podman containers using Red Hat Enterprise Linux 9.

---

Health checks let Podman monitor the state of running containers and mark them as healthy or unhealthy. Podman can also take recovery action when a container becomes unhealthy if you configure `--health-on-failure`. This is essential for production container deployments where you need automatic detection of application failures.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Podman installed with the `container-tools` package

## Step 1: Create a Container with a Health Check

Create a test web container and define the health check command:

```bash
podman run -dt \
  --name hc-container \
  -p 8080:8080 \
  --health-cmd='curl http://localhost:8080 || exit 1' \
  --health-interval=30s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=10s \
  registry.access.redhat.com/ubi9/httpd-24
```

The `--health-cmd` option runs the command inside the container. A zero exit code marks the container as healthy, and a non-zero exit code counts as a failed health check.

## Step 2: Configure Container Recovery

If you want Podman to take action after the container becomes unhealthy, configure the `--health-on-failure` option when creating the container:

```bash
podman run -dt \
  --name hc-container-restart \
  -p 8081:8080 \
  --health-cmd='curl http://localhost:8080 || exit 1' \
  --health-interval=30s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=10s \
  --health-on-failure=restart \
  registry.access.redhat.com/ubi9/httpd-24
```

The supported recovery actions are `none`, `kill`, `restart`, and `stop`. The default action is `none`.

## Step 3: Check the Health Status

```bash
# Check the health status with inspect
podman inspect --format='{{json .State.Health.Status}}' hc-container

# Check the status in the container list
podman ps

# Run the health check manually
podman healthcheck run hc-container
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Verify Podman is working
podman info

# Verify the web server responds on the host
curl http://localhost:8080

# View recent health check events
podman events --since 10m --stream=false --filter container=hc-container
```

## Troubleshooting

- If the container fails to start, check the container logs with `podman logs hc-container`.
- Ensure the required package is installed: `rpm -q container-tools`.
- Health check commands run inside the container, so make sure tools such as `curl` are available in the container image.
- Use `podman inspect hc-container` to review the full health check configuration and status.

## Conclusion

You have successfully configured health checks for Podman containers on RHEL. Remember to monitor the container status and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
