# How to Set Up ClickHouse Column-Oriented Database on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Database, Linux

Description: Step-by-step guide on set up clickhouse column-oriented database using Red Hat Enterprise Linux 9.

---

Setting up ClickHouse Column-Oriented Database on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install ClickHouse

Add the official ClickHouse RPM repository and install the server and client packages:

```bash
# Install repository management tools
sudo yum install -y yum-utils

# Add the official ClickHouse repository
sudo yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo

# Install ClickHouse server and client
sudo yum install -y clickhouse-server clickhouse-client
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/clickhouse-server/config.d/network.xml
```

Adjust the settings according to your requirements. For example, to listen on all IPv4 and IPv6 interfaces, add:

```xml
<clickhouse>
    <listen_host>::</listen_host>
</clickhouse>
```

Key parameters to configure include listening addresses, authentication settings, and logging options. User settings can be placed under `/etc/clickhouse-server/users.d/`, while server settings can be placed under `/etc/clickhouse-server/config.d/`.

```bash
# Restart the service to apply changes
sudo systemctl restart clickhouse-server
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable clickhouse-server

# Start the service
sudo systemctl start clickhouse-server

# Check the status
sudo systemctl status clickhouse-server
```

## Step 4: Configure the Firewall

```bash
# Open the default HTTP and native protocol ports
sudo firewall-cmd --permanent --add-port=8123/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status clickhouse-server

# Review recent logs
journalctl -u clickhouse-server --no-pager -n 20

# Run a simple query
clickhouse-client --query "SELECT version();"
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u clickhouse-server -e --no-pager`.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep clickhouse`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
