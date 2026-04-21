# How to Use Template Directives in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Template Directives, For, If, Expression, Infrastructure as Code, DevOps

Description: A guide to using template directives in OpenTofu HCL to embed conditional logic and loops directly within string templates.

## Introduction

Template directives in OpenTofu allow you to embed control flow - conditionals and loops - directly within string templates. Using `%{if}` and `%{for}` directives, you can generate complex multi-line strings with dynamic content. This is useful for generating configuration files, scripts, and other text that varies based on variables.

## Template if Directive

```hcl
variable "enable_debug" {
  type    = bool
  default = false
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    %{if var.enable_debug}
    set -x  # Enable debug mode
    %{endif}
    systemctl start myapp
  EOF
}
```

## Template if-else

```hcl
variable "environment" {
  type = string
}

locals {
  nginx_config = <<-EOF
    server {
      listen 80;
      %{if var.environment == "prod"}
      server_name app.example.com;
      return 301 https://$server_name$request_uri;
      %{else}
      server_name _;
      location / {
        proxy_pass http://localhost:8080;
      }
      %{endif}
    }
  EOF
}
```

## Template for Directive

```hcl
variable "allowed_ports" {
  type    = list(number)
  default = [80, 443, 8080]
}

locals {
  # Generate iptables rules for each port
  firewall_rules = <<-EOF
    #!/bin/bash
    %{for port in var.allowed_ports}
    iptables -A INPUT -p tcp --dport ${port} -j ACCEPT
    %{endfor}
  EOF
}
```

## Template for with Index

```hcl
variable "backend_servers" {
  type    = list(string)
  default = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
}

locals {
  nginx_upstream = <<-EOF
    upstream backend {
      %{for idx, server in var.backend_servers}
      server ${server}:8080 weight=${idx + 1};
      %{endfor}
    }
  EOF
}
```

## Combining for and if

```hcl
variable "users" {
  type = list(object({
    name    = string
    is_admin = bool
  }))
}

locals {
  user_config = <<-EOF
    # User permissions
    %{for user in var.users}
    %{if user.is_admin}
    GRANT ALL ON *.* TO '${user.name}'@'%';
    %{else}
    GRANT SELECT ON mydb.* TO '${user.name}'@'%';
    %{endif}
    %{endfor}
  EOF
}
```

## Stripping Whitespace with ~

```hcl
variable "features" {
  type    = list(string)
  default = ["feature-a", "feature-b"]
}

# Without ~: generates empty lines for directive lines

locals {
  with_spaces = <<-EOF
    enabled_features:
    %{for feature in var.features}
    - ${feature}
    %{endfor}
  EOF
}

# With ~: strips whitespace/newlines around the directive
locals {
  without_spaces = <<-EOF
    enabled_features:
    %{for feature in var.features~}
    - ${feature}
    %{endfor~}
  EOF
}
```

## Generating Cloud-init Configuration

```hcl
variable "packages" {
  type    = list(string)
  default = ["nginx", "python3", "git"]
}

variable "run_commands" {
  type    = list(string)
  default = ["systemctl enable nginx", "systemctl start nginx"]
}

locals {
  cloud_init = <<-YAML
    #cloud-config
    package_update: true
    packages:
    %{for pkg in var.packages}
      - ${pkg}
    %{endfor}
    runcmd:
    %{for cmd in var.run_commands}
      - ${cmd}
    %{endfor}
  YAML
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = local.cloud_init
}
```

## Template Directives in Inline Strings

```hcl
variable "is_private" {
  type    = bool
  default = true
}

# Template directives work in regular strings too
locals {
  subnet_type = "subnet-%{if var.is_private}private%{else}public%{endif}"
  # Note: for simple conditionals, ternary is cleaner
  # Use template directives for multi-line or complex cases
}
```

## When to Use templatefile() Instead

```hcl
# For very complex templates, use templatefile() with a separate file
# This is cleaner than embedding lots of directives in HCL

resource "aws_instance" "app" {
  ami       = var.ami_id
  user_data = templatefile("${path.module}/templates/userdata.sh.tpl", {
    app_version = var.app_version
    packages    = var.packages
    features    = var.features
  })
}
# templates/userdata.sh.tpl can use the same %{if} and %{for} directives
```

## Conclusion

Template directives (`%{if}` and `%{for}`) bring conditional logic and iteration into string templates, enabling dynamic configuration file generation without requiring separate template files. The `~` modifier controls whitespace around directive lines, letting you produce clean output without empty lines. Use template directives for moderately complex inline templates. When templates become large or complex, consider moving them to separate `.tpl` files and using the `templatefile()` function, which supports the same directives but keeps your HCL configuration cleaner and the templates in dedicated files.
