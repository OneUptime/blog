# How to Install and Configure a Puppet Server and Agent on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Puppet, Configuration Management, Linux

Description: Learn how to install and Configure a Puppet Server and Agent on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure a Puppet Server and Agent on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Access to the Puppet Core package repositories

## Overview

Install and Configure a Puppet Server and Agent requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl
RHEL_MAJOR_VERSION=$(rpm -E '%{rhel}')
sudo rpm -Uvh "https://yum-puppetcore.puppet.com/public/puppet8-release-el-${RHEL_MAJOR_VERSION}.noarch.rpm"
```

## Step 2: Install Required Packages

On the Puppet server:

```bash
sudo dnf install -y puppetserver
```

On each Puppet agent node:

```bash
sudo dnf install -y puppet-agent
```

Verify the installation on the matching node:

```bash
rpm -qi puppetserver
rpm -qi puppet-agent
```

## Step 3: Configure the Service

Create or edit the main Puppet configuration file:

```bash
sudo vi /etc/puppetlabs/puppet/puppet.conf
```

On agent nodes, configure the primary Puppet server name:

```bash
sudo /opt/puppetlabs/bin/puppet config set server puppet.example.com --section agent
```

Apply the recommended settings for your environment. Start with the defaults and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

On the Puppet server:

```bash
sudo systemctl enable --now puppetserver
sudo systemctl status puppetserver
```

On each Puppet agent node:

```bash
sudo /opt/puppetlabs/bin/puppet resource service puppet ensure=running enable=true
```

## Step 5: Verify the Configuration

On an agent node, start a test run to request a certificate from the Puppet server:

```bash
sudo /opt/puppetlabs/bin/puppet agent --test
```

On the Puppet server, review and sign the agent certificate request:

```bash
sudo /opt/puppetlabs/bin/puppetserver ca list
sudo /opt/puppetlabs/bin/puppetserver ca sign --certname agent.example.com
```

Check the logs for any errors:

```bash
journalctl -u puppetserver -f
journalctl -u puppet -f
```

## Step 6: Configure Firewall Rules

If the Puppet server has a firewall enabled, allow Puppet's HTTPS traffic:

```bash
sudo firewall-cmd --permanent --add-port=8140/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show puppetserver --property=MemoryCurrent
sudo vi /etc/sysconfig/puppetserver
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u puppetserver -xe` or `journalctl -u puppet -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using port 8140

## Conclusion

You have successfully configured a Puppet server and agent on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
