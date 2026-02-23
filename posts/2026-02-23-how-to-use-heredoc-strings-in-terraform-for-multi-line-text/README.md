# How to Use Heredoc Strings in Terraform for Multi-Line Text

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Strings, Configuration

Description: Learn how to use heredoc strings in Terraform to handle multi-line text for user data scripts, IAM policies, configuration files, and more with proper indentation control.

---

When you need to embed multi-line text in Terraform - a shell script for EC2 user data, a JSON policy document, a configuration file - regular strings become painful. You end up with escaped newlines, unreadable formatting, and configuration that nobody wants to maintain.

Heredoc strings solve this by letting you write multi-line text naturally, with the formatting preserved exactly as you type it. Terraform supports two heredoc variants, and choosing the right one makes a real difference in how clean your code looks.

## Basic Heredoc Syntax

A heredoc string starts with `<<` followed by an identifier (the delimiter), then ends when that same identifier appears on a line by itself:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = <<EOT
#!/bin/bash
echo "Hello from Terraform"
apt-get update
apt-get install -y nginx
systemctl start nginx
EOT
}
```

The delimiter (`EOT` in this case) can be any identifier. Common choices are `EOT` (End Of Text), `EOF` (End Of File), `SCRIPT`, `CONFIG`, and `POLICY`. The only rule is that the opening and closing delimiters must match.

```hcl
# All of these work
user_data = <<EOT
...content...
EOT

user_data = <<SCRIPT
...content...
SCRIPT

user_data = <<USERDATA
...content...
USERDATA
```

## Indented Heredocs with <<-

Standard heredocs preserve all whitespace exactly as written. This means if you indent the content to match your Terraform code, that indentation becomes part of the string:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  # Problem: the indentation becomes part of the script
  user_data = <<EOT
    #!/bin/bash
    echo "This script has leading spaces"
    apt-get update
EOT
}
```

The script above would have 4 spaces at the start of every line, which might break things. The `<<-` (dash) variant solves this by stripping leading whitespace:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  # The <<- strips leading whitespace based on the closing delimiter
  user_data = <<-EOT
    #!/bin/bash
    echo "This script has no leading spaces"
    apt-get update
  EOT
}
```

With `<<-`, Terraform strips the leading whitespace from all lines. Specifically, it looks at the indentation of the closing delimiter and removes that much indentation from every line. In the example above, `EOT` is indented by 2 spaces, so 2 spaces are stripped from the start of every content line.

This is incredibly useful because it lets you keep your heredoc content indented nicely within your Terraform code while producing clean output.

## How Indentation Stripping Works

Let's be precise about the `<<-` behavior:

```hcl
locals {
  # The closing EOT has 2 spaces of indentation
  # So Terraform strips up to 2 spaces from each line
  text = <<-EOT
    Line with 4 spaces becomes "  Line with 4 spaces" (2 stripped)
  Line with 2 spaces becomes "Line with 2 spaces" (2 stripped)
      Line with 6 spaces becomes "    Line with 6 spaces" (2 stripped)
  EOT
}
```

Actually, Terraform's `<<-` strips all common leading whitespace. It finds the line with the least indentation (ignoring blank lines) and removes that amount from every line. This means in practice:

```hcl
locals {
  example = <<-EOT
    first line    # has 4 spaces
    second line   # has 4 spaces
      third line  # has 6 spaces
  EOT
  # Result:
  # "first line\nsecond line\n  third line\n"
  # (4 spaces stripped from all lines; third line keeps its extra 2)
}
```

## Interpolation in Heredocs

Heredoc strings support the same `${ }` interpolation as regular strings:

```hcl
variable "hostname" {
  default = "web-01"
}

variable "environment" {
  default = "production"
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = <<-SCRIPT
    #!/bin/bash
    # Set hostname from Terraform variable
    hostnamectl set-hostname ${var.hostname}

    # Write environment config
    cat > /etc/environment <<ENVFILE
    APP_ENV=${var.environment}
    DB_HOST=${aws_db_instance.main.address}
    DB_PORT=${aws_db_instance.main.port}
    ENVFILE

    # Start the application
    systemctl start myapp
  SCRIPT
}
```

If you need to include a literal `${` in the output (common when writing shell scripts with variable substitution), escape it with `$${ }`:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = <<-SCRIPT
    #!/bin/bash
    # Terraform interpolation - resolved at plan time
    echo "Hostname: ${var.hostname}"

    # Shell variable - $${} prevents Terraform from interpreting it
    CURRENT_DATE=$$(date +%Y-%m-%d)
    echo "Date: $${CURRENT_DATE}"

    # Loop using shell syntax - need to escape the dollar sign
    for file in /etc/app/*.conf; do
      echo "Processing $${file}"
    done
  SCRIPT
}
```

## Practical Examples

### EC2 User Data with Cloud-Init

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  user_data = <<-CLOUDINIT
    #cloud-config
    package_update: true
    package_upgrade: true

    packages:
      - docker.io
      - docker-compose
      - awscli

    write_files:
      - path: /etc/myapp/config.yaml
        content: |
          server:
            port: ${var.app_port}
            host: 0.0.0.0
          database:
            host: ${aws_db_instance.main.address}
            port: 5432
            name: ${var.db_name}

    runcmd:
      - systemctl enable docker
      - systemctl start docker
      - docker pull ${var.docker_image}:${var.docker_tag}
      - docker run -d -p ${var.app_port}:${var.app_port} ${var.docker_image}:${var.docker_tag}
  CLOUDINIT

  tags = {
    Name = "app-${var.environment}"
  }
}
```

### IAM Policy Documents

```hcl
resource "aws_iam_policy" "s3_access" {
  name        = "s3-access-policy"
  description = "Allow access to specific S3 buckets"

  policy = <<-POLICY
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:PutObject",
            "s3:ListBucket"
          ],
          "Resource": [
            "${aws_s3_bucket.data.arn}",
            "${aws_s3_bucket.data.arn}/*"
          ]
        }
      ]
    }
  POLICY
}
```

Note: For IAM policies, consider using the `aws_iam_policy_document` data source instead of heredoc JSON. It provides better validation and is easier to compose. But heredocs work fine for simple policies.

### Kubernetes ConfigMaps

```hcl
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = var.namespace
  }

  data = {
    "config.yaml" = <<-YAML
      server:
        port: ${var.port}
        workers: ${var.worker_count}
      logging:
        level: ${var.log_level}
        format: json
      cache:
        enabled: ${var.enable_cache}
        ttl: 300
    YAML

    "nginx.conf" = <<-NGINX
      upstream backend {
        server localhost:${var.port};
      }

      server {
        listen 80;

        location / {
          proxy_pass http://backend;
          proxy_set_header Host $${host};
          proxy_set_header X-Real-IP $${remote_addr};
        }

        location /health {
          return 200 'OK';
          add_header Content-Type text/plain;
        }
      }
    NGINX
  }
}
```

### Shell Scripts with Complex Logic

```hcl
resource "null_resource" "setup" {
  provisioner "local-exec" {
    command = <<-SCRIPT
      #!/bin/bash
      set -euo pipefail

      echo "Setting up environment: ${var.environment}"

      # Wait for the database to be ready
      MAX_RETRIES=30
      RETRY_COUNT=0
      DB_HOST="${aws_db_instance.main.address}"

      while ! pg_isready -h "$${DB_HOST}" -p 5432 2>/dev/null; do
        RETRY_COUNT=$$((RETRY_COUNT + 1))
        if [ "$${RETRY_COUNT}" -ge "$${MAX_RETRIES}" ]; then
          echo "ERROR: Database not ready after $${MAX_RETRIES} attempts"
          exit 1
        fi
        echo "Waiting for database... ($${RETRY_COUNT}/$${MAX_RETRIES})"
        sleep 5
      done

      echo "Database is ready!"

      # Run migrations
      DATABASE_URL="postgresql://${var.db_user}:${var.db_password}@$${DB_HOST}:5432/${var.db_name}"
      export DATABASE_URL

      ./migrate.sh up

      echo "Setup complete!"
    SCRIPT
  }
}
```

## Heredocs vs. templatefile

For short, simple multi-line strings, heredocs are fine. For longer or more complex templates, the `templatefile` function is usually better:

```hcl
# Heredoc - good for short scripts
user_data = <<-SCRIPT
  #!/bin/bash
  hostnamectl set-hostname ${var.hostname}
  systemctl start nginx
SCRIPT

# templatefile - better for complex templates
user_data = templatefile("${path.module}/templates/user_data.tftpl", {
  hostname    = var.hostname
  packages    = var.packages
  environment = var.environment
})
```

Reasons to prefer `templatefile`:
- Template files get proper syntax highlighting in editors
- Complex logic (loops, conditionals) is easier to read in a separate file
- Templates are reusable across multiple resources
- Easier to test in isolation

Reasons to use heredocs:
- Quick and inline - no separate file needed
- Good for short, simple text (under 20 lines)
- Makes it obvious what the text contains without switching files

## Nested Heredocs

You can use heredocs inside heredocs as long as the delimiters are different:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = <<-OUTER
    #!/bin/bash
    # Write a config file using a nested heredoc (in the shell)
    cat > /etc/myapp/config.conf <<INNER
    server_name=${var.hostname}
    port=${var.port}
    INNER

    # Start the service
    systemctl start myapp
  OUTER
}
```

Here, `OUTER` is the Terraform heredoc delimiter, and `INNER` is the shell heredoc delimiter. Terraform processes `OUTER`, and the resulting script uses `INNER` when it runs on the server.

## Summary

Heredoc strings are the go-to approach for embedding multi-line text in Terraform configurations. Use `<<-` (with the dash) almost always so you can indent the content to match your code. Remember to escape shell variables with `$${ }` when mixing Terraform interpolation with shell scripts. For anything longer than about 20 lines, consider moving the content to a separate template file using the `templatefile` function.
