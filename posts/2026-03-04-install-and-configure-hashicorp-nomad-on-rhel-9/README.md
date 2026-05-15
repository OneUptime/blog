# How to Install and Configure HashiCorp Nomad on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on install and configure hashicorp nomad using Red Hat Enterprise Linux 9.

---

HashiCorp Nomad is a workload orchestrator that can schedule containers, VMs, and standalone applications. It is simpler than Kubernetes while still providing job scheduling, service discovery, and multi-datacenter support.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the DNF plugin that provides config-manager
sudo dnf install -y dnf-plugins-core

# Add HashiCorp repository
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Nomad
sudo dnf install -y nomad
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/nomad.d/nomad.hcl
```

For a single-node test setup, add the following basic configuration. Adjust the settings according to your requirements. Key parameters to configure include datacenter, data directory, listening addresses, server or client mode, and logging options.

```hcl
datacenter = "dc1"
data_dir   = "/opt/nomad"
bind_addr  = "0.0.0.0"

server {
  enabled          = true
  bootstrap_expect = 1
}

client {
  enabled = true
}
```

```bash
# Restart the service to apply changes
sudo systemctl restart nomad
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable nomad

# Start the service
sudo systemctl start nomad

# Check the status
sudo systemctl status nomad
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status nomad

# Review recent logs
journalctl -u nomad --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u nomad -e --no-pager`.
- Ensure Nomad is installed: `rpm -qa | grep nomad`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
