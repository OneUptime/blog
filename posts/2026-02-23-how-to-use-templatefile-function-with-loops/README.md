# How to Use the templatefile Function with Loops

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, Template

Description: Learn how to use loops inside Terraform templatefile templates with the for directive, including iteration over lists, maps, nested loops, and indexed loops.

---

When generating configuration files with `templatefile`, you frequently need to repeat sections of content - a list of servers in an Nginx upstream block, environment variables in a startup script, or security group rules in a policy document. The `%{for}` directive inside template files handles this, letting you iterate over lists and maps directly in your templates.

## Template Loop Syntax

The basic loop syntax in Terraform templates is:

```text
%{for item in collection}
  ... content using ${item} ...
%{endfor}
```

This is distinct from HCL's `for` expression. The template `%{for}` directive works only inside template files (used with `templatefile`) or template strings (used with `templatestring`).

## Iterating Over a Simple List

Let us start with the most basic loop.

```hcl
# templates/packages.sh.tpl
#!/bin/bash
apt-get update -y

# Install packages
%{for pkg in packages}
apt-get install -y ${pkg}
%{endfor}

echo "All packages installed"
```

```hcl
# main.tf
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = templatefile("${path.module}/templates/packages.sh.tpl", {
    packages = ["nginx", "curl", "jq", "htop", "vim"]
  })
}

# Rendered output:
# #!/bin/bash
# apt-get update -y
#
# # Install packages
# apt-get install -y nginx
# apt-get install -y curl
# apt-get install -y jq
# apt-get install -y htop
# apt-get install -y vim
#
# echo "All packages installed"
```

## Controlling Whitespace with Tilde

Loops introduce extra newlines by default. Use `~` to strip whitespace.

```hcl
# templates/list.tpl - without tilde (extra blank lines)
Items:
%{for item in items}
- ${item}
%{endfor}

# templates/list-clean.tpl - with tilde (clean output)
Items:
%{~for item in items}
- ${item}
%{~endfor}
```

The `~` character at the beginning of a directive strips the newline and whitespace before it. At the end, it strips after it. This is critical for producing clean output.

```hcl
# Clean comma-separated list
%{for i, name in names~}
${name}%{if i < length(names) - 1}, %{endif~}
%{endfor~}
```

## Iterating Over Maps

Loop through key-value pairs in a map.

```hcl
# templates/env-file.tpl
# Application Environment Configuration
%{for key, value in env_vars~}
${key}=${value}
%{endfor~}
```

```hcl
# main.tf
locals {
  env_file = templatefile("${path.module}/templates/env-file.tpl", {
    env_vars = {
      NODE_ENV     = "production"
      PORT         = "3000"
      DATABASE_URL = "postgresql://db.internal:5432/app"
      REDIS_URL    = "redis://cache.internal:6379"
      LOG_LEVEL    = "info"
    }
  })
}

# Rendered output:
# # Application Environment Configuration
# NODE_ENV=production
# PORT=3000
# DATABASE_URL=postgresql://db.internal:5432/app
# REDIS_URL=redis://cache.internal:6379
# LOG_LEVEL=info
```

## Nginx Upstream Configuration

A classic real-world example: generating an Nginx upstream block.

```hcl
# templates/nginx-upstream.conf.tpl
upstream ${upstream_name} {
%{for server in servers~}
    server ${server.host}:${server.port} weight=${server.weight};
%{endfor~}
}
```

```hcl
# main.tf
locals {
  nginx_config = templatefile("${path.module}/templates/nginx-upstream.conf.tpl", {
    upstream_name = "backend"
    servers = [
      { host = "10.0.1.10", port = 8080, weight = 5 },
      { host = "10.0.1.11", port = 8080, weight = 3 },
      { host = "10.0.1.12", port = 8080, weight = 2 }
    ]
  })
}

# Rendered output:
# upstream backend {
#     server 10.0.1.10:8080 weight=5;
#     server 10.0.1.11:8080 weight=3;
#     server 10.0.1.12:8080 weight=2;
# }
```

## Indexed Loops

You can access the index of each element in the loop.

```hcl
# templates/hosts.tpl
# /etc/hosts entries
127.0.0.1 localhost
%{for i, host in hosts~}
${host.ip} ${host.name} # Entry ${i + 1}
%{endfor~}
```

```hcl
# main.tf
locals {
  hosts_file = templatefile("${path.module}/templates/hosts.tpl", {
    hosts = [
      { ip = "10.0.1.10", name = "web-01.internal" },
      { ip = "10.0.1.11", name = "web-02.internal" },
      { ip = "10.0.1.12", name = "db-01.internal" }
    ]
  })
}

# Rendered output:
# # /etc/hosts entries
# 127.0.0.1 localhost
# 10.0.1.10 web-01.internal # Entry 1
# 10.0.1.11 web-02.internal # Entry 2
# 10.0.1.12 db-01.internal # Entry 3
```

## Generating Kubernetes Environment Variables

```hcl
# templates/k8s-env.yaml.tpl
spec:
  containers:
    - name: ${app_name}
      image: ${image}
      env:
%{for key, value in env_vars~}
        - name: ${key}
          value: "${value}"
%{endfor~}
```

```hcl
# main.tf
locals {
  k8s_spec = templatefile("${path.module}/templates/k8s-env.yaml.tpl", {
    app_name = "myapp"
    image    = "myapp:2.1.0"
    env_vars = {
      ENVIRONMENT = "production"
      LOG_LEVEL   = "info"
      DB_HOST     = "postgres.internal"
      CACHE_HOST  = "redis.internal"
    }
  })
}
```

## Nested Loops

Templates support nested loop structures for complex data.

```hcl
# templates/security-rules.tpl
%{for rule in rules~}
# Rule: ${rule.description}
%{for cidr in rule.cidrs~}
iptables -A INPUT -p ${rule.protocol} --dport ${rule.port} -s ${cidr} -j ACCEPT
%{endfor~}
%{endfor~}
```

```hcl
# main.tf
locals {
  firewall_rules = templatefile("${path.module}/templates/security-rules.tpl", {
    rules = [
      {
        description = "Allow HTTP"
        protocol    = "tcp"
        port        = 80
        cidrs       = ["10.0.0.0/8", "172.16.0.0/12"]
      },
      {
        description = "Allow SSH"
        protocol    = "tcp"
        port        = 22
        cidrs       = ["10.0.1.0/24"]
      }
    ]
  })
}

# Rendered output:
# # Rule: Allow HTTP
# iptables -A INPUT -p tcp --dport 80 -s 10.0.0.0/8 -j ACCEPT
# iptables -A INPUT -p tcp --dport 80 -s 172.16.0.0/12 -j ACCEPT
# # Rule: Allow SSH
# iptables -A INPUT -p tcp --dport 22 -s 10.0.1.0/24 -j ACCEPT
```

## Generating JSON Arrays

Build JSON arrays from lists.

```hcl
# templates/policy.json.tpl
{
  "Version": "2012-10-17",
  "Statement": [
%{for i, rule in rules~}
    {
      "Effect": "${rule.effect}",
      "Action": ${jsonencode(rule.actions)},
      "Resource": "${rule.resource}"
    }%{if i < length(rules) - 1},
%{else}

%{endif~}
%{endfor~}
  ]
}
```

```hcl
# main.tf
locals {
  policy = templatefile("${path.module}/templates/policy.json.tpl", {
    rules = [
      {
        effect   = "Allow"
        actions  = ["s3:GetObject", "s3:PutObject"]
        resource = "arn:aws:s3:::my-bucket/*"
      },
      {
        effect   = "Allow"
        actions  = ["logs:CreateLogStream", "logs:PutLogEvents"]
        resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

## Generating Comma-Separated Values

Loops with index-based comma placement.

```hcl
# templates/csv.tpl
%{for i, row in rows~}
%{for j, cell in row~}
${cell}%{if j < length(row) - 1},%{endif~}
%{endfor}
%{endfor~}
```

## Generating HTML Tables

```hcl
# templates/report.html.tpl
<table>
  <thead>
    <tr>
%{for header in headers~}
      <th>${header}</th>
%{endfor~}
    </tr>
  </thead>
  <tbody>
%{for row in rows~}
    <tr>
%{for cell in row~}
      <td>${cell}</td>
%{endfor~}
    </tr>
%{endfor~}
  </tbody>
</table>
```

```hcl
# main.tf
locals {
  report = templatefile("${path.module}/templates/report.html.tpl", {
    headers = ["Service", "Status", "Region"]
    rows = [
      ["web-api", "running", "us-east-1"],
      ["auth-service", "running", "us-east-1"],
      ["worker", "stopped", "us-west-2"]
    ]
  })
}
```

## Tips for Clean Output

Managing whitespace in template loops takes some practice. Here are key tips:

1. Use `~` at the beginning of `%{for}` and `%{endfor}` to strip extra newlines
2. Place content on the same line as the `%{for}` directive when possible
3. Test your templates with `terraform console` using `templatefile()`
4. For JSON output, consider using `jsonencode()` instead of template loops where possible

## Summary

Loops in `templatefile` templates give you the ability to generate repetitive configuration sections from dynamic data. Whether you are building Nginx upstream blocks, Kubernetes environment variables, firewall rules, or JSON policy documents, the `%{for}...%{endfor}` directive handles it. Master the `~` whitespace trimming modifier early - it is the key to producing clean output. For conditional sections within your templates, see [templatefile with conditionals](https://oneuptime.com/blog/post/2026-02-23-how-to-use-templatefile-function-with-conditionals/view).
