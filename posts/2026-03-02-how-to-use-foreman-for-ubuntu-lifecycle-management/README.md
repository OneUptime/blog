# How to Use Foreman for Ubuntu Lifecycle Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Foreman, Infrastructure, Automation, Configuration Management

Description: Deploy Foreman on Ubuntu to manage the full server lifecycle including provisioning, configuration management, patch management, and reporting across your infrastructure.

---

Managing a handful of Ubuntu servers manually is manageable. Managing hundreds requires tooling that handles provisioning, configuration, patching, and reporting in a unified way. Foreman fills that role - it is an open-source lifecycle management platform that integrates with Puppet, Ansible, and Chef for configuration management, while also handling bare metal and VM provisioning.

## What Foreman Provides

Foreman brings together several functions:

- **Provisioning**: PXE boot provisioning for bare metal, and VM creation through providers like VMware, oVirt, and cloud APIs
- **Configuration management**: Integration with Puppet, Ansible, and Salt to apply and enforce configuration
- **Patch management**: Through Katello (Foreman's content management plugin), manage Ubuntu package repositories and schedule patching
- **Reporting**: Host-level compliance reports, configuration run history, and custom dashboards
- **RBAC**: Role-based access control for managing permissions across teams

## Installing Foreman on Ubuntu 22.04

Foreman provides an installer script that handles the complexity of setting up the web application, database, and web server.

### System Requirements

- Ubuntu 22.04 LTS (dedicated server recommended)
- Minimum 4 CPU cores, 8GB RAM (16GB with Katello)
- 50GB disk space minimum
- A fully qualified domain name (FQDN) configured for the server

### Setting Up the FQDN

```bash
# Set the hostname to a proper FQDN
sudo hostnamectl set-hostname foreman.example.com

# Verify it resolves correctly
hostname -f
# Should return: foreman.example.com

# Add it to /etc/hosts if DNS is not yet configured
echo "192.168.1.100 foreman.example.com foreman" | sudo tee -a /etc/hosts
```

### Adding the Foreman Repository

```bash
# Install required tools
sudo apt install -y curl wget gnupg2 apt-transport-https

# Add Foreman repository
source /etc/os-release
echo "deb http://deb.theforeman.org/ ${VERSION_CODENAME} 3.9" | \
  sudo tee /etc/apt/sources.list.d/foreman.list

echo "deb http://deb.theforeman.org/ plugins 3.9" | \
  sudo tee -a /etc/apt/sources.list.d/foreman.list

# Add the signing key
wget -q https://deb.theforeman.org/pubkey.gpg -O- | \
  sudo apt-key add -

sudo apt update
```

### Running the Foreman Installer

```bash
# Install the installer
sudo apt install -y foreman-installer

# Run the installer with Puppet support
sudo foreman-installer \
  --foreman-initial-admin-username admin \
  --foreman-initial-admin-password 'change_this_password' \
  --enable-foreman-plugin-ansible \
  --enable-foreman-cli
```

The installer takes several minutes to complete. It configures Apache, PostgreSQL, and the Foreman application.

After completion, the installer prints output showing:

```text
  * Foreman is running at https://foreman.example.com
      Default credentials are 'admin:change_this_password'
  * Foreman Proxy is running at https://foreman.example.com:8443
  * Puppetserver is running at https://foreman.example.com:8140
```

## Accessing the Foreman UI

Open a browser and navigate to `https://foreman.example.com`. Accept the self-signed certificate warning (or configure a proper certificate). Log in with the admin credentials you set during installation.

## Registering Ubuntu Hosts

### Using the Registration Feature

Foreman 3.x includes a streamlined host registration workflow. From the UI:

1. Navigate to Hosts > Register Host
2. Select your operating system (Ubuntu 22.04)
3. Configure the host group and environment
4. Copy the generated curl command

The generated command looks like:

```bash
# Run this on the Ubuntu host you want to register
curl -sS 'https://foreman.example.com/register?...' \
  -H 'Authorization: Bearer your_jwt_token' | \
  sudo bash
```

This script installs the foreman-agent, configures the Puppet agent (if enabled), and registers the host with Foreman.

### Manual Registration with Hammer CLI

Hammer is Foreman's command-line tool:

```bash
# Configure hammer with your credentials
mkdir -p ~/.hammer
cat > ~/.hammer/cli_config.yml << 'EOF'
:foreman:
  :host: 'https://foreman.example.com'
  :username: 'admin'
  :password: 'your_admin_password'
EOF

# List existing hosts
hammer host list

# Create a host record manually
hammer host create \
  --name "web-01.example.com" \
  --ip "192.168.1.101" \
  --mac "aa:bb:cc:dd:ee:ff" \
  --organization "Default Organization" \
  --location "Default Location" \
  --environment "production"
```

## Configuring Ansible Integration

Foreman's Ansible integration allows you to run playbooks and roles on managed hosts directly from the Foreman UI.

```bash
# Install the Ansible plugin during initial setup (or add it later)
sudo foreman-installer --enable-foreman-plugin-ansible

# On each managed Ubuntu host, install the Foreman Ansible callback
sudo apt install -y python3-pip
pip3 install foreman-ansible-modules
```

### Running Ansible Jobs from Foreman

1. Navigate to Hosts > All Hosts
2. Select the target hosts
3. Click "Run Ansible Roles" or "Schedule Remote Job"

For custom playbooks, store them in `/etc/foreman-proxy/ansible/roles/` and they will appear in the Foreman UI.

## Setting Up Host Groups

Host groups in Foreman define templates that apply to multiple hosts - common Puppet classes, parameters, and provisioning templates:

```bash
# Create a host group via hammer
hammer hostgroup create \
  --name "ubuntu-webservers" \
  --environment "production" \
  --domain "example.com" \
  --architecture "x86_64" \
  --operatingsystem "Ubuntu 22.04" \
  --puppet-classes "nginx,common"
```

When you assign new hosts to this group, they inherit all the configured classes and parameters.

## PXE Provisioning Setup

For bare metal provisioning, Foreman manages PXE boot configuration and kickstart/preseed templates.

### Configuring a DHCP and TFTP Smart Proxy

```bash
# On the Foreman server (or a separate smart proxy server)
sudo foreman-installer \
  --enable-foreman-proxy \
  --foreman-proxy-tftp true \
  --foreman-proxy-dhcp true \
  --foreman-proxy-dhcp-interface eth0 \
  --foreman-proxy-dhcp-gateway 192.168.1.1 \
  --foreman-proxy-dhcp-range "192.168.1.200 192.168.1.250" \
  --foreman-proxy-dhcp-nameservers 8.8.8.8
```

Once the proxy is configured, Foreman manages DHCP leases and PXE configurations. When you provision a new host through Foreman:

1. Foreman creates the DHCP lease for the host's MAC address
2. Foreman writes the PXE configuration pointing to the Ubuntu netboot image
3. The server boots, receives the IP from Foreman's DHCP, loads the netboot image
4. The installer fetches the preseed template from Foreman and completes unattended installation
5. After installation, the host registers with Foreman

## Managing Ubuntu Packages and Patching

Foreman's content management (through the Katello plugin) allows you to mirror Ubuntu repositories and schedule patching:

```bash
# Install Katello during initial setup
sudo foreman-installer --scenario katello

# After installation, create a Product for Ubuntu packages
hammer product create \
  --name "Ubuntu 22.04" \
  --organization "Default Organization"

# Create a repository for Ubuntu main packages
hammer repository create \
  --name "Ubuntu 22.04 Main" \
  --product "Ubuntu 22.04" \
  --organization "Default Organization" \
  --content-type deb \
  --url "http://archive.ubuntu.com/ubuntu" \
  --deb-releases "jammy" \
  --deb-components "main restricted" \
  --deb-architectures "amd64"

# Sync the repository
hammer repository synchronize \
  --name "Ubuntu 22.04 Main" \
  --product "Ubuntu 22.04" \
  --organization "Default Organization"
```

## Viewing Host Reports

After hosts are managed by Foreman and have Puppet or Ansible running, configuration run reports appear automatically:

1. Click on any host in Hosts > All Hosts
2. Select the "Reports" tab
3. View configuration run history, including what changed and any failures

Set up email notifications for failed configuration runs:

1. Navigate to Administer > Settings > Notifications
2. Configure SMTP settings
3. Set up notification rules for hosts in your organization

## Scheduling Patching Jobs

With Katello configured, schedule patching across your Ubuntu fleet:

```bash
# Apply all available updates to a host group
hammer job-invocation create \
  --job-template "Run Command - Script Default" \
  --inputs "command=apt-get upgrade -y" \
  --host-group "ubuntu-webservers" \
  --description "Monthly patch run"

# Check job status
hammer job-invocation list
hammer job-invocation output --id 1 --host web-01.example.com
```

Foreman's combination of provisioning, configuration management integration, and reporting makes it a practical choice for Ubuntu infrastructure that has grown beyond what you can manage with shell scripts and manual processes.
