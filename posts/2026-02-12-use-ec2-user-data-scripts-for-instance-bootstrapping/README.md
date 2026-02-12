# How to Use EC2 User Data Scripts for Instance Bootstrapping

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, User Data, Automation, Cloud-Init

Description: Learn how to use EC2 user data scripts to automatically configure instances on launch, including practical examples for web servers, applications, and monitoring agents.

---

Every time you launch an EC2 instance, there's a bunch of setup to do - installing packages, configuring services, pulling application code, setting environment variables. Doing this manually every time is tedious and error-prone. User data scripts let you automate all of it so instances come up fully configured without any human intervention.

User data runs once when the instance first boots (by default). You provide a script, and EC2 executes it as root during the initial startup sequence.

## How User Data Works

When you launch an instance with user data:

1. The instance boots and loads the OS
2. Cloud-init (on Linux) or EC2Launch (on Windows) reads the user data
3. The script executes as root
4. The instance finishes booting and becomes available

User data is stored in the instance metadata at `http://169.254.169.254/latest/user-data` and is limited to 16 KB. If you need more, the script can download additional configuration from S3 or another source.

## Basic Shell Script

The simplest form is a bash script that starts with `#!/bin/bash`:

```bash
#!/bin/bash
# Install and start Nginx web server on Amazon Linux 2023

yum update -y
yum install -y nginx

# Start Nginx and enable it on boot
systemctl start nginx
systemctl enable nginx

# Create a simple index page
cat > /usr/share/nginx/html/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head><title>Hello from EC2</title></head>
<body><h1>Instance is running!</h1></body>
</html>
HTMLEOF
```

## Adding User Data via the Console

When launching an instance:

1. In the "Advanced details" section, scroll down to "User data"
2. Paste your script in the text box
3. Make sure the script starts with `#!/bin/bash` (or `#!/bin/python3`, etc.)
4. Launch the instance

## Adding User Data via the CLI

```bash
# Launch an instance with a user data script from a file
aws ec2 run-instances \
    --image-id ami-0123456789abcdef0 \
    --instance-type t3.micro \
    --key-name my-key \
    --security-group-ids sg-0123456789abcdef0 \
    --user-data file://setup-script.sh
```

Or inline (base64 encoded):

```bash
# Launch with inline user data (automatically base64 encoded)
aws ec2 run-instances \
    --image-id ami-0123456789abcdef0 \
    --instance-type t3.micro \
    --user-data '#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd'
```

## Practical Examples

### Web Application Server

This script sets up a Node.js application server with PM2:

```bash
#!/bin/bash
# Bootstrap a Node.js application server

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs git

# Install PM2 globally for process management
npm install -g pm2

# Create app user
useradd -m -s /bin/bash appuser

# Clone the application (from a private repo using deploy key)
sudo -u appuser git clone https://github.com/myorg/myapp.git /home/appuser/app

# Install dependencies
cd /home/appuser/app
sudo -u appuser npm install --production

# Set environment variables
cat > /home/appuser/app/.env << 'EOF'
NODE_ENV=production
PORT=3000
EOF

# Start the application with PM2
sudo -u appuser pm2 start /home/appuser/app/server.js --name myapp
sudo -u appuser pm2 save

# Set PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u appuser --hp /home/appuser
```

### Docker Host

Set up an instance as a Docker host ready to run containers:

```bash
#!/bin/bash
# Set up Docker on Amazon Linux 2023

# Install Docker
yum install -y docker

# Start Docker and enable on boot
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group (so you don't need sudo)
usermod -aG docker ec2-user

# Install Docker Compose
COMPOSE_VERSION="v2.24.0"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Pull and run your application
docker pull myregistry/myapp:latest
docker run -d --name myapp -p 80:3000 --restart always myregistry/myapp:latest
```

### Monitoring Agent Installation

Install a monitoring agent so the instance reports metrics from the moment it's live:

```bash
#!/bin/bash
# Install CloudWatch agent and configure basic monitoring

# Install the CloudWatch agent
yum install -y amazon-cloudwatch-agent

# Create the agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
    "metrics": {
        "metrics_collected": {
            "mem": {
                "measurement": ["mem_used_percent"]
            },
            "disk": {
                "measurement": ["used_percent"],
                "resources": ["/"]
            }
        },
        "append_dimensions": {
            "InstanceId": "${aws:InstanceId}"
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "ec2-system-logs",
                        "log_stream_name": "{instance_id}/messages"
                    }
                ]
            }
        }
    }
}
EOF

# Start the CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json \
    -s
```

## Using Cloud-Init Directives

Besides shell scripts, user data supports cloud-init directives in YAML format:

```yaml
#cloud-config
# Cloud-init configuration for a web server

package_update: true
package_upgrade: true

packages:
  - nginx
  - git
  - htop

write_files:
  - path: /etc/nginx/conf.d/app.conf
    content: |
      server {
          listen 80;
          server_name _;
          location / {
              proxy_pass http://localhost:3000;
          }
      }

runcmd:
  - systemctl start nginx
  - systemctl enable nginx

final_message: "Instance setup complete after $UPTIME seconds"
```

Cloud-init directives are more structured and readable than bash scripts for common tasks like installing packages and writing config files.

## Combining Scripts and Cloud-Init

You can use a MIME multipart format to combine both:

```bash
Content-Type: multipart/mixed; boundary="==BOUNDARY=="
MIME-Version: 1.0

--==BOUNDARY==
Content-Type: text/cloud-config; charset="us-ascii"

#cloud-config
packages:
  - nginx
  - git

--==BOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"

#!/bin/bash
echo "Running custom setup..."
# Your custom script here

--==BOUNDARY==--
```

## Debugging User Data Scripts

User data scripts fail silently from your perspective - the instance launches, but the configuration didn't work. Here's how to debug:

### Check the Log

```bash
# SSH into the instance and check the cloud-init log
cat /var/log/cloud-init-output.log

# For more detailed cloud-init logs
cat /var/log/cloud-init.log
```

### Check the User Data

Verify the user data was received correctly:

```bash
# From inside the instance, check the user data
curl http://169.254.169.254/latest/user-data
```

For more on instance metadata, see our guide on [accessing EC2 instance metadata](https://oneuptime.com/blog/post/access-ec2-instance-metadata-from-within-instance/view).

### View from the Console

In the EC2 console: select your instance > Actions > Instance settings > Edit user data. This shows what was submitted (only viewable when the instance is stopped).

### Common Failures

**Script doesn't start with the right shebang line.** The very first line must be `#!/bin/bash` (or another interpreter). No blank lines or spaces before it.

**Package installation fails.** The instance might not have internet access. Check the VPC route table and security group outbound rules.

**Permission issues.** User data runs as root, but if you switch to another user (via `su` or `sudo -u`), make sure that user has the right permissions.

**Script is too large.** User data is limited to 16 KB. If you need more, download the bulk of your configuration from S3:

```bash
#!/bin/bash
# Keep user data small - download the real setup script from S3
aws s3 cp s3://my-config-bucket/setup.sh /tmp/setup.sh
chmod +x /tmp/setup.sh
/tmp/setup.sh
```

## Running User Data on Every Boot

By default, user data scripts only run on the first boot. To run on every boot, use a cloud-init directive or move your script to a per-boot location:

```bash
#!/bin/bash
# This part runs only on first boot - install the per-boot script

cat > /var/lib/cloud/scripts/per-boot/my-script.sh << 'EOF'
#!/bin/bash
# This runs every time the instance starts
echo "$(date) - Instance booted" >> /var/log/boot-events.log

# Pull latest config from S3 on each boot
aws s3 cp s3://my-config-bucket/latest-config.json /etc/myapp/config.json
systemctl restart myapp
EOF

chmod +x /var/lib/cloud/scripts/per-boot/my-script.sh
```

## User Data in Launch Templates

For Auto Scaling groups, put your user data in a [launch template](https://oneuptime.com/blog/post/use-launch-templates-for-ec2-instances/view). This way, every instance launched by the ASG gets the same bootstrapping:

```bash
# Create a launch template with user data
aws ec2 create-launch-template \
    --launch-template-name webapp-template \
    --launch-template-data '{
        "ImageId": "ami-0123456789abcdef0",
        "InstanceType": "t3.micro",
        "UserData": "'$(base64 -w0 setup-script.sh)'"
    }'
```

User data scripts are one of the most practical automation tools in AWS. They bridge the gap between a base AMI and a fully configured server, and they're essential for Auto Scaling, immutable infrastructure, and reproducible deployments.
