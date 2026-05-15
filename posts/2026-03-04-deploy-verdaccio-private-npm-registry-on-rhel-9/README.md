# How to Deploy Verdaccio Private npm Registry on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on deploy verdaccio private npm registry using Red Hat Enterprise Linux 9.

---

Deploying Verdaccio Private npm Registry on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Node.js 18 or later and npm
- Root or sudo access
- A terminal session

## Step 1: Configure the Service

Install Node.js and Verdaccio:

```bash
# Install Node.js and npm from the RHEL AppStream module
sudo dnf module install nodejs:20 -y

# Install Verdaccio globally
sudo npm install -g verdaccio

# Create the Verdaccio system user
if ! id -u verdaccio >/dev/null 2>&1; then
  sudo useradd --system --comment 'Verdaccio NPM mirror' --create-home --home-dir /var/lib/verdaccio --shell /sbin/nologin verdaccio
fi

# Create the data and configuration directories
sudo mkdir -p /etc/verdaccio /var/lib/verdaccio/storage
sudo chown -R verdaccio:verdaccio /var/lib/verdaccio

# Create the Verdaccio configuration file
sudo tee /etc/verdaccio/config.yaml > /dev/null <<'EOF'
storage: /var/lib/verdaccio/storage

auth:
  htpasswd:
    file: /var/lib/verdaccio/htpasswd

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  '@*/*':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  '**':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

middlewares:
  audit:
    enabled: true

log:
  type: stdout
  format: pretty
  level: http

listen: 0.0.0.0:4873
EOF

# Copy the systemd unit and reload systemd
VERDACCIO_ROOT=$(npm root -g)
VERDACCIO_BIN=$(command -v verdaccio)
sudo cp "$VERDACCIO_ROOT/verdaccio/systemd/verdaccio.service" /etc/systemd/system/verdaccio.service
sudo sed -i "s|ExecStart=/usr/bin/verdaccio|ExecStart=${VERDACCIO_BIN}|" /etc/systemd/system/verdaccio.service
sudo systemctl daemon-reload
```

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/verdaccio/config.yaml
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

For example, confirm Verdaccio is listening on all network interfaces:

```yaml
listen: 0.0.0.0:4873
```

```bash
# Restart the service to apply changes
sudo systemctl restart verdaccio
```

## Step 2: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable verdaccio

# Start the service
sudo systemctl start verdaccio

# Check the status
sudo systemctl status verdaccio
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status verdaccio

# Review recent logs
journalctl -u verdaccio --no-pager -n 20

# Configure npm to use Verdaccio
npm set registry http://localhost:4873/
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u verdaccio -e --no-pager`.
- Ensure all required packages are installed: `node -v`, `npm -v`, and `npm list -g verdaccio`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
