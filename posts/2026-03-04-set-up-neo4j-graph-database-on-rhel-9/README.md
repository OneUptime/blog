# How to Set Up Neo4j Graph Database on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Database, Linux

Description: Step-by-step guide on set up neo4j graph database using Red Hat Enterprise Linux 9.

---

Setting up Neo4j Graph Database on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Neo4j

Import the Neo4j package signing key, add the Neo4j RPM repository, and install Neo4j Community Edition:

```bash
# Import the Neo4j GPG key
sudo rpm --import https://debian.neo4j.com/neotechnology.gpg.key

# Add the Neo4j RPM repository
sudo tee /etc/yum.repos.d/neo4j.repo > /dev/null <<'EOF'
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/latest
enabled=1
gpgcheck=1
EOF

# Verify available Neo4j packages
sudo yum list neo4j --showduplicates

# Install Neo4j Community Edition
sudo yum install neo4j-2026.04.0
```

Set the initial password for the native `neo4j` user before starting the database for the first time:

```bash
sudo neo4j-admin dbms set-initial-password 'ChangeThisPassword123'
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/neo4j/neo4j.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

```ini
# Listen on all interfaces instead of localhost only
server.default_listen_address=0.0.0.0

# Advertise the hostname or IP address clients should use
server.default_advertised_address=<server-hostname-or-ip>

# Keep the default HTTP and Bolt connectors enabled
server.http.enabled=true
server.bolt.enabled=true
```

```bash
# Restart the service to apply changes
sudo systemctl restart neo4j
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable neo4j

# Start the service
sudo systemctl start neo4j

# Check the status
sudo systemctl status neo4j
```

## Step 4: Configure the Firewall

```bash
# Open the default HTTP and Bolt ports
sudo firewall-cmd --permanent --add-port=7474/tcp
sudo firewall-cmd --permanent --add-port=7687/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status neo4j

# Review recent logs
sudo journalctl -u neo4j --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u neo4j -e --no-pager`.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure the required package is installed: `rpm -qa | grep neo4j`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
