# How to Install and Configure Prefect for Data Pipeline Orchestration on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Data Engineering, Linux

Description: Step-by-step guide on install and configure prefect for data pipeline orchestration using Red Hat Enterprise Linux 9.

---

Prefect for Data Pipeline Orchestration can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Python 3.10 or newer

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y python3.12 python3.12-pip

# Create a dedicated service account and virtual environment
sudo useradd --system --create-home --home-dir /var/lib/prefect --shell /sbin/nologin prefect
sudo python3.12 -m venv /opt/prefect
sudo /opt/prefect/bin/python -m pip install --upgrade pip
sudo /opt/prefect/bin/python -m pip install --upgrade prefect
sudo chown -R prefect:prefect /opt/prefect /var/lib/prefect

# Confirm Prefect is installed
/opt/prefect/bin/prefect version
```

## Step 2: Configure the Service

Create a systemd service for the Prefect server:

```bash
sudo tee /etc/systemd/system/prefect-server.service >/dev/null <<'EOF'
[Unit]
Description=Prefect Server
After=network-online.target
Wants=network-online.target

[Service]
User=prefect
Group=prefect
Environment=PREFECT_HOME=/var/lib/prefect
WorkingDirectory=/var/lib/prefect
ExecStart=/opt/prefect/bin/prefect server start --host 0.0.0.0
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

Create a local process worker service. The worker polls the `default-process-pool` work pool and executes flow runs in local subprocesses:

```bash
sudo tee /etc/systemd/system/prefect-worker.service >/dev/null <<'EOF'
[Unit]
Description=Prefect Process Worker
After=network-online.target prefect-server.service
Wants=network-online.target
Requires=prefect-server.service

[Service]
User=prefect
Group=prefect
Environment=PREFECT_HOME=/var/lib/prefect
Environment=PREFECT_API_URL=http://127.0.0.1:4200/api
WorkingDirectory=/var/lib/prefect
ExecStart=/opt/prefect/bin/prefect worker start --pool default-process-pool --type process
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd after adding new unit files
sudo systemctl daemon-reload
```

## Step 3: Enable and Start the Service

```bash
# Enable the services to start on boot
sudo systemctl enable prefect-server prefect-worker

# Start the services
sudo systemctl start prefect-server
sudo systemctl start prefect-worker

# Point local Prefect CLI commands at the self-hosted server
sudo -u prefect PREFECT_HOME=/var/lib/prefect /opt/prefect/bin/prefect config set PREFECT_API_URL=http://127.0.0.1:4200/api

# Check the status
sudo systemctl status prefect-server
sudo systemctl status prefect-worker
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status prefect-server
sudo systemctl status prefect-worker

# Review recent logs
journalctl -u prefect-server --no-pager -n 20
journalctl -u prefect-worker --no-pager -n 20

# Verify Prefect configuration and worker registration
sudo -u prefect PREFECT_HOME=/var/lib/prefect /opt/prefect/bin/prefect config validate
sudo -u prefect PREFECT_HOME=/var/lib/prefect /opt/prefect/bin/prefect work-pool ls
```

## Troubleshooting

- If the server fails to start, check the logs with `journalctl -u prefect-server -e --no-pager`.
- If the worker fails to start, check the logs with `journalctl -u prefect-worker -e --no-pager`.
- Ensure Python and pip are installed: `rpm -qa | grep -E 'python3.12|python3.12-pip'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
