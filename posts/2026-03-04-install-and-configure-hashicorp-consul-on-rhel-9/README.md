# How to Install and Configure HashiCorp Consul on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on install and configure hashicorp consul using Red Hat Enterprise Linux 9.

---

HashiCorp Consul provides service discovery, configuration management, and service mesh capabilities. Installing it on RHEL gives you a foundation for building resilient, service-oriented infrastructure.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Add HashiCorp repository
sudo dnf install -y yum-utils
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Consul
sudo dnf install -y consul
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/consul.d/consul.hcl
```

Add a basic single-server configuration, then adjust the settings according to your requirements. Key parameters to configure include the datacenter, data directory, server mode, ACLs, TLS, gossip encryption, and logging options.

```hcl
datacenter = "dc1"
data_dir = "/opt/consul"
server = true
bootstrap_expect = 1
log_level = "INFO"
```

```bash
# Validate the configuration before starting Consul
sudo consul validate /etc/consul.d/

# Restart the service to apply changes if Consul is already running
sudo systemctl restart consul
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable consul

# Start the service
sudo systemctl start consul

# Check the status
sudo systemctl status consul
```

## Step 4: Configure the Firewall

```bash
# Open the default Consul ports needed for a server agent
sudo firewall-cmd --permanent --add-port=8300/tcp
sudo firewall-cmd --permanent --add-port=8301/tcp
sudo firewall-cmd --permanent --add-port=8301/udp
sudo firewall-cmd --permanent --add-port=8500/tcp
sudo firewall-cmd --permanent --add-port=8600/tcp
sudo firewall-cmd --permanent --add-port=8600/udp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check Consul members
consul members

# Verify Consul is healthy
consul info
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u consul -e --no-pager`.
- Ensure Consul is installed: `rpm -q consul`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
