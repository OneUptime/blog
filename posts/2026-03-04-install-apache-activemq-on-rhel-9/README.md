# How to Install Apache ActiveMQ on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Message Queue, Linux

Description: Step-by-step guide on install apache activemq using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for completing this task on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Java 17 or later

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y java-17-openjdk wget tar
```

Download and install Apache ActiveMQ Classic:

```bash
export ACTIVEMQ_VERSION=6.2.4

wget https://downloads.apache.org/activemq/${ACTIVEMQ_VERSION}/apache-activemq-${ACTIVEMQ_VERSION}-bin.tar.gz
sudo tar -xzf apache-activemq-${ACTIVEMQ_VERSION}-bin.tar.gz -C /opt
sudo ln -sfn /opt/apache-activemq-${ACTIVEMQ_VERSION} /opt/activemq
sudo useradd --system --home-dir /opt/activemq --shell /sbin/nologin activemq
sudo chown -R activemq:activemq /opt/apache-activemq-${ACTIVEMQ_VERSION}
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /opt/activemq/conf/activemq.xml
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

```bash
# Create a systemd service unit
sudo vi /etc/systemd/system/activemq.service
```

Add the following service configuration:

```ini
[Unit]
Description=Apache ActiveMQ Classic
After=network.target

[Service]
Type=forking
User=activemq
Group=activemq
WorkingDirectory=/opt/activemq
ExecStart=/opt/activemq/bin/activemq start
ExecStop=/opt/activemq/bin/activemq stop
PIDFile=/opt/activemq/data/activemq.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd and restart the service to apply changes
sudo systemctl daemon-reload
sudo systemctl restart activemq
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable activemq

# Start the service
sudo systemctl start activemq

# Check the status
sudo systemctl status activemq
```

## Step 4: Configure the Firewall

```bash
# Open the default OpenWire broker port
sudo firewall-cmd --permanent --add-port=61616/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status activemq

# Review recent logs
journalctl -u activemq --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u activemq -e --no-pager`.
- Ensure Java is installed and available: `java -version`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
