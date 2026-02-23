# How to Create EC2 Instance with User Data Script in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EC2, User Data, Automation

Description: Learn how to provision EC2 instances with user data scripts in Terraform to automate instance bootstrapping, software installation, and configuration on launch.

---

Every time you spin up a new EC2 instance, there is a list of things you need to do before it is ready: install packages, configure services, pull application code, set up monitoring agents. Doing this manually is tedious and error-prone. User data scripts solve this by running commands automatically when the instance first boots.

Terraform makes it easy to attach user data scripts to your EC2 instances, whether it is a simple bash script or a complex cloud-init configuration. Let's look at the different approaches and when to use each one.

## Basic User Data Script

The simplest approach is an inline bash script passed directly to the `user_data` argument.

```hcl
# Create an EC2 instance with a basic user data script
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.web.id]

  # User data script runs as root on first boot
  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
    echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html
  EOF

  tags = {
    Name = "web-server"
  }
}
```

A few important things to know about user data:

- The script runs as root, so you don't need `sudo`
- It only runs on the **first boot** of the instance by default
- Output is logged to `/var/log/cloud-init-output.log`
- The instance is "running" in AWS before the script finishes - Terraform won't wait for it to complete

## Using the templatefile Function

For scripts that need dynamic values, `templatefile` is much cleaner than string interpolation.

```hcl
# Pass variables into the user data script using templatefile
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private.id

  vpc_security_group_ids = [aws_security_group.app.id]

  # Load the script from a file and inject variables
  user_data = templatefile("${path.module}/scripts/bootstrap.sh", {
    app_version    = var.app_version
    db_host        = aws_db_instance.main.address
    db_name        = var.db_name
    environment    = var.environment
    s3_config_bucket = aws_s3_bucket.config.id
  })

  tags = {
    Name = "app-server-${var.environment}"
  }
}
```

And the template file itself:

```bash
#!/bin/bash
# scripts/bootstrap.sh - Bootstrap script for the application server
set -euxo pipefail

# Log all output for debugging
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting bootstrap for environment: ${environment}"

# Install dependencies
yum update -y
yum install -y docker jq awscli

# Start Docker
systemctl start docker
systemctl enable docker

# Pull application configuration from S3
aws s3 cp s3://${s3_config_bucket}/${environment}/config.json /opt/app/config.json

# Create application environment file
cat > /opt/app/.env <<ENVFILE
APP_VERSION=${app_version}
DB_HOST=${db_host}
DB_NAME=${db_name}
ENVIRONMENT=${environment}
ENVFILE

# Pull and run the application container
docker pull myregistry/myapp:${app_version}
docker run -d \
  --name myapp \
  --env-file /opt/app/.env \
  -p 8080:8080 \
  myregistry/myapp:${app_version}

echo "Bootstrap complete"
```

The `templatefile` function replaces `${variable_name}` placeholders with actual values at plan time. If your bash script uses shell variables like `$HOME`, you need to escape them as `$${HOME}` so Terraform doesn't try to interpolate them.

## Using base64encode for User Data

Some scenarios require base64-encoded user data, particularly when working with launch templates.

```hcl
# Base64 encode the user data for launch templates
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  # user_data in launch templates must be base64 encoded
  user_data = base64encode(templatefile("${path.module}/scripts/bootstrap.sh", {
    environment = var.environment
    cluster_name = var.cluster_name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "app-server"
    }
  }
}
```

## Cloud-Init Configuration

For more structured bootstrapping, cloud-init's YAML format gives you better control than raw bash scripts.

```hcl
# Use cloud-init YAML for structured instance configuration
resource "aws_instance" "structured" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.small"
  subnet_id     = aws_subnet.private.id

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = <<-EOF
    #cloud-config
    package_update: true
    package_upgrade: true

    packages:
      - nginx
      - certbot
      - python3-certbot-nginx
      - fail2ban

    write_files:
      - path: /etc/nginx/conf.d/app.conf
        content: |
          server {
              listen 80;
              server_name ${var.domain_name};

              location / {
                  proxy_pass http://localhost:8080;
                  proxy_set_header Host $host;
                  proxy_set_header X-Real-IP $remote_addr;
              }
          }

    runcmd:
      - systemctl enable nginx
      - systemctl start nginx
      - systemctl enable fail2ban
      - systemctl start fail2ban

    final_message: "Cloud-init completed after $UPTIME seconds"
  EOF

  tags = {
    Name = "structured-server"
  }
}
```

Cloud-init supports multi-part MIME content too, which lets you combine different content types.

## Multi-Part User Data

When you need both cloud-config directives and shell scripts, use the `cloudinit_config` data source.

```hcl
# Combine multiple user data parts using cloudinit_config
data "cloudinit_config" "app" {
  gzip          = true
  base64_encode = true

  # Part 1: Cloud-config for package installation
  part {
    content_type = "text/cloud-config"
    filename     = "cloud-config.yaml"
    content = yamlencode({
      package_update  = true
      package_upgrade = true
      packages        = ["docker.io", "awscli", "jq"]
    })
  }

  # Part 2: Shell script for application setup
  part {
    content_type = "text/x-shellscript"
    filename     = "setup-app.sh"
    content = templatefile("${path.module}/scripts/setup-app.sh", {
      app_version = var.app_version
      environment = var.environment
    })
  }

  # Part 3: Shell script for monitoring agent
  part {
    content_type = "text/x-shellscript"
    filename     = "setup-monitoring.sh"
    content = templatefile("${path.module}/scripts/setup-monitoring.sh", {
      monitoring_endpoint = var.monitoring_endpoint
    })
  }
}

# Use the combined cloud-init config as user data
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.private.id

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data_base64 = data.cloudinit_config.app.rendered

  tags = {
    Name = "app-${var.environment}"
  }
}
```

## Handling User Data Changes

By default, changing user data forces Terraform to destroy and recreate the EC2 instance. If you want to update user data without replacement, you can use `user_data_replace_on_change`.

```hcl
# Control whether user data changes trigger instance replacement
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = templatefile("${path.module}/scripts/bootstrap.sh", {
    version = var.app_version
  })

  # Set to false to update user data without destroying the instance
  # Note: the new script won't run until the instance is rebooted
  user_data_replace_on_change = false

  tags = {
    Name = "app-server"
  }
}
```

Keep in mind that even with `user_data_replace_on_change = false`, the updated script won't run until the instance is stopped and started (or you configure cloud-init to run on every boot).

## Debugging User Data Scripts

When your user data script doesn't work as expected, here's how to troubleshoot:

```bash
# SSH into the instance and check the cloud-init log
cat /var/log/cloud-init-output.log

# Check cloud-init status
cloud-init status

# View the actual user data that was passed to the instance
curl http://169.254.169.254/latest/user-data

# Re-run cloud-init manually (useful during development)
cloud-init clean
cloud-init init
```

You can also add error handling to your scripts to make debugging easier:

```bash
#!/bin/bash
# Robust error handling for user data scripts
set -euxo pipefail

# Send all output to both console and a log file
exec > >(tee /var/log/user-data.log) 2>&1

# Trap errors and log them
trap 'echo "Error on line $LINENO. Exit code: $?" >> /var/log/user-data-errors.log' ERR

# Signal completion by creating a marker file
# Other automation can check for this file
finish() {
  echo "User data script finished at $(date)" > /var/log/user-data-complete
}
trap finish EXIT

# Your actual setup commands here
echo "Starting setup..."
```

## Using SSM Parameters for Secrets

Never hardcode secrets in user data. Use AWS Systems Manager Parameter Store instead.

```hcl
# Store secrets in SSM Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.environment}/db/password"
  type  = "SecureString"
  value = var.db_password
}

# IAM role that allows the EC2 instance to read SSM parameters
resource "aws_iam_role" "app" {
  name = "app-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "ssm_read" {
  name = "ssm-read-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ]
      Resource = "arn:aws:ssm:*:*:parameter/${var.environment}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "app-instance-profile"
  role = aws_iam_role.app.name
}
```

Then in your bootstrap script, fetch the secrets at runtime:

```bash
#!/bin/bash
# Fetch secrets from SSM at boot time instead of embedding them
DB_PASSWORD=$(aws ssm get-parameter \
  --name "/${environment}/db/password" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --region us-east-1)

export DB_PASSWORD
```

## Summary

User data scripts are the bridge between provisioning infrastructure and configuring it. For simple setups, an inline bash script works fine. As complexity grows, move to `templatefile` for variable injection, cloud-init for structured configuration, and multi-part MIME for combining different approaches. Always keep secrets out of user data itself and fetch them from SSM or Secrets Manager at runtime.

For related topics, check out our guides on [creating launch templates for auto scaling](https://oneuptime.com/blog/post/2026-02-23-create-launch-templates-for-auto-scaling-in-terraform/view) and [creating EC2 with multiple network interfaces](https://oneuptime.com/blog/post/2026-02-23-create-ec2-with-multiple-network-interfaces-in-terraform/view).
