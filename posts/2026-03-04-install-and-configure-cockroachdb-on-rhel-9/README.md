# How to Install and Configure CockroachDB on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Database, Linux

Description: Step-by-step guide on install and configure cockroachdb using Red Hat Enterprise Linux 9.

---

CockroachDB can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the required tools
sudo dnf install -y curl tar gzip

# Download and install CockroachDB
curl -LO https://binaries.cockroachdb.com/cockroach-v26.2.0.linux-amd64.tgz
tar -xzf cockroach-v26.2.0.linux-amd64.tgz
sudo cp -i cockroach-v26.2.0.linux-amd64/cockroach /usr/local/bin/

# Verify the binary is available
cockroach version
```

## Step 2: Configure the Service

Create a system user and data directory for CockroachDB:

```bash
sudo useradd --system --home /var/lib/cockroach --shell /sbin/nologin cockroach
sudo mkdir -p /var/lib/cockroach
sudo chown -R cockroach:cockroach /var/lib/cockroach
```

Create a systemd unit to start a single-node CockroachDB service. The `--insecure` flag is only appropriate for local testing or non-production environments; production deployments should use certificates with `--certs-dir`.

```bash
sudo vi /etc/systemd/system/cockroachdb.service
```

Add the following configuration:

```ini
[Unit]
Description=CockroachDB single-node service
Requires=network.target
After=network.target

[Service]
Type=notify
User=cockroach
WorkingDirectory=/var/lib/cockroach
ExecStart=/usr/local/bin/cockroach start-single-node --insecure --store=/var/lib/cockroach --listen-addr=0.0.0.0:26257 --http-addr=0.0.0.0:8080
TimeoutStopSec=300
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Step 3: Enable and Start the Service

```bash
# Reload systemd after creating the unit file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable cockroachdb

# Start the service
sudo systemctl start cockroachdb

# Check the status
sudo systemctl status cockroachdb
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status cockroachdb

# Review recent logs
sudo journalctl -u cockroachdb --no-pager -n 20

# Confirm the SQL endpoint responds
cockroach sql --insecure --host=localhost:26257 --execute="SHOW DATABASES;"
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u cockroachdb -e --no-pager`.
- Ensure the CockroachDB binary is installed: `cockroach version`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
