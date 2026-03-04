# How to Use the templatefile Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, Templates

Description: Learn how to use the templatefile function in Terraform to render external template files with variables, with practical examples for configuration generation and user data scripts.

---

The `templatefile` function is one of the most powerful tools in Terraform for generating dynamic configuration files, scripts, and documents. It reads a template file from disk, substitutes variables into it, and returns the rendered result as a string. If you have ever hard-coded user data scripts or manually built complex configuration strings, `templatefile` will change how you write Terraform.

## What Does templatefile Do?

The `templatefile` function reads a file and renders it as a template, replacing template expressions with the values you provide.

```hcl
# Basic syntax
templatefile(path, vars)
```

The file uses Terraform's template syntax: `${var_name}` for interpolation, `%{if}...%{endif}` for conditionals, and `%{for}...%{endfor}` for loops.

## Basic Example

Let us start with a simple template.

```hcl
# templates/greeting.tpl
Hello, ${name}!
You are deploying to the ${environment} environment.
Your application will run on port ${port}.
```

```hcl
# main.tf
locals {
  greeting = templatefile("${path.module}/templates/greeting.tpl", {
    name        = "DevOps Team"
    environment = "production"
    port        = 8080
  })
}

output "greeting" {
  value = local.greeting
}
# Output:
# Hello, DevOps Team!
# You are deploying to the production environment.
# Your application will run on port 8080.
```

## EC2 User Data Scripts

One of the most common uses is generating EC2 user data scripts.

```hcl
# templates/user-data.sh.tpl
#!/bin/bash
set -euo pipefail

# System configuration
hostnamectl set-hostname ${hostname}
echo "${hostname}" > /etc/hostname

# Install required packages
apt-get update -y
apt-get install -y ${join(" ", packages)}

# Configure application
cat > /etc/myapp/config.yaml <<APPCONFIG
environment: ${environment}
port: ${app_port}
database:
  host: ${db_host}
  port: ${db_port}
  name: ${db_name}
log_level: ${log_level}
APPCONFIG

# Start application service
systemctl enable myapp
systemctl start myapp

echo "Initialization complete for ${hostname}"
```

```hcl
# main.tf
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    hostname    = "app-server-01"
    packages    = ["nginx", "jq", "awscli", "htop"]
    environment = "production"
    app_port    = 8080
    db_host     = aws_db_instance.main.address
    db_port     = 5432
    db_name     = "appdb"
    log_level   = "info"
  })

  tags = {
    Name = "app-server-01"
  }
}
```

## Generating Nginx Configuration

```hcl
# templates/nginx.conf.tpl
upstream backend {
    ${indent(4, join("\n", [for server in upstream_servers : "server ${server};"]))}
}

server {
    listen ${listen_port};
    server_name ${server_name};

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        return 200 'healthy';
        add_header Content-Type text/plain;
    }
}
```

```hcl
# main.tf
resource "local_file" "nginx_config" {
  content = templatefile("${path.module}/templates/nginx.conf.tpl", {
    upstream_servers = ["10.0.1.10:8080", "10.0.1.11:8080", "10.0.1.12:8080"]
    listen_port      = 80
    server_name      = "api.example.com"
  })
  filename = "/tmp/nginx.conf"
}
```

## IAM Policy Documents

While Terraform has native IAM policy resources, sometimes a template is more readable for complex policies.

```hcl
# templates/iam-policy.json.tpl
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::${bucket_name}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${bucket_name}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${region}:${account_id}:*"
    }
  ]
}
```

```hcl
# main.tf
resource "aws_iam_policy" "app" {
  name   = "app-policy"
  policy = templatefile("${path.module}/templates/iam-policy.json.tpl", {
    bucket_name = aws_s3_bucket.app.id
    region      = data.aws_region.current.name
    account_id  = data.aws_caller_identity.current.account_id
  })
}
```

## Kubernetes Manifests

Generate Kubernetes YAML from templates.

```hcl
# templates/deployment.yaml.tpl
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${app_name}
  namespace: ${namespace}
  labels:
    app: ${app_name}
    version: "${version}"
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${app_name}
  template:
    metadata:
      labels:
        app: ${app_name}
        version: "${version}"
    spec:
      containers:
        - name: ${app_name}
          image: ${image}:${version}
          ports:
            - containerPort: ${container_port}
          env:
            - name: ENVIRONMENT
              value: "${environment}"
            - name: LOG_LEVEL
              value: "${log_level}"
```

```hcl
# main.tf
resource "local_file" "k8s_deployment" {
  content = templatefile("${path.module}/templates/deployment.yaml.tpl", {
    app_name       = "myapp"
    namespace      = "production"
    version        = "2.1.0"
    replicas       = 3
    image          = "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp"
    container_port = 8080
    environment    = "production"
    log_level      = "info"
  })
  filename = "/tmp/deployment.yaml"
}
```

## Template File Location

Templates are typically stored in a `templates/` directory within your module.

```text
my-module/
  main.tf
  variables.tf
  outputs.tf
  templates/
    user-data.sh.tpl
    config.yaml.tpl
    policy.json.tpl
```

Always use `${path.module}` to reference templates relative to the module:

```hcl
# Correct - works from any calling location
templatefile("${path.module}/templates/config.tpl", { ... })

# Incorrect - breaks if called from a different directory
templatefile("templates/config.tpl", { ... })
```

## Escaping Special Characters

When your template contains literal `${}` or `%{}` that should not be treated as template syntax, escape them.

```hcl
# templates/script.sh.tpl

#!/bin/bash
# Terraform template variable (will be replaced)
APP_NAME="${app_name}"

# Bash variable (escaped - will NOT be replaced by Terraform)
CURRENT_DATE=$${(date +%Y-%m-%d)}
echo "Deploying $${APP_NAME} on $${CURRENT_DATE}"
```

Use `$${` to produce a literal `${` in the output.

## Passing Complex Types

You can pass lists, maps, and nested objects to templates.

```hcl
# templates/config.yaml.tpl
database:
  host: ${db.host}
  port: ${db.port}
  name: ${db.name}

features:
${join("\n", [for name, enabled in features : "  ${name}: ${enabled}"])}
```

```hcl
locals {
  config = templatefile("${path.module}/templates/config.yaml.tpl", {
    db = {
      host = "db.internal"
      port = 5432
      name = "appdb"
    }
    features = {
      caching     = true
      debug_mode  = false
      rate_limit  = true
    }
  })
}
```

## templatefile vs templatestring

Use `templatefile` when your template is stored in a separate file (best for complex templates). Use `templatestring` when the template is inline and simple. See our post on [templatestring](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatestring-function-in-terraform/view) for the inline approach.

## Common Mistakes

Watch out for these issues:

```hcl
# Mistake: forgetting to pass all referenced variables
# If the template references ${name} but you do not pass it, you get an error

# Mistake: passing extra variables that the template does not use
# This also causes an error in Terraform

# Mistake: using Terraform variable syntax (var.name) in templates
# Templates use their own namespace: ${name}, not ${var.name}
```

## Summary

The `templatefile` function is essential for generating complex configuration files, scripts, and documents in Terraform. It separates template logic from Terraform logic, making both more readable and maintainable. Use it for user data scripts, configuration files, Kubernetes manifests, IAM policies, and any situation where you are building multi-line strings with dynamic content. For loops and conditionals in templates, see our posts on [templatefile with loops](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatefile-function-with-loops/view) and [templatefile with conditionals](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatefile-function-with-conditionals/view).
