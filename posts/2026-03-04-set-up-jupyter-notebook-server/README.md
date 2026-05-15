# How to Set Up Jupyter Notebook Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Python, Development, Linux

Description: Learn how to set Up Jupyter Notebook Server on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up Jupyter Notebook Server on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Set Up Jupyter Notebook Server requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y python3 python3-pip python3-devel gcc openssl
```

## Step 2: Install Required Packages

```bash
sudo useradd --system --create-home --home-dir /var/lib/jupyter --shell /sbin/nologin jupyter
sudo -u jupyter python3 -m venv /var/lib/jupyter/venv
sudo -u jupyter /var/lib/jupyter/venv/bin/python -m pip install --upgrade pip
sudo -u jupyter /var/lib/jupyter/venv/bin/python -m pip install notebook
```

Verify the installation:

```bash
rpm -q python3 python3-pip
sudo -u jupyter /var/lib/jupyter/venv/bin/jupyter notebook --version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/systemd/system/jupyter-notebook.service
```

Use a dedicated service account and run Jupyter from the virtual environment:

```ini
[Unit]
Description=Jupyter Notebook Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=jupyter
Group=jupyter
WorkingDirectory=/var/lib/jupyter
Environment=JUPYTER_CONFIG_DIR=/var/lib/jupyter/.jupyter
ExecStart=/var/lib/jupyter/venv/bin/jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Set a password before exposing the server on the network:

```bash
sudo -u jupyter /var/lib/jupyter/venv/bin/jupyter server password
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jupyter-notebook.service
sudo systemctl status jupyter-notebook.service
```

## Step 5: Verify the Configuration

Test the setup:

```bash
systemctl is-active jupyter-notebook.service
ss -tlnp | grep ':8888'
```

Check the logs for any errors:

```bash
journalctl -u jupyter-notebook.service -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=8888/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show jupyter-notebook.service --property=MemoryCurrent
top -p $(systemctl show -p MainPID --value jupyter-notebook.service)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u jupyter-notebook.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp | grep ':8888'` to identify processes using the port

## Conclusion

You have successfully configured a Jupyter Notebook server on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
