# How to Create a Lightsail Instance and Connect to It

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, SSH, Deployment

Description: Step-by-step guide to creating an Amazon Lightsail instance, connecting via SSH and browser terminal, and configuring it for your first web project.

---

Creating a Lightsail instance takes about two minutes. Connecting to it takes about ten seconds. That's the whole pitch - it's simple, fast, and you don't need to understand VPCs or security groups to get started. Here's the complete walkthrough.

## Step 1: Choose Your Blueprint

Blueprints are pre-configured images. Lightsail offers two categories:

**OS-only blueprints** give you a clean operating system:
- Amazon Linux 2
- Ubuntu 20.04 / 22.04
- Debian
- FreeBSD
- openSUSE
- Windows Server

**Application blueprints** include pre-installed software:
- WordPress
- LAMP stack
- Node.js
- Django
- Drupal
- Ghost
- Joomla
- Plesk
- And more

List what's available.

```bash
# List all active OS-only blueprints
aws lightsail get-blueprints \
  --query 'blueprints[?isActive==`true` && type==`os`].{Id: blueprintId, Name: name, Description: description}' \
  --output table

# List all active application blueprints
aws lightsail get-blueprints \
  --query 'blueprints[?isActive==`true` && type==`app`].{Id: blueprintId, Name: name, Description: description}' \
  --output table
```

## Step 2: Pick a Plan

Lightsail plans bundle compute, storage, and transfer into fixed monthly prices.

```bash
# See all available plans with pricing
aws lightsail get-bundles \
  --query 'bundles[?isActive==`true` && supportedPlatforms[0]==`LINUX_UNIX`].{
    Id: bundleId,
    Price: price,
    CPUs: cpuCount,
    RAM_GB: ramSizeInGb,
    Disk_GB: diskSizeInGb,
    Transfer_TB: transferPerMonthInGb
  }' \
  --output table
```

For most starter projects, the $5/month plan (1 vCPU, 1GB RAM, 40GB SSD) is plenty.

## Step 3: Create the Instance

Now create it. You need to pick a name, availability zone, blueprint, and bundle.

```bash
# Create a Ubuntu instance on the $5/month plan
aws lightsail create-instances \
  --instance-names my-first-server \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id small_3_0 \
  --tags key=Name,value=my-first-server key=Project,value=learning
```

Wait for it to become running.

```bash
# Check the instance status
aws lightsail get-instance \
  --instance-name my-first-server \
  --query 'instance.{State: state.name, IP: publicIpAddress, Zone: location.availabilityZone, Blueprint: blueprintId}'
```

It usually takes 30-60 seconds to go from `pending` to `running`.

## Step 4: Connect via Browser

The fastest way to connect is through the browser-based SSH terminal. You can do this from the Lightsail console - just click your instance and hit "Connect using SSH." But let's also set up proper SSH access.

## Step 5: Connect via SSH

Download the default SSH key pair that Lightsail created for your account.

```bash
# Download the default SSH key pair
aws lightsail download-default-key-pair \
  --query 'privateKeyBase64' \
  --output text | base64 -d > ~/.ssh/lightsail-default.pem

# Set proper permissions
chmod 600 ~/.ssh/lightsail-default.pem
```

Now SSH into your instance.

```bash
# Get the public IP
IP=$(aws lightsail get-instance \
  --instance-name my-first-server \
  --query 'instance.publicIpAddress' \
  --output text)

# Connect (Ubuntu uses 'ubuntu' as the default user)
ssh -i ~/.ssh/lightsail-default.pem ubuntu@$IP
```

Default usernames by blueprint:
- Ubuntu: `ubuntu`
- Amazon Linux: `ec2-user`
- Debian: `admin`
- FreeBSD: `ec2-user`
- WordPress/LAMP/Node.js: varies, check the blueprint docs

## Step 6: Use Your Own SSH Key

For better security, use your own SSH key instead of the default one.

```bash
# Create a key pair in Lightsail
aws lightsail create-key-pair \
  --key-pair-name my-custom-key \
  --query 'privateKeyBase64' \
  --output text | base64 -d > ~/.ssh/lightsail-custom.pem

chmod 600 ~/.ssh/lightsail-custom.pem
```

Or import an existing public key.

```bash
# Import your existing public key
aws lightsail import-key-pair \
  --key-pair-name my-existing-key \
  --public-key-base64 "$(cat ~/.ssh/id_rsa.pub | base64)"
```

To use a custom key with a new instance, specify it during creation.

```bash
# Create an instance with a custom key pair
aws lightsail create-instances \
  --instance-names secure-server \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id small_3_0 \
  --key-pair-name my-custom-key
```

## Step 7: Initial Server Setup

Once connected, do some basic setup.

```bash
# Update the system packages
sudo apt update && sudo apt upgrade -y

# Set the timezone
sudo timedatectl set-timezone UTC

# Create a non-root user with sudo access
sudo adduser deployer
sudo usermod -aG sudo deployer

# Copy SSH key for the new user
sudo mkdir -p /home/deployer/.ssh
sudo cp ~/.ssh/authorized_keys /home/deployer/.ssh/
sudo chown -R deployer:deployer /home/deployer/.ssh
sudo chmod 700 /home/deployer/.ssh
sudo chmod 600 /home/deployer/.ssh/authorized_keys
```

## Step 8: Configure SSH for Easy Access

Set up an SSH config on your local machine so you don't have to remember the IP and key every time.

Add this to your `~/.ssh/config` file.

```
Host lightsail
    HostName YOUR_INSTANCE_IP
    User ubuntu
    IdentityFile ~/.ssh/lightsail-default.pem
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Now you can connect with just `ssh lightsail`.

## Step 9: Set Up a User Data Script

For automated setup, use a launch script that runs when the instance first boots.

```bash
# Create an instance with a startup script
aws lightsail create-instances \
  --instance-names auto-configured \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id small_3_0 \
  --user-data '#!/bin/bash
apt-get update
apt-get install -y nginx nodejs npm git
systemctl enable nginx
systemctl start nginx
echo "Server ready at $(date)" > /var/log/setup-complete.log'
```

The user data script runs as root on first boot. Check `/var/log/cloud-init-output.log` if you need to debug it.

## Step 10: Verify Everything Works

Run through a quick verification.

```bash
# From your local machine - check the instance is responding
IP=$(aws lightsail get-instance \
  --instance-name my-first-server \
  --query 'instance.publicIpAddress' --output text)

# Test SSH
ssh -i ~/.ssh/lightsail-default.pem ubuntu@$IP "echo 'SSH works!'"

# Test HTTP (if you installed a web server)
curl -s -o /dev/null -w "%{http_code}" http://$IP
```

## Upgrading Your Instance

If you need more power, take a snapshot and create a new instance from it with a bigger plan.

```bash
# Create a snapshot of your current instance
aws lightsail create-instance-snapshot \
  --instance-name my-first-server \
  --instance-snapshot-name my-first-server-snapshot

# Wait for snapshot to complete
aws lightsail get-instance-snapshot \
  --instance-snapshot-name my-first-server-snapshot \
  --query 'instanceSnapshot.state'

# Create a bigger instance from the snapshot
aws lightsail create-instances-from-snapshot \
  --instance-names my-upgraded-server \
  --availability-zone us-east-1a \
  --instance-snapshot-name my-first-server-snapshot \
  --bundle-id medium_3_0
```

## Troubleshooting Connection Issues

If you can't connect:

1. **Instance not running**: Check `aws lightsail get-instance --instance-name NAME`
2. **Wrong key**: Make sure you're using the key pair associated with the instance
3. **Wrong username**: Different blueprints use different default users
4. **Port blocked**: Check firewall with `aws lightsail get-instance-port-states --instance-name NAME`
5. **Key permissions**: Must be `chmod 600` on your private key
6. **Network issue**: Try the browser-based SSH from the console as a fallback

Lightsail instances are great for getting projects off the ground quickly. Once you're connected and configured, look at our guides for [setting up containers](https://oneuptime.com/blog/post/setup-lightsail-container-service/view) and [databases](https://oneuptime.com/blog/post/setup-lightsail-database/view) on Lightsail.
