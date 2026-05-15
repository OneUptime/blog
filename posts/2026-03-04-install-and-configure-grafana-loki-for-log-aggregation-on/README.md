# How to Install and Configure Grafana Loki for Log Aggregation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on install and configure grafana loki for log aggregation using Red Hat Enterprise Linux 9.

---

Grafana Loki for Log Aggregation can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Add Grafana repository
cat <<EOF | sudo tee /etc/yum.repos.d/grafana.repo
[grafana]
name=Grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

# Install Loki
sudo dnf install -y loki
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/loki/config.yml
```

Adjust the settings according to your requirements. Key parameters to configure include the HTTP listening address and port, storage settings, and whether Loki expects the `X-Scope-OrgID` tenant header with `auth_enabled`.

```bash
# Restart the service to apply changes
sudo systemctl restart loki
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable loki

# Start the service
sudo systemctl start loki

# Check the status
sudo systemctl status loki
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status loki

# Check the Loki readiness endpoint
curl http://localhost:3100/ready

# Review recent logs
journalctl -u loki --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u loki -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep loki`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
