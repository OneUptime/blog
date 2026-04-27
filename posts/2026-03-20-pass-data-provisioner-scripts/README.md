# How to Pass Data to Provisioner Scripts in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Provisioner

Description: Learn how to pass resource attributes, variables, and computed values to provisioner scripts in OpenTofu using environment variables, interpolation, and the file provisioner.

## Introduction

Provisioner scripts often need information about the resource being created or other parts of your configuration - IP addresses, resource IDs, database endpoints, and so on. OpenTofu provides several ways to pass this data to provisioner scripts: environment variables in `local-exec`, string interpolation in `remote-exec` inline commands, and the `file` provisioner for config files.

## Method 1: Environment Variables in local-exec

The safest way to pass data to local scripts:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "${path.module}/scripts/post-create.sh"

    environment = {
      # Resource attributes
      INSTANCE_ID   = self.id
      PUBLIC_IP     = self.public_ip
      PRIVATE_IP    = self.private_ip

      # Variables
      ENVIRONMENT   = var.environment
      REGION        = var.region

      # Other resource attributes
      DB_HOST       = aws_db_instance.main.address
      BUCKET_NAME   = aws_s3_bucket.assets.bucket
    }
  }
}
```

```bash
#!/bin/bash
# scripts/post-create.sh

set -euo pipefail

echo "Configuring instance $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Environment: $ENVIRONMENT"

# Use the passed values
aws ec2 create-tags \
  --region "$REGION" \
  --resources "$INSTANCE_ID" \
  --tags Key=DeployedAt,Value="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Method 2: String Interpolation in remote-exec

Use `self.attribute` to interpolate resource values directly:

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.key_path)
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      # Interpolate values into the command string
      "echo 'Instance ID: ${self.id}' >> /var/log/init.log",
      "echo 'Region: ${var.region}' >> /var/log/init.log",
      "export DB_HOST='${aws_db_instance.main.address}'",
      "export APP_NAME='${var.app_name}'",
      "/opt/app/configure.sh"
    ]
  }
}
```

## Method 3: Write a Config File with file Provisioner

Generate a configuration file locally, then upload it:

```hcl
# Generate a config file from a template
resource "local_file" "app_config" {
  filename = "${path.module}/generated/app.conf"
  content = templatefile("${path.module}/templates/app.conf.tpl", {
    db_host     = aws_db_instance.main.address
    db_port     = aws_db_instance.main.port
    db_name     = var.db_name
    cache_host  = aws_elasticache_cluster.main.cache_nodes[0].address
    environment = var.environment
  })
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.key_path)
    host        = self.public_ip
  }

  # Upload the generated config file
  provisioner "file" {
    source      = local_file.app_config.filename
    destination = "/etc/myapp/app.conf"
  }

  provisioner "remote-exec" {
    inline = ["sudo systemctl restart myapp"]
  }

  depends_on = [local_file.app_config]
}
```

```hcl
# templates/app.conf.tpl
[database]
host = ${db_host}
port = ${db_port}
name = ${db_name}

[cache]
host = ${cache_host}

[app]
environment = ${environment}
```

## Method 4: Pass Data as JSON File

For complex structured data, write to a JSON file:

```hcl
resource "local_file" "instance_config" {
  filename = "${path.module}/generated/config.json"
  content = jsonencode({
    instance_id  = aws_instance.web.id
    public_ip    = aws_instance.web.public_ip
    db_endpoint  = aws_db_instance.main.endpoint
    environment  = var.environment
    region       = var.region
    bucket_name  = aws_s3_bucket.assets.bucket
    tags         = var.common_tags
  })
}

resource "null_resource" "configure" {
  triggers = {
    config_hash = local_file.instance_config.content_md5
  }

  provisioner "local-exec" {
    command     = "python3 ${path.module}/scripts/configure.py"
    environment = {
      CONFIG_FILE = local_file.instance_config.filename
    }
  }

  depends_on = [local_file.instance_config]
}
```

## Accessing Self Attributes

The `self` object gives access to all computed attributes of the resource:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "echo 'Created instance'"

    environment = {
      # Common self attributes
      INSTANCE_ID    = self.id
      ARN            = self.arn
      PUBLIC_IP      = self.public_ip
      PRIVATE_IP     = self.private_ip
      PUBLIC_DNS     = self.public_dns
      PRIVATE_DNS    = self.private_dns
      SUBNET_ID      = self.subnet_id
      INSTANCE_TYPE  = self.instance_type
      INSTANCE_STATE = self.instance_state
    }
  }
}
```

## Conclusion

Environment variables are the safest and most readable way to pass data to `local-exec` scripts. For `remote-exec`, use string interpolation directly in inline commands. For complex configuration, generate a config file using `templatefile()` and upload it with the `file` provisioner. The `self` object gives access to all the created resource's attributes within provisioner blocks, making it easy to pass computed values like instance IDs and IP addresses.
