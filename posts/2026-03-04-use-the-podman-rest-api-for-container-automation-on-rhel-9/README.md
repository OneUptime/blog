# How to Use the Podman REST API for Container Automation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Container, Linux

Description: Step-by-step guide on use the podman rest api for container automation using Red Hat Enterprise Linux 9.

---

The Podman REST API provides a Docker-compatible API endpoint for container management. This enables integration with existing Docker tooling and automation scripts while maintaining Podman's daemonless architecture.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Podman installed (usually included in RHEL by default)

## Step 2: Configure the Service

Podman provides systemd socket units for the API service. The rootful socket listens at `/run/podman/podman.sock`, and the rootless socket listens at `$XDG_RUNTIME_DIR/podman/podman.sock`.

```bash
# Optional: adjust the API service inactivity timeout
sudo vi /etc/containers/containers.conf
```

Add or update the `service_timeout` value under the `[engine]` section if you need a timeout other than the default:

```toml
[engine]
service_timeout=0
```

The value `0` disables the inactivity timeout. Access to the default Unix socket is controlled by normal filesystem permissions; avoid exposing the API on a TCP socket unless you also configure mutual TLS.

```bash
# Restart the service to apply changes
sudo systemctl restart podman.socket
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable podman.socket

# Start the service
sudo systemctl start podman.socket

# Check the status
sudo systemctl status podman.socket
```

For a rootless user, use the user systemd unit instead:

```bash
systemctl --user enable --now podman.socket
systemctl --user status podman.socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Verify the rootful API socket
curl --unix-socket /run/podman/podman.sock http://d/v1.0.0/libpod/info

# Run a test container
podman run --rm docker.io/library/alpine echo "Hello from Podman"
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u podman.socket -u podman.service -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'podman|podman-remote'`.
- For container issues, check container logs with `podman logs <container-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
