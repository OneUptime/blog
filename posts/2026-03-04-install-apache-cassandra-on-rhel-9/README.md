# How to Install Apache Cassandra on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Database, Linux

Description: Step-by-step guide on install apache cassandra using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for completing this task on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Java 11 or Java 17

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install Java
sudo dnf install -y java-17-openjdk

# Add the Apache Cassandra RPM repository
sudo tee /etc/yum.repos.d/cassandra.repo > /dev/null <<'EOF'
[cassandra]
name=Apache Cassandra
baseurl=https://redhat.cassandra.apache.org/50x/
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://downloads.apache.org/cassandra/KEYS
EOF

# Install Apache Cassandra
sudo dnf install -y cassandra
```

This repository installs the current Apache Cassandra 5.0 RPM packages. Use the repository path for the Cassandra release series you plan to run.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/cassandra/default.conf/cassandra.yaml
```

Adjust the settings according to your requirements. Key parameters to configure include `cluster_name`, seed nodes, `listen_address`, `rpc_address`, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart cassandra
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable cassandra

# Start the service
sudo systemctl start cassandra

# Check the status
sudo systemctl status cassandra
```

## Step 4: Configure the Firewall

```bash
# Open the CQL native transport port for trusted clients
sudo firewall-cmd --permanent --add-port=9042/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status cassandra

# Check the Cassandra node status
nodetool status

# Connect with the CQL shell
cqlsh

# Review recent logs
sudo tail -n 20 /var/log/cassandra/system.log
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo tail -n 100 /var/log/cassandra/system.log`.
- Ensure all required packages are installed: `rpm -qa | grep cassandra`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
