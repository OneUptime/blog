# How to Use the templatefile Function with Conditionals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, Templates

Description: Learn how to use conditional directives inside Terraform templatefile templates with if/else logic, with practical examples for dynamic configuration generation.

---

Real-world configuration files are rarely one-size-fits-all. You need SSL blocks only when TLS is enabled, debug logging only in development, monitoring agents only in production. The `%{if}` directive inside `templatefile` templates lets you conditionally include or exclude sections of your generated configuration based on the variables you pass in.

## Template Conditional Syntax

The conditional syntax in Terraform templates uses `%{if}`, `%{else}`, and `%{endif}`:

```
%{if condition}
  ... included when condition is true ...
%{endif}

%{if condition}
  ... true branch ...
%{else}
  ... false branch ...
%{endif}
```

You can also use `%{if condition}...%{elseif other_condition}...%{else}...%{endif}` for multiple branches (available in Terraform 1.7+).

## Basic Conditional Example

```hcl
# templates/config.yaml.tpl
app:
  name: ${app_name}
  port: ${port}
%{if debug_enabled}
  debug: true
  log_level: trace
%{else}
  debug: false
  log_level: info
%{endif}
```

```hcl
# main.tf
locals {
  config = templatefile("${path.module}/templates/config.yaml.tpl", {
    app_name      = "myapp"
    port          = 8080
    debug_enabled = false
  })
}

# Rendered output (debug_enabled = false):
# app:
#   name: myapp
#   port: 8080
#   debug: false
#   log_level: info
```

## Nginx SSL Configuration

A classic use case: conditionally including SSL directives.

```hcl
# templates/nginx.conf.tpl
server {
%{if ssl_enabled}
    listen 443 ssl;
    ssl_certificate     ${ssl_cert_path};
    ssl_certificate_key ${ssl_key_path};

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
%{else}
    listen 80;
%{endif}

    server_name ${server_name};

    location / {
        proxy_pass http://backend;
    }

%{if enable_access_log}
    access_log /var/log/nginx/${server_name}.access.log;
%{endif}
%{if enable_error_log}
    error_log /var/log/nginx/${server_name}.error.log;
%{endif}
}
```

```hcl
# main.tf - Production
resource "local_file" "nginx_prod" {
  content = templatefile("${path.module}/templates/nginx.conf.tpl", {
    ssl_enabled      = true
    ssl_cert_path    = "/etc/ssl/certs/server.crt"
    ssl_key_path     = "/etc/ssl/private/server.key"
    server_name      = "api.example.com"
    enable_access_log = true
    enable_error_log  = true
  })
  filename = "/tmp/nginx-prod.conf"
}

# main.tf - Development
resource "local_file" "nginx_dev" {
  content = templatefile("${path.module}/templates/nginx.conf.tpl", {
    ssl_enabled      = false
    ssl_cert_path    = ""
    ssl_key_path     = ""
    server_name      = "localhost"
    enable_access_log = false
    enable_error_log  = true
  })
  filename = "/tmp/nginx-dev.conf"
}
```

## EC2 User Data with Conditional Steps

Build initialization scripts that adapt to the deployment context.

```hcl
# templates/init.sh.tpl
#!/bin/bash
set -euo pipefail

echo "Initializing ${hostname}..."

# Base packages - always installed
apt-get update -y
apt-get install -y curl jq

%{if install_monitoring_agent}
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start
echo "CloudWatch agent installed and started"
%{endif}

%{if install_docker}
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
systemctl enable docker
%{endif}

%{if environment == "production"}
# Production-specific hardening
apt-get install -y unattended-upgrades
echo "Unattended-upgrades configured for production"

# Disable SSH password authentication
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
%{else}
# Non-production: install debugging tools
apt-get install -y vim htop strace tcpdump
%{endif}

echo "Initialization complete"
```

```hcl
# main.tf
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  user_data = templatefile("${path.module}/templates/init.sh.tpl", {
    hostname                 = "app-prod-01"
    install_monitoring_agent = true
    install_docker           = true
    environment              = "production"
  })
}
```

## Kubernetes Manifest with Optional Sections

Generate Kubernetes YAML with optional resource limits, probes, and volumes.

```hcl
# templates/deployment.yaml.tpl
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${app_name}
  namespace: ${namespace}
spec:
  replicas: ${replicas}
  template:
    spec:
      containers:
        - name: ${app_name}
          image: ${image}
%{if resources_enabled}
          resources:
            requests:
              cpu: "${cpu_request}"
              memory: "${memory_request}"
            limits:
              cpu: "${cpu_limit}"
              memory: "${memory_limit}"
%{endif}
%{if health_check_enabled}
          livenessProbe:
            httpGet:
              path: ${health_check_path}
              port: ${container_port}
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: ${health_check_path}
              port: ${container_port}
            initialDelaySeconds: 5
            periodSeconds: 5
%{endif}
%{if volume_mounts_enabled}
          volumeMounts:
            - name: config
              mountPath: /etc/app
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: ${app_name}-config
%{endif}
```

```hcl
# main.tf - Production (all features enabled)
locals {
  k8s_prod = templatefile("${path.module}/templates/deployment.yaml.tpl", {
    app_name             = "myapp"
    namespace            = "production"
    replicas             = 3
    image                = "myapp:2.1.0"
    container_port       = 8080
    resources_enabled    = true
    cpu_request          = "250m"
    memory_request       = "256Mi"
    cpu_limit            = "500m"
    memory_limit         = "512Mi"
    health_check_enabled = true
    health_check_path    = "/health"
    volume_mounts_enabled = true
  })
}

# main.tf - Development (minimal config)
locals {
  k8s_dev = templatefile("${path.module}/templates/deployment.yaml.tpl", {
    app_name             = "myapp"
    namespace            = "development"
    replicas             = 1
    image                = "myapp:dev"
    container_port       = 8080
    resources_enabled    = false
    cpu_request          = ""
    memory_request       = ""
    cpu_limit            = ""
    memory_limit         = ""
    health_check_enabled = false
    health_check_path    = ""
    volume_mounts_enabled = false
  })
}
```

## String Comparison in Conditionals

You can compare strings directly in template conditionals.

```hcl
# templates/db-config.tpl
%{if db_engine == "postgresql"}
driver: postgresql
port: 5432
ssl_mode: require
%{endif}
%{if db_engine == "mysql"}
driver: mysql
port: 3306
ssl_mode: REQUIRED
%{endif}
%{if db_engine == "sqlite"}
driver: sqlite3
path: /data/app.db
%{endif}
```

```hcl
locals {
  db_config = templatefile("${path.module}/templates/db-config.tpl", {
    db_engine = "postgresql"
  })
}
```

## Combining Conditionals with Loops

Conditionals and loops work together for powerful template generation.

```hcl
# templates/security-group.tpl
%{for rule in rules}
%{if rule.enabled}
# ${rule.description}
iptables -A ${rule.chain} -p ${rule.protocol} --dport ${rule.port} -j ${rule.action}
%{endif}
%{endfor}
```

```hcl
# main.tf
locals {
  firewall = templatefile("${path.module}/templates/security-group.tpl", {
    rules = [
      { description = "Allow HTTP",   chain = "INPUT", protocol = "tcp", port = 80,   action = "ACCEPT", enabled = true },
      { description = "Allow HTTPS",  chain = "INPUT", protocol = "tcp", port = 443,  action = "ACCEPT", enabled = true },
      { description = "Allow SSH",    chain = "INPUT", protocol = "tcp", port = 22,   action = "ACCEPT", enabled = false },
      { description = "Allow MySQL",  chain = "INPUT", protocol = "tcp", port = 3306, action = "ACCEPT", enabled = true }
    ]
  })
}

# Rendered output (SSH rule is excluded because enabled = false):
# # Allow HTTP
# iptables -A INPUT -p tcp --dport 80 -j ACCEPT
# # Allow HTTPS
# iptables -A INPUT -p tcp --dport 443 -j ACCEPT
# # Allow MySQL
# iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
```

## Whitespace Control with Conditionals

Just like with loops, use `~` to control whitespace around conditional directives.

```hcl
# Without tilde - produces extra blank lines
%{if condition}
content
%{endif}

# With tilde - clean output
%{~if condition}
content
%{~endif}
```

The tilde strips the adjacent newline and whitespace, preventing blank lines in the output.

## Boolean Logic in Conditions

Template conditionals support basic boolean expressions.

```hcl
# templates/features.tpl
%{if enable_feature_a && enable_feature_b}
Both features A and B are enabled
%{endif}

%{if enable_feature_a || enable_feature_b}
At least one feature is enabled
%{endif}

%{if !disable_logging}
Logging is active
%{endif}
```

## Conditional Default Values

Provide different values based on conditions.

```hcl
# templates/app-config.tpl
database:
  host: ${db_host}
  pool_size: %{if environment == "production"}20%{else}5%{endif}
  timeout: %{if environment == "production"}30%{else}60%{endif}
  ssl: %{if environment == "production"}true%{else}false%{endif}
```

## Summary

Conditionals in `templatefile` templates let you generate environment-specific configurations from a single template source. Whether it is toggling SSL blocks, including monitoring agents only in production, or adjusting resource limits based on the deployment tier, the `%{if}...%{else}...%{endif}` syntax handles it cleanly. Combine conditionals with [loops](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatefile-function-with-loops/view) for maximum flexibility, and use the `~` whitespace control modifier to keep your output clean. This pattern of using one template with conditional sections per environment is much more maintainable than duplicating entire template files.
