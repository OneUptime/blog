# How to Deploy Uptime Kuma for Status Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on deploy uptime kuma for status monitoring using Red Hat Enterprise Linux 9.

---

Deploying Uptime Kuma for Status Monitoring on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Container Tools

Install Podman and the related container tools:

```bash
sudo dnf install -y container-tools
sudo mkdir -p /etc/containers/systemd
sudo podman volume create uptime-kuma
```

## Step 2: Configure the Service

Create a Podman Quadlet service definition for Uptime Kuma:

```bash
sudo tee /etc/containers/systemd/uptime-kuma.container > /dev/null <<'EOF'
[Unit]
Description=Uptime Kuma status monitoring
After=network-online.target
Wants=network-online.target

[Container]
Image=docker.io/louislam/uptime-kuma:2
ContainerName=uptime-kuma
PublishPort=3001:3001
Volume=uptime-kuma:/app/data

[Service]
Restart=always
TimeoutStartSec=900

[Install]
WantedBy=multi-user.target
EOF
```

Adjust the port mapping and volume according to your requirements. Keep `/app/data` on local storage or a local Podman volume so SQLite can use POSIX file locks safely.

```bash
# Generate the systemd service from the Quadlet file
sudo systemctl daemon-reload
```

## Step 3: Start the Service

```bash
# Start the service
sudo systemctl start uptime-kuma.service

# Check the status
sudo systemctl status uptime-kuma.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status uptime-kuma.service

# Review recent logs
sudo journalctl -u uptime-kuma.service --no-pager -n 20
```

Uptime Kuma should be available at `http://localhost:3001`.

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u uptime-kuma.service -e --no-pager`.
- Ensure the container tools are installed: `rpm -qa | grep container-tools`.
- If the service is not generated after editing the Quadlet file, run `sudo systemctl daemon-reload` and check the generated unit with `systemctl status uptime-kuma.service`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
