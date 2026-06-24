# How to Use Template Files for User Data Scripts in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, EC2, User Data, Template, Infrastructure as Code

Description: Learn how to use OpenTofu's templatefile function and the template provider to generate dynamic user data scripts for cloud instances, making bootstrapping configurations maintainable.

## Introduction

User data scripts are used to bootstrap cloud instances at launch time. Instead of hardcoding these scripts in your OpenTofu configuration, using template files keeps them readable, maintainable, and injectable with dynamic values.

## The templatefile Function

`templatefile(path, vars)` reads a file and substitutes template variables using HCL template syntax:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    app_version  = var.app_version
    environment  = var.environment
    db_endpoint  = aws_db_instance.main.endpoint
    s3_bucket    = aws_s3_bucket.app.bucket
  })
}
```

## Template File Example

Create `templates/user_data.sh.tpl`:

```bash
#!/bin/bash
set -euo pipefail

# Variables injected by OpenTofu

APP_VERSION="${app_version}"
ENVIRONMENT="${environment}"
DB_ENDPOINT="${db_endpoint}"
S3_BUCKET="${s3_bucket}"

# Install application
yum update -y
yum install -y httpd

# Configure application
mkdir -p /etc/myapp
cat > /etc/myapp/config.env <<EOF
APP_VERSION=$${APP_VERSION}
DB_HOST=$${DB_ENDPOINT}
S3_BUCKET=$${S3_BUCKET}
ENVIRONMENT=$${ENVIRONMENT}
EOF

systemctl enable --now httpd
echo "Bootstrap complete for $${APP_VERSION} in $${ENVIRONMENT}"
```

Note: Use `$${VAR}` to output a literal `${VAR}` in the script (escaped from templatefile interpolation).

## Cloud-Init YAML Template

For more complex initialization, use cloud-init:

```yaml
# templates/cloud_init.yaml.tpl
#cloud-config
hostname: ${hostname}
fqdn: ${hostname}.${domain}

package_update: true
packages:
  - nginx
  - ${extra_package}

write_files:
  - path: /etc/app/config.json
    content: |
      {
        "environment": "${environment}",
        "region": "${region}"
      }

runcmd:
  - systemctl enable --now nginx
```

Reference in OpenTofu:

```hcl
user_data = templatefile("${path.module}/templates/cloud_init.yaml.tpl", {
  hostname      = "web-${var.environment}"
  domain        = var.domain
  environment   = var.environment
  region        = var.aws_region
  extra_package = "jq"
})
```

## Base64 Encoding for Launch Templates

```hcl
resource "aws_launch_template" "app" {
  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    app_version  = var.app_version
    environment  = var.environment
    db_endpoint  = aws_db_instance.main.endpoint
    s3_bucket    = aws_s3_bucket.app.bucket
  }))
}
```

## Conclusion

Using `templatefile` for user data scripts keeps your OpenTofu configurations DRY and your bootstrap scripts readable. Dynamic variable injection makes it easy to generate different configurations per environment without duplicating scripts.
