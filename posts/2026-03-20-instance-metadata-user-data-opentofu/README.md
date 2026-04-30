# Instance Metadata and User Data with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, OpenTofu, EC2, User Data, Cloud-init, Infrastructure as Code

Description: Learn how to configure EC2 instance metadata settings and pass user data scripts using OpenTofu for automated instance bootstrapping.

## What is Instance Metadata?

AWS EC2 instance metadata is data about your instance available at `http://169.254.169.254/latest/meta-data/`. It includes the instance ID, AMI ID, network interfaces, IAM role credentials, and more. User data is data passed to the instance at launch; on Linux instances, it can be shell scripts or cloud-init directives, and the instance is responsible for interpreting it.

## Configuring IMDSv2 (Recommended)

IMDSv2 (Instance Metadata Service v2) requires a session token, making it more secure than IMDSv1.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"   # Enforces IMDSv2
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }
}
```

## Passing User Data

### Inline User Data

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = <<-EOT
    #!/bin/bash
    set -e
    # Example for Ubuntu/Debian-based AMIs
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo "Hello from $(hostname)" > /var/www/html/index.html
  EOT

  user_data_replace_on_change = true
}
```

### User Data from a File

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = file("${path.module}/scripts/bootstrap.sh")
}
```

### Templated User Data

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data = templatefile("${path.module}/scripts/bootstrap.tpl", {
    environment = var.environment
    app_version = var.app_version
    db_endpoint = aws_db_instance.main.endpoint
  })
}
```

### Cloud-Init Multi-Part User Data

```hcl
data "cloudinit_config" "server_config" {
  gzip          = true
  base64_encode = true

  part {
    content_type = "text/cloud-config"
    content = yamlencode({
      packages = ["nginx", "curl", "jq"]
      runcmd   = ["systemctl enable nginx", "systemctl start nginx"]
    })
  }

  part {
    content_type = "text/x-shellscript"
    content      = file("${path.module}/scripts/configure-app.sh")
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data_base64 = data.cloudinit_config.server_config.rendered
}
```

## Launch Template with User Data

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = "t3.micro"

  user_data = base64encode(file("${path.module}/scripts/bootstrap.sh"))

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }
}
```

## Reading Metadata Inside the Instance

```bash
# IMDSv2 - get token first

TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Use token to get metadata
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id

curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/local-ipv4
```

## Best Practices

1. **Always use IMDSv2** - set `http_tokens = "required"` to add defense in depth against SSRF and related metadata access attacks
2. **Keep user data idempotent** - scripts should be safe to run multiple times
3. **Log user data output** - cloud-init logs to `/var/log/cloud-init-output.log`
4. **Use `user_data_replace_on_change = true`** to force instance replacement when scripts change
5. **Avoid secrets in user data** - use SSM Parameter Store or Secrets Manager instead

## Conclusion

OpenTofu gives you fine-grained control over EC2 instance metadata settings and bootstrapping scripts. By enforcing IMDSv2 and using cloud-init for configuration, you create more secure and reproducible instance deployments.
