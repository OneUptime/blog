# How to Run Scripts at First Boot with cloud-init on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, cloud-init, Automation, Scripting, Cloud

Description: A comprehensive guide to running scripts at first boot using cloud-init on Ubuntu, covering runcmd, bootcmd, user scripts, and script frequency options.

---

Running scripts at first boot is one of the most powerful cloud-init features. It lets you automate the full stack of application setup - downloading binaries, configuring databases, setting up monitoring agents, registering with service discovery - all before anyone connects to the instance. cloud-init provides several mechanisms for running scripts, each with different timing and frequency semantics.

## The runcmd Module

`runcmd` is the most common way to run commands during first-boot initialization. Commands in `runcmd` run after all cloud-config modules complete - after package installation, user creation, and file writes.

```yaml
#cloud-config
runcmd:
  # Each item is a command to run
  - echo "Hello from cloud-init" >> /var/log/mysetup.log

  # Multi-word commands can be strings or lists
  - systemctl enable --now nginx

  # List format (safer for commands with arguments)
  - [/usr/bin/python3, -c, "import os; print(os.getcwd())"]

  # Multi-line scripts using the pipe syntax
  - |
    echo "Starting application setup"
    cd /opt/myapp
    ./install.sh --quiet
    systemctl enable --now myapp
```

Commands in `runcmd` run as root in the shell defined by `/bin/sh`. The exit code of each command is logged, but by default a failing command does not stop subsequent commands from running.

## The bootcmd Module

`bootcmd` runs very early in the boot process, before most other modules. Use it for operations that must happen before network configuration or package installation:

```yaml
#cloud-config
bootcmd:
  # Runs on every boot, very early
  - echo "Server started at $(date)" >> /var/log/boots.log

  # Set kernel parameters before network comes up
  - sysctl -w net.core.somaxconn=65535

  # Configure block devices before anything else
  - mkdir -p /data
  - mount /dev/xvdb /data
```

The key differences between `bootcmd` and `runcmd`:

| Feature | bootcmd | runcmd |
|---------|---------|--------|
| Timing | Very early boot | After all cloud-config modules |
| Frequency | Every boot (by default) | Once per instance |
| Use case | Kernel params, early mounts | App setup, package config |

## Writing Scripts with write_files + runcmd

A cleaner pattern for complex scripts is to write them to disk first, then execute them:

```yaml
#cloud-config
write_files:
  - path: /usr/local/bin/setup-app.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Setup script for myapp
      set -euo pipefail

      # Redirect all output to a log file
      exec > >(tee -a /var/log/app-setup.log) 2>&1

      echo "[$(date)] Starting application setup"

      # Create application directory
      mkdir -p /opt/myapp/{bin,config,logs,data}

      # Download application binary
      APP_VERSION="2.1.0"
      wget -q -O /opt/myapp/bin/myapp \
          "https://releases.example.com/myapp/${APP_VERSION}/myapp-linux-amd64"
      chmod +x /opt/myapp/bin/myapp

      # Create configuration
      cat > /opt/myapp/config/config.yaml << 'CONF'
      server:
        port: 8080
        workers: 4
      database:
        url: "postgres://localhost:5432/myappdb"
      CONF

      # Create systemd service
      cat > /etc/systemd/system/myapp.service << 'SERVICE'
      [Unit]
      Description=My Application
      After=network.target postgresql.service

      [Service]
      Type=simple
      User=myapp
      ExecStart=/opt/myapp/bin/myapp --config /opt/myapp/config/config.yaml
      Restart=always
      RestartSec=5

      [Install]
      WantedBy=multi-user.target
      SERVICE

      # Enable and start the service
      systemctl daemon-reload
      systemctl enable --now myapp

      echo "[$(date)] Application setup complete"

runcmd:
  - /usr/local/bin/setup-app.sh
```

This approach keeps your cloud-config clean and gives you a reusable, testable script.

## User Data as a Shell Script

Instead of a `#cloud-config` YAML, you can pass a shell script directly as user data. Scripts must start with a shebang:

```bash
#!/bin/bash
# This entire file is executed as user data

set -euo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting user data script at $(date)"

# Update packages
apt-get update -qq
apt-get install -y -qq nginx postgresql python3-pip

# Configure nginx
cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
NGINX

systemctl enable --now nginx

echo "Setup complete at $(date)"
```

Shell scripts and cloud-config YAML serve different purposes. Shell scripts are familiar and flexible but lack cloud-init's structured modules. Use cloud-config YAML when you need cloud-init features (user management, apt sources, etc.), and shell scripts for simple procedural setups.

## Multi-Part User Data

cloud-init supports passing multiple documents in a single user data payload using MIME multipart format. This lets you combine a cloud-config with a shell script:

```bash
# Create a multipart user data file
cat > user-data.txt << 'EOF'
Content-Type: multipart/mixed; boundary="===============BOUNDARY=="
MIME-Version: 1.0

--===============BOUNDARY==
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

#cloud-config
packages:
  - nginx
  - postgresql

--===============BOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

#!/bin/bash
# This runs after the cloud-config section
systemctl enable --now nginx
createuser myapp
createdb myapp -O myapp

--===============BOUNDARY==--
EOF
```

A Python helper to build multipart user data:

```python
#!/usr/bin/env python3
# build-userdata.py - combines cloud-config and shell scripts

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

cloud_config = """#cloud-config
packages:
  - nginx
"""

shell_script = """#!/bin/bash
systemctl enable --now nginx
echo "Setup complete"
"""

combined = MIMEMultipart()

cloud_part = MIMEText(cloud_config, 'cloud-config', 'utf-8')
combined.attach(cloud_part)

script_part = MIMEText(shell_script, 'x-shellscript', 'utf-8')
combined.attach(script_part)

with open('user-data.txt', 'w') as f:
    f.write(combined.as_string())

print("user-data.txt written")
```

## Script Frequency: per-instance vs per-boot vs once

cloud-init runs scripts at different frequencies depending on how they're provided:

```bash
# Scripts placed here run once per instance
ls /var/lib/cloud/instance/scripts/

# Scripts placed here run every boot
ls /var/lib/cloud/scripts/per-boot/

# Scripts placed here run once total (forever)
ls /var/lib/cloud/scripts/per-once/
```

Use cloud-init to place scripts in these directories:

```yaml
#cloud-config
write_files:
  # Runs on every reboot (not just first boot)
  - path: /var/lib/cloud/scripts/per-boot/mount-data.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Re-mount ephemeral storage on every boot
      if ! mountpoint -q /data; then
          mount /dev/nvme1n1 /data
      fi

  # Runs once during the lifetime of this instance ID
  - path: /var/lib/cloud/scripts/per-instance/init-database.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Initialize the database schema once
      sudo -u postgres psql -c "CREATE DATABASE myapp;"
```

## Monitoring Script Execution

```bash
# Check if cloud-init has finished
cloud-init status --wait

# Look at command output
cat /var/log/cloud-init-output.log

# Check individual script output
cat /var/log/user-data.log   # if you redirected there

# See what scripts ran
ls /var/lib/cloud/instance/scripts/
ls /var/lib/cloud/instance/sem/

# Check the exit code of runcmd
grep "runcmd" /var/log/cloud-init.log
```

## Error Handling in Scripts

By default, a failing command in `runcmd` logs the error but continues. Add explicit error handling:

```yaml
#cloud-config
runcmd:
  - |
    set -e    # exit on first error

    # Verify prerequisites
    if ! command -v docker &>/dev/null; then
        echo "ERROR: Docker not installed" >&2
        exit 1
    fi

    # Install application
    docker pull myapp:latest || {
        echo "ERROR: Failed to pull Docker image" >&2
        exit 1
    }

    docker run -d \
        --name myapp \
        --restart unless-stopped \
        -p 8080:8080 \
        myapp:latest

    echo "Deployment successful"
```

Adding logging and error handling to first-boot scripts catches problems early and makes debugging much easier when something goes wrong on a new instance.
