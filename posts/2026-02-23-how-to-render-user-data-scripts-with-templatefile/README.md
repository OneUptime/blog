# How to Render User Data Scripts with templatefile

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Templatefile, User Data, Cloud Init, AWS, Infrastructure as Code

Description: Learn how to use Terraform's templatefile function to render dynamic user data scripts for EC2 instances and other cloud VMs with variable substitution.

---

If you have ever hardcoded a user data script inside a Terraform configuration, you know how quickly things get messy. The `templatefile` function gives you a clean way to keep your scripts in separate files while injecting variables at render time. This post walks through everything you need to know to use `templatefile` for user data scripts effectively.

## What Is the templatefile Function?

The `templatefile` function reads a file from disk and renders it as a template. It takes two arguments: the path to the template file and a map of variables to substitute into the template. The function uses Terraform's string template syntax, which supports interpolation, directives, and loops.

```hcl
# Basic syntax
templatefile(path, vars)
```

The path is relative to the root module directory, and the vars argument is a map of values that become available inside the template.

## Why Use templatefile for User Data?

User data scripts are shell scripts (or cloud-init configs) that run when a virtual machine boots for the first time. They often need dynamic values like database endpoints, API keys, or environment-specific configuration. Without `templatefile`, you end up concatenating strings inside your Terraform code, which is hard to read and harder to debug.

Here are the key benefits:

- Separation of concerns between infrastructure code and bootstrap scripts
- Syntax highlighting and linting in your editor since the script lives in its own file
- Easier testing and review of the script logic
- Clean variable substitution without messy string concatenation

## Basic Example: EC2 User Data

Let's start with a straightforward example. You have an EC2 instance that needs to install and configure Nginx on boot.

First, create the template file:

```bash
# templates/user_data.sh.tpl

#!/bin/bash
# Bootstrap script for web server setup

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install Nginx
apt-get install -y nginx

# Write the Nginx configuration
cat > /etc/nginx/sites-available/default <<'NGINX'
server {
    listen 80;
    server_name ${server_name};

    location / {
        proxy_pass http://localhost:${app_port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

# Set the environment
echo "ENVIRONMENT=${environment}" >> /etc/environment
echo "DB_HOST=${db_host}" >> /etc/environment
echo "DB_PORT=${db_port}" >> /etc/environment

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo "Bootstrap complete for ${server_name}"
```

Now reference it in your Terraform configuration:

```hcl
# main.tf

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Render the user data script with dynamic values
  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    server_name = "app.example.com"
    app_port    = 8080
    environment = var.environment
    db_host     = aws_db_instance.main.address
    db_port     = aws_db_instance.main.port
  })

  tags = {
    Name = "web-server-${var.environment}"
  }
}
```

## Using Conditionals in Templates

Templates support `if` directives, which are useful when your user data script needs to behave differently based on the environment or other conditions.

```bash
# templates/user_data.sh.tpl

#!/bin/bash

%{ if enable_monitoring }
# Install and configure the monitoring agent
curl -sL https://monitoring.example.com/install.sh | bash
echo "API_KEY=${monitoring_api_key}" > /etc/monitoring/config
systemctl start monitoring-agent
%{ endif }

%{ if environment == "production" }
# Production-specific hardening
ufw enable
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
%{ else }
# Development - allow all traffic for debugging
ufw disable
%{ endif }
```

```hcl
# main.tf

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    enable_monitoring  = var.environment == "production"
    monitoring_api_key = var.monitoring_api_key
    environment        = var.environment
  })
}
```

## Using Loops in Templates

When you need to iterate over a list or map inside your template, the `for` directive comes in handy. This is common when you need to write multiple configuration entries or install multiple packages.

```bash
# templates/user_data.sh.tpl

#!/bin/bash

# Install required packages
%{ for pkg in packages }
apt-get install -y ${pkg}
%{ endfor }

# Add SSH keys for authorized users
%{ for user, key in ssh_keys }
useradd -m ${user}
mkdir -p /home/${user}/.ssh
echo "${key}" > /home/${user}/.ssh/authorized_keys
chown -R ${user}:${user} /home/${user}/.ssh
chmod 700 /home/${user}/.ssh
chmod 600 /home/${user}/.ssh/authorized_keys
%{ endfor }

# Write hosts file entries
%{ for entry in host_entries ~}
echo "${entry.ip} ${entry.hostname}" >> /etc/hosts
%{ endfor ~}
```

```hcl
# main.tf

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    packages = ["nginx", "htop", "curl", "jq"]

    ssh_keys = {
      alice = "ssh-rsa AAAA...alice@company.com"
      bob   = "ssh-rsa AAAA...bob@company.com"
    }

    host_entries = [
      { ip = "10.0.1.5", hostname = "db-primary" },
      { ip = "10.0.1.6", hostname = "db-replica" },
      { ip = "10.0.1.10", hostname = "cache-01" },
    ]
  })
}
```

## Handling the Tilde (~) Strip Marker

You may have noticed the `~` character in some template directives. This is the strip marker, and it removes whitespace (including newlines) adjacent to the directive. Without it, your rendered output can have unwanted blank lines.

```bash
# Without strip markers - produces extra blank lines
%{ for item in list }
echo "${item}"
%{ endfor }

# With strip markers - cleaner output
%{ for item in list ~}
echo "${item}"
%{ endfor ~}
```

Use `~` on the left side of a directive to strip whitespace before it, and on the right side to strip whitespace after it. You can use it on both sides: `%{~ for item in list ~}`.

## Cloud-Init YAML Templates

User data is not always a bash script. Many cloud providers support cloud-init YAML format. The `templatefile` function works just as well with YAML templates.

```yaml
# templates/cloud_init.yaml.tpl

#cloud-config
package_update: true
package_upgrade: true

packages:
%{ for pkg in packages ~}
  - ${pkg}
%{ endfor ~}

write_files:
  - path: /etc/app/config.json
    content: |
      {
        "database": "${db_host}",
        "port": ${db_port},
        "environment": "${environment}"
      }

runcmd:
  - systemctl start myapp
  - systemctl enable myapp
```

```hcl
# main.tf

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Note: cloud-init YAML needs to be passed as-is
  user_data = templatefile("${path.module}/templates/cloud_init.yaml.tpl", {
    packages    = ["docker.io", "docker-compose", "awscli"]
    db_host     = aws_db_instance.main.address
    db_port     = aws_db_instance.main.port
    environment = var.environment
  })
}
```

## Base64 Encoding User Data

Some cloud providers require user data to be base64-encoded. You can wrap the `templatefile` call with `base64encode`:

```hcl
# For providers that need base64-encoded user data
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment = var.environment
    app_version = var.app_version
  }))
}
```

## Debugging templatefile Output

When your user data script does not work as expected, you need to see what Terraform actually rendered. Use an `output` block to inspect the rendered template:

```hcl
# outputs.tf

output "rendered_user_data" {
  value = templatefile("${path.module}/templates/user_data.sh.tpl", {
    server_name = "app.example.com"
    app_port    = 8080
    environment = "staging"
    db_host     = "db.internal"
    db_port     = 5432
  })
}
```

Run `terraform plan` or `terraform apply` and check the output. This saves you from having to SSH into the instance to figure out what went wrong.

## Common Pitfalls

There are a few things that trip people up regularly:

1. Dollar signs in bash scripts conflict with Terraform interpolation. If your script uses `$HOME` or `$(command)`, you need to escape them as `$${HOME}` or `$$(command)` inside the template.

2. All variables in the vars map must be used in the template file. If you pass a variable that the template does not reference, Terraform will throw an error in older versions, though newer versions are more lenient.

3. The template file path must be known at plan time. You cannot use a dynamic path that depends on a resource attribute.

4. Watch out for special characters in variable values. If a variable contains quotes or backslashes, they will be inserted literally into the rendered output, which can break your script.

## Summary

The `templatefile` function is the right tool for rendering user data scripts in Terraform. It keeps your scripts in dedicated files, supports conditionals and loops, and makes variable substitution clean and predictable. Whether you are writing bash scripts or cloud-init YAML, `templatefile` helps you manage the complexity of boot-time configuration without cluttering your Terraform code. Start by extracting any inline user data into template files and gradually add more dynamic behavior as your infrastructure grows.
