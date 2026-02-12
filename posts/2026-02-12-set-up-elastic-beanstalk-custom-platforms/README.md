# How to Set Up Elastic Beanstalk Custom Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Custom Platforms, DevOps

Description: Guide to building and using custom platforms in AWS Elastic Beanstalk with Packer, including custom AMIs, platform scripts, and builder configuration.

---

The managed platforms in Elastic Beanstalk cover most use cases - Python, Java, Node.js, Docker, and others. But sometimes you need something they don't offer. Maybe you're running a language that doesn't have a managed platform, or you need specific system packages baked into the AMI, or your compliance requirements demand a hardened base image.

That's where custom platforms come in. You define exactly what goes on the machine - the operating system, runtime, web server, and deployment scripts - and Elastic Beanstalk builds an AMI from your specification. It's more work upfront, but it gives you complete control.

## How Custom Platforms Work

Custom platforms use Packer to build Amazon Machine Images (AMIs). You provide:

- A `platform.yaml` file describing the platform
- Packer templates defining how to build the AMI
- Scripts that handle deployment, configuration, and monitoring

When you create a custom platform, Elastic Beanstalk spins up a temporary EC2 instance, runs your Packer build, captures the AMI, and registers it as a platform version. Then you can use that platform just like any managed one.

```mermaid
graph LR
    A[platform.yaml] --> B[Packer Build]
    B --> C[EC2 Instance]
    C --> D[Run Scripts]
    D --> E[Capture AMI]
    E --> F[Custom Platform]
    F --> G[EB Environment]
```

## Project Structure

Here's the directory layout for a custom platform.

```
my-custom-platform/
├── platform.yaml
├── packer/
│   └── custom_platform.json
├── builder/
│   ├── setup.sh
│   └── builder.sh
└── scripts/
    ├── deploy.sh
    ├── start.sh
    ├── stop.sh
    ├── healthcheck.sh
    └── predeploy.sh
```

## Creating the Platform Definition

The `platform.yaml` file is the entry point. It tells Elastic Beanstalk where to find your Packer template and what metadata to associate with the platform.

```yaml
# platform.yaml - Custom platform definition
version: "1.0"

provisioner:
  type: packer
  template: packer/custom_platform.json
  flavor: amazon-linux-2023

metadata:
  maintainer: "your-team@example.com"
  description: "Custom platform with Rust runtime and Nginx"
  operating_system_name: "Amazon Linux 2023"
  operating_system_version: "2023"
  programming_language_name: "Rust"
  programming_language_version: "1.75"
  framework_name: "Actix Web"
  framework_version: "4"
```

## Writing the Packer Template

The Packer template defines how to build the AMI. It specifies the base AMI, provisioners (scripts to run), and builder configuration.

```json
{
    "variables": {
        "platform_version": "{{env `PLATFORM_VERSION`}}",
        "region": "us-east-1"
    },
    "builders": [
        {
            "type": "amazon-ebs",
            "region": "{{user `region`}}",
            "source_ami_filter": {
                "filters": {
                    "name": "al2023-ami-*-x86_64",
                    "virtualization-type": "hvm",
                    "root-device-type": "ebs"
                },
                "owners": ["amazon"],
                "most_recent": true
            },
            "instance_type": "t3.medium",
            "ssh_username": "ec2-user",
            "ami_name": "custom-eb-platform-{{timestamp}}"
        }
    ],
    "provisioners": [
        {
            "type": "file",
            "source": "scripts/",
            "destination": "/tmp/scripts/"
        },
        {
            "type": "shell",
            "scripts": [
                "builder/setup.sh",
                "builder/builder.sh"
            ]
        }
    ]
}
```

## Setup Script

The setup script installs the base dependencies your platform needs. This runs once during the AMI build.

```bash
#!/bin/bash
# builder/setup.sh - Install base dependencies for the custom platform
set -e

echo "=== Installing base packages ==="
sudo dnf update -y
sudo dnf install -y \
    gcc \
    openssl-devel \
    nginx \
    python3 \
    python3-pip \
    awscli \
    jq

echo "=== Installing Rust toolchain ==="
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup default stable

echo "=== Configuring Nginx ==="
sudo systemctl enable nginx

echo "=== Creating application directories ==="
sudo mkdir -p /var/app/current
sudo mkdir -p /var/app/staging
sudo mkdir -p /var/log/app
sudo chown -R ec2-user:ec2-user /var/app
sudo chown -R ec2-user:ec2-user /var/log/app

echo "=== Setup complete ==="
```

## Builder Script

The builder script sets up the deployment hooks that Elastic Beanstalk calls during the application lifecycle.

```bash
#!/bin/bash
# builder/builder.sh - Install EB deployment scripts
set -e

echo "=== Installing deployment scripts ==="

# Copy scripts to their final locations
sudo mkdir -p /opt/elasticbeanstalk/hooks/appdeploy/pre
sudo mkdir -p /opt/elasticbeanstalk/hooks/appdeploy/post
sudo mkdir -p /opt/elasticbeanstalk/hooks/configdeploy/pre
sudo mkdir -p /opt/elasticbeanstalk/hooks/configdeploy/post
sudo mkdir -p /opt/elasticbeanstalk/hooks/restartappserver/pre
sudo mkdir -p /opt/elasticbeanstalk/hooks/restartappserver/post

# Install the deployment scripts
sudo cp /tmp/scripts/predeploy.sh /opt/elasticbeanstalk/hooks/appdeploy/pre/01_predeploy.sh
sudo cp /tmp/scripts/deploy.sh /opt/elasticbeanstalk/hooks/appdeploy/post/01_deploy.sh
sudo cp /tmp/scripts/start.sh /opt/elasticbeanstalk/hooks/restartappserver/post/01_start.sh

# Make all scripts executable
sudo chmod +x /opt/elasticbeanstalk/hooks/appdeploy/pre/*.sh
sudo chmod +x /opt/elasticbeanstalk/hooks/appdeploy/post/*.sh
sudo chmod +x /opt/elasticbeanstalk/hooks/restartappserver/post/*.sh

echo "=== Builder complete ==="
```

## Deployment Scripts

These scripts run every time you deploy a new version of your application.

```bash
#!/bin/bash
# scripts/predeploy.sh - Run before deployment
set -e

echo "=== Pre-deploy: Stopping current application ==="
if systemctl is-active --quiet myapp; then
    sudo systemctl stop myapp
fi

echo "=== Pre-deploy: Backing up current version ==="
if [ -d /var/app/current ]; then
    sudo cp -r /var/app/current /var/app/previous
fi
```

```bash
#!/bin/bash
# scripts/deploy.sh - Main deployment script
set -e

echo "=== Deploy: Moving application to current ==="
sudo cp -r /var/app/staging/* /var/app/current/

echo "=== Deploy: Building application ==="
cd /var/app/current
source "$HOME/.cargo/env"

# Build the Rust application in release mode
cargo build --release

echo "=== Deploy: Starting application ==="
sudo systemctl restart myapp

echo "=== Deploy: Configuring Nginx ==="
sudo cp /var/app/current/nginx.conf /etc/nginx/conf.d/app.conf
sudo nginx -t
sudo systemctl reload nginx

echo "=== Deploy complete ==="
```

```bash
#!/bin/bash
# scripts/start.sh - Start the application
set -e

cd /var/app/current
source "$HOME/.cargo/env"

# Start the application as a systemd service
sudo systemctl start myapp

echo "=== Application started ==="
```

```bash
#!/bin/bash
# scripts/healthcheck.sh - Check application health
#!/bin/bash

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)

if [ "$RESPONSE" = "200" ]; then
    echo "OK"
    exit 0
else
    echo "UNHEALTHY - HTTP $RESPONSE"
    exit 1
fi
```

## Creating a Systemd Service

Your application needs a systemd service file so the platform scripts can start and stop it reliably.

```ini
# myapp.service - Systemd service definition for the application
[Unit]
Description=My Custom Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/var/app/current
ExecStart=/var/app/current/target/release/myapp
Restart=always
RestartSec=5
EnvironmentFile=/opt/elasticbeanstalk/deployment/env

[Install]
WantedBy=multi-user.target
```

Include this in your builder script to install during AMI creation.

```bash
# Add to builder.sh
sudo cp /tmp/scripts/myapp.service /etc/systemd/system/myapp.service
sudo systemctl daemon-reload
sudo systemctl enable myapp
```

## Building the Custom Platform

With everything in place, create the platform.

```bash
# Create the custom platform
eb platform create my-custom-platform --version 1.0.0

# List available platform versions
eb platform list

# Check build status
eb platform status
```

The build takes 15-30 minutes depending on what you're installing. Packer launches an EC2 instance, runs your scripts, then captures the AMI.

## Using the Custom Platform

Once the platform is built, create an environment that uses it.

```bash
# Create an environment using the custom platform
eb create production --platform "my-custom-platform" --instance-type t3.medium

# Or specify the platform ARN directly
eb create production --platform "arn:aws:elasticbeanstalk:us-east-1:123456789:platform/my-custom-platform/1.0.0"
```

## Updating the Platform

When you need to update system packages or the runtime version, create a new platform version.

```bash
# Create a new version
eb platform create my-custom-platform --version 1.1.0

# Update existing environments to use the new version
eb upgrade --platform "arn:aws:elasticbeanstalk:us-east-1:123456789:platform/my-custom-platform/1.1.0"
```

## When to Use Custom Platforms vs Docker

Custom platforms and Docker both solve the "I need a custom runtime" problem, but they take different approaches:

**Choose custom platforms when:**
- You need to control the entire OS stack
- Compliance requires specific AMI hardening
- You want native performance without container overhead
- Your runtime doesn't containerize well

**Choose Docker when:**
- You already have Dockerfiles
- You want portability across cloud providers
- Development/production parity matters most
- You don't need OS-level customization

For most teams, Docker on Elastic Beanstalk is simpler. Check out our guide on [deploying Docker apps with Elastic Beanstalk](https://oneuptime.com/blog/post/deploy-docker-app-with-elastic-beanstalk/view) if that's a better fit.

## Wrapping Up

Custom platforms are the escape hatch when managed platforms don't fit. They require more upfront work - writing Packer templates, deployment scripts, and maintaining the AMI - but they give you total control. If you're running a language without managed support, need a hardened AMI for compliance, or have specific system-level requirements, custom platforms are the way to go.
