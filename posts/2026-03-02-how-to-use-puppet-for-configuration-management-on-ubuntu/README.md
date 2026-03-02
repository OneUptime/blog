# How to Use Puppet for Configuration Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Puppet, Configuration Management, DevOps, Automation

Description: Install and configure Puppet on Ubuntu to automate server configuration, enforce desired state across your infrastructure, and manage packages, files, and services declaratively.

---

Puppet is a declarative configuration management tool that lets you define how your servers should be configured and then enforces that state automatically. Instead of manually running commands on each server, you write Puppet manifests that describe the desired state, and Puppet ensures every managed node matches that description. When a configuration drifts (someone manually changes a file, or a package updates something), Puppet detects the drift on the next run and corrects it.

## Architecture Overview

Puppet uses an agent-server model:
- **Puppet Server** - The central server that stores manifests and signs node certificates
- **Puppet Agent** - Runs on each managed node, applies configurations

Alternatively, `puppet apply` runs manifests locally without a central server, useful for standalone systems or testing.

For this guide:
- Puppet Server: 192.168.1.5 (Ubuntu 22.04)
- Agent nodes: 192.168.1.10, 192.168.1.11

## Installing Puppet Server

```bash
# On the Puppet server
# Download and install the Puppet repository
wget https://apt.puppetlabs.com/puppet8-release-jammy.deb
sudo dpkg -i puppet8-release-jammy.deb
sudo apt update

# Install Puppet Server
sudo apt install puppetserver -y

# Configure memory allocation (default 2GB - adjust for your server)
sudo nano /etc/default/puppetserver
```

Adjust the JVM heap size:

```
# For 4GB server, 1.5GB for Puppet is reasonable
JAVA_ARGS="-Xms1536m -Xmx1536m -Xmn512m"
```

```bash
# Start and enable Puppet Server
sudo systemctl enable --now puppetserver

# Check status
sudo systemctl status puppetserver
```

Set the server's hostname if needed:

```bash
# Puppet uses the server's FQDN for certificate purposes
hostnamectl set-hostname puppet.example.com

# Update /etc/hosts
echo "192.168.1.5 puppet.example.com puppet" | sudo tee -a /etc/hosts
```

## Installing Puppet Agent on Nodes

On each managed node:

```bash
# Add the Puppet repository
wget https://apt.puppetlabs.com/puppet8-release-jammy.deb
sudo dpkg -i puppet8-release-jammy.deb
sudo apt update

# Install the agent
sudo apt install puppet-agent -y

# Add puppet binaries to PATH
echo 'export PATH=$PATH:/opt/puppetlabs/bin' >> ~/.bashrc
source ~/.bashrc

# Or use full path: /opt/puppetlabs/bin/puppet
```

Configure the agent to point to the Puppet server:

```bash
sudo nano /etc/puppetlabs/puppet/puppet.conf
```

```ini
[main]
server = puppet.example.com
environment = production

[agent]
# Run every 30 minutes
runinterval = 30m
```

Also add the server to the node's `/etc/hosts`:

```bash
echo "192.168.1.5 puppet.example.com puppet" | sudo tee -a /etc/hosts
```

## Certificate Signing

Puppet uses SSL certificates for authentication. On first connection, the agent generates a certificate signing request (CSR):

```bash
# On the agent - trigger the first connection (sends CSR)
sudo /opt/puppetlabs/bin/puppet agent --test
```

On the Puppet server:

```bash
# List pending certificate requests
sudo /opt/puppetlabs/bin/puppetserver ca list

# Sign a specific node's certificate
sudo /opt/puppetlabs/bin/puppetserver ca sign --certname node1.example.com

# Sign all pending requests (use with caution in production)
sudo /opt/puppetlabs/bin/puppetserver ca sign --all
```

Run the agent again to confirm it applies the (empty) default catalog:

```bash
sudo /opt/puppetlabs/bin/puppet agent --test
```

## Writing Your First Manifest

Manifests live in `/etc/puppetlabs/code/environments/production/manifests/` on the Puppet server.

Create `site.pp`, the main entry point:

```puppet
# /etc/puppetlabs/code/environments/production/manifests/site.pp

# Apply to all nodes
node default {
  # Ensure NTP is installed and running
  package { 'chrony':
    ensure => installed,
  }

  service { 'chrony':
    ensure  => running,
    enable  => true,
    require => Package['chrony'],
  }

  # Manage the motd banner
  file { '/etc/motd':
    ensure  => file,
    content => "Managed by Puppet. Do not edit manually.\nServer: ${::fqdn}\n",
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
  }
}

# Node-specific configuration
node 'webserver.example.com' {
  include profile::webserver
}

node 'dbserver.example.com' {
  include profile::database
}
```

## Creating Modules

Modules organize related Puppet code. Create a simple nginx module:

```bash
# Create module structure on the Puppet server
cd /etc/puppetlabs/code/environments/production/modules
sudo mkdir -p nginx/{manifests,files,templates}

# Create the main module manifest
sudo nano nginx/manifests/init.pp
```

```puppet
# modules/nginx/manifests/init.pp
class nginx {
  package { 'nginx':
    ensure => latest,
  }

  service { 'nginx':
    ensure  => running,
    enable  => true,
    require => Package['nginx'],
  }

  file { '/etc/nginx/nginx.conf':
    ensure  => file,
    source  => 'puppet:///modules/nginx/nginx.conf',
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],  # Restart nginx when config changes
    require => Package['nginx'],
  }
}
```

Place your nginx.conf template in the module's files directory:

```bash
sudo cp /etc/nginx/nginx.conf /etc/puppetlabs/code/environments/production/modules/nginx/files/nginx.conf
```

## Using Templates

Puppet's EPP (Embedded Puppet) templates allow dynamic configurations:

```bash
sudo nano /etc/puppetlabs/code/environments/production/modules/nginx/templates/vhost.epp
```

```
# Managed by Puppet - do not edit manually
server {
    listen 80;
    server_name <%= $server_name %>;
    root <%= $document_root %>;

    location / {
        try_files $uri $uri/ =404;
    }

    access_log /var/log/nginx/<%= $server_name %>_access.log;
    error_log  /var/log/nginx/<%= $server_name %>_error.log;
}
```

Use it in a manifest:

```puppet
# modules/nginx/manifests/vhost.pp
define nginx::vhost (
  String $server_name   = $title,
  String $document_root = "/var/www/${title}",
) {
  file { "/etc/nginx/sites-available/${title}":
    ensure  => file,
    content => epp('nginx/vhost.epp', {
      'server_name'   => $server_name,
      'document_root' => $document_root,
    }),
    notify  => Service['nginx'],
  }

  file { "/etc/nginx/sites-enabled/${title}":
    ensure  => link,
    target  => "/etc/nginx/sites-available/${title}",
    require => File["/etc/nginx/sites-available/${title}"],
    notify  => Service['nginx'],
  }

  file { $document_root:
    ensure => directory,
    owner  => 'www-data',
    group  => 'www-data',
    mode   => '0755',
  }
}
```

## Using Hiera for Data Separation

Hiera separates configuration data from code. Instead of hardcoding values in manifests, define them in YAML:

```bash
# Configure Hiera
sudo nano /etc/puppetlabs/code/environments/production/hiera.yaml
```

```yaml
---
version: 5

hierarchy:
  - name: "Node-specific data"
    path: "nodes/%{trusted.certname}.yaml"
  - name: "Role-based data"
    path: "roles/%{facts.role}.yaml"
  - name: "Common data"
    path: "common.yaml"

defaults:
  data_hash: yaml_data
  datadir: "data"
```

Create the data directory and common.yaml:

```bash
sudo mkdir -p /etc/puppetlabs/code/environments/production/data

sudo nano /etc/puppetlabs/code/environments/production/data/common.yaml
```

```yaml
---
# Common settings for all nodes
chrony::servers:
  - '0.ubuntu.pool.ntp.org'
  - '1.ubuntu.pool.ntp.org'

profile::base::admin_users:
  - 'deploy'
  - 'monitoring'

profile::base::ssh_port: 22
```

## Applying Configuration

On agent nodes:

```bash
# Run Puppet manually for immediate application
sudo /opt/puppetlabs/bin/puppet agent --test

# Run with verbose output for debugging
sudo /opt/puppetlabs/bin/puppet agent --test --debug

# Enable the agent daemon (runs every 30min by default)
sudo systemctl enable --now puppet
```

From the server, you can trigger immediate runs:

```bash
# Trigger run on a specific node (requires MCollective or Puppet Bolt)
# With Puppet Bolt:
bolt command run 'puppet agent --test' --targets node1.example.com
```

## Testing Manifests

Before applying to production, test your manifests:

```bash
# Syntax check a manifest
puppet parser validate manifest.pp

# Noop mode - show what would change without making changes
sudo /opt/puppetlabs/bin/puppet agent --test --noop

# Apply a manifest locally without server
sudo /opt/puppetlabs/bin/puppet apply /tmp/test.pp --noop

# Test a specific class
sudo /opt/puppetlabs/bin/puppet apply -e 'include nginx'
```

## Viewing Reports

Puppet generates reports after each run. Check the agent's last run status:

```bash
# On the agent
cat /opt/puppetlabs/puppet/cache/state/last_run_summary.yaml

# View recent Puppet logs
sudo journalctl -u puppet -f

# Check the last catalog application time
cat /opt/puppetlabs/puppet/cache/state/last_run_report.yaml | grep -E 'status|time'
```

## Common Puppet Resources Reference

```puppet
# Package management
package { 'vim': ensure => latest }
package { 'apache2': ensure => absent }

# File management
file { '/etc/app.conf':
  ensure  => file,
  content => template('myapp/app.conf.epp'),
  mode    => '0640',
  owner   => 'app',
  group   => 'app',
}

# Service management
service { 'postgresql':
  ensure => running,
  enable => true,
}

# Execute commands (use sparingly - prefer native resources)
exec { 'initialize-database':
  command => '/usr/local/bin/init-db.sh',
  creates => '/var/lib/myapp/.initialized',
  user    => 'myapp',
}

# User management
user { 'deploy':
  ensure     => present,
  shell      => '/bin/bash',
  home       => '/home/deploy',
  managehome => true,
  groups     => ['sudo'],
}
```

Puppet's real value shows at scale - managing dozens or hundreds of servers with consistent configuration, enforcing security baselines, and ensuring that manual changes get reverted on the next run cycle. Start with simple manifests and build toward a full roles-and-profiles pattern as your infrastructure grows.
