# How to Use consul-template for Dynamic Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Consul, Configuration Management, DevOps, Service Discovery

Description: Learn how to install and use consul-template on Ubuntu to automatically render configuration files from Consul KV and service data, enabling dynamic application reconfiguration.

---

consul-template is a daemon that watches Consul (and optionally Vault) for changes and re-renders configuration file templates whenever the data changes. When a template renders, it can optionally run a command - like reloading nginx or restarting an application. This eliminates the need for manual configuration updates when services scale, move, or rotate credentials.

## The Problem It Solves

Without consul-template, you face a common pattern:

1. A database server moves to a new IP
2. Ansible reruns, updates config files across 20 application servers
3. Applications restart one by one

With consul-template:

1. A database server registers with Consul with a new address
2. consul-template detects the change within seconds
3. Configuration files are rewritten on all watching hosts simultaneously
4. A reload command runs automatically

## Prerequisites

- Ubuntu 20.04 or 22.04
- A running Consul cluster or agent (see related guide)
- Services or KV data in Consul
- sudo privileges

## Installation

```bash
# Download the latest release
CTMPL_VERSION="0.39.0"
wget "https://releases.hashicorp.com/consul-template/${CTMPL_VERSION}/consul-template_${CTMPL_VERSION}_linux_amd64.zip"

# Extract and install
unzip "consul-template_${CTMPL_VERSION}_linux_amd64.zip"
sudo install -m 755 consul-template /usr/local/bin/

# Verify
consul-template --version
```

## Configuration

consul-template uses HCL configuration files. Create a base config:

```hcl
# /etc/consul-template/config.hcl

# Consul connection settings
consul {
  address = "127.0.0.1:8500"

  # ACL token if ACLs are enabled
  token = "your-consul-token"

  # TLS if using HTTPS
  ssl {
    enabled = true
    ca_cert = "/etc/consul-template/ca.pem"
    cert    = "/etc/consul-template/client.pem"
    key     = "/etc/consul-template/client-key.pem"
  }

  retry {
    enabled     = true
    attempts    = 12
    backoff     = "250ms"
    max_backoff = "2m"
  }
}

# Vault connection (optional - for secrets)
vault {
  address     = "https://vault.internal:8200"
  token       = "your-vault-token"
  renew_token = true

  retry {
    enabled = true
    attempts = 5
    backoff  = "1s"
  }
}

# Log settings
log_level = "info"

# Template definitions
template {
  source      = "/etc/consul-template/templates/nginx.conf.ctmpl"
  destination = "/etc/nginx/conf.d/upstream.conf"
  perms       = 0644
  backup      = true  # Keep a .bak copy before overwriting

  # Command to run after the template renders
  command         = "nginx -s reload"
  command_timeout = "10s"

  # Only run command if the file actually changed
  error_on_missing_key = true
}
```

## Template Syntax

consul-template uses Go's `text/template` syntax extended with Consul-specific functions.

### Reading from the KV Store

```nginx
# /etc/consul-template/templates/app.conf.ctmpl
# This becomes a real config file when rendered

[database]
host     = {{ key "config/app/db_host" }}
port     = {{ key "config/app/db_port" }}
name     = {{ key "config/app/db_name" }}
# Use keyOrDefault if the key might not exist
pool_size = {{ keyOrDefault "config/app/db_pool_size" "10" }}
```

### Discovering Services

```nginx
# /etc/consul-template/templates/nginx-upstream.conf.ctmpl

upstream backend {
  # List all healthy instances of the 'webapi' service
  {{ range service "webapi" }}
  server {{ .Address }}:{{ .Port }};
  {{ else }}
  # Fallback if no healthy instances
  server 127.0.0.1:8080 backup;
  {{ end }}
}

server {
  listen 80;
  server_name _;

  location /api/ {
    proxy_pass http://backend;
  }
}
```

When a new `webapi` instance registers in Consul or an existing one fails its health check, this template re-renders and nginx reloads.

### Filtering by Tags

```nginx
{{ range service "webapi@dc1" }}
# All webapi instances in datacenter dc1
server {{ .Address }}:{{ .Port }};
{{ end }}

# Only instances tagged 'canary'
{{ range service "webapi" }}
  {{ if .Tags | contains "canary" }}
server {{ .Address }}:{{ .Port }} weight=1;
  {{ end }}
{{ end }}

# Instances without the 'drain' tag (for graceful removal)
{{ range service "webapi" }}
  {{ if not (.Tags | contains "drain") }}
server {{ .Address }}:{{ .Port }};
  {{ end }}
{{ end }}
```

### HAProxy Configuration

```
# /etc/consul-template/templates/haproxy.cfg.ctmpl
global
  daemon
  maxconn 4096

defaults
  mode http
  timeout connect 5s
  timeout client  30s
  timeout server  30s

frontend http-in
  bind *:80
  default_backend webservers

backend webservers
  balance roundrobin
  option httpchk GET /health HTTP/1.1\r\nHost:\ localhost
  {{ range service "webapp" }}
  server {{ .Node }}-{{ .Port }} {{ .Address }}:{{ .Port }} check
  {{ end }}

frontend stats
  bind *:9000
  stats enable
  stats uri /stats
```

### Conditionals and Loops

```bash
# /etc/consul-template/templates/prometheus.yml.ctmpl

scrape_configs:
  {{ range services }}
  {{ if .Tags | contains "metrics" }}
  - job_name: '{{ .Name }}'
    static_configs:
      - targets:
          {{ range service .Name }}
          - '{{ .Address }}:{{ .Port }}'
          {{ end }}
    relabel_configs:
      - target_label: service
        replacement: '{{ .Name }}'
  {{ end }}
  {{ end }}
```

### Reading Vault Secrets

```toml
# /etc/consul-template/templates/app-secrets.conf.ctmpl
{{ with secret "secret/data/production/database" }}
DATABASE_URL=postgres://{{ .Data.data.username }}:{{ .Data.data.password }}@db.internal/myapp
{{ end }}

{{ with secret "secret/data/production/api-keys" }}
STRIPE_KEY={{ .Data.data.stripe_live_key }}
SENDGRID_KEY={{ .Data.data.sendgrid_key }}
{{ end }}
```

### Using Node Metadata

```yaml
# /etc/consul-template/templates/filebeat.yml.ctmpl
filebeat.inputs:
  - type: log
    paths:
      - /var/log/app/*.log
    fields:
      host: {{ env "HOSTNAME" }}
      datacenter: {{ key "config/datacenter" }}
      {{ range node }}
      node_id: {{ .Node.ID }}
      {{ end }}
```

## Running as a Systemd Service

```bash
# Create the service file
sudo tee /etc/systemd/system/consul-template.service << 'EOF'
[Unit]
Description=consul-template
Documentation=https://github.com/hashicorp/consul-template
Requires=consul.service
After=consul.service

[Service]
ExecStart=/usr/local/bin/consul-template -config=/etc/consul-template/config.hcl
Restart=on-failure
RestartSec=5

# Don't let consul-template start until Consul agent is ready
ExecStartPre=/bin/sh -c 'until consul info > /dev/null 2>&1; do sleep 1; done'

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable consul-template
sudo systemctl start consul-template

sudo journalctl -u consul-template -f
```

## Testing Templates Manually

Before deploying, test your templates:

```bash
# Dry run - prints rendered output without writing files
consul-template \
  -config /etc/consul-template/config.hcl \
  -template "/etc/consul-template/templates/nginx.conf.ctmpl:/tmp/nginx-test.conf" \
  -once  # Render once and exit

# View the result
cat /tmp/nginx-test.conf

# Test with a specific Consul address
consul-template \
  -consul-addr "127.0.0.1:8500" \
  -template "template.ctmpl:output.conf" \
  -once
```

## Populating Consul KV for Templates

```bash
# Set configuration values
consul kv put config/app/db_host "db-primary.internal"
consul kv put config/app/db_port "5432"
consul kv put config/app/db_name "production"
consul kv put config/app/db_pool_size "20"
consul kv put config/datacenter "us-east-1"

# These values immediately trigger template re-renders
# on all hosts running consul-template watching these keys
```

## Handling Template Errors

```hcl
# In config.hcl
template {
  source      = "/etc/consul-template/templates/app.conf.ctmpl"
  destination = "/etc/app/config.conf"

  # Don't crash if the Consul key doesn't exist yet
  error_on_missing_key = false

  # Wait for changes to settle before rendering (debounce)
  wait {
    min = "2s"   # Wait at least 2s after last change
    max = "10s"  # But always render within 10s
  }

  # Retry the command if it fails
  command = "/usr/local/bin/app reload"
  command_timeout = "30s"
}
```

The `wait` directive is important in busy environments where multiple Consul keys might change rapidly - it prevents thrashing by batching changes.

## Multiple Templates in One Config

```hcl
# /etc/consul-template/config.hcl

template {
  source      = "/etc/consul-template/templates/nginx-upstream.conf.ctmpl"
  destination = "/etc/nginx/conf.d/upstream.conf"
  command     = "nginx -t && nginx -s reload"
}

template {
  source      = "/etc/consul-template/templates/haproxy.cfg.ctmpl"
  destination = "/etc/haproxy/haproxy.cfg"
  command     = "haproxy -c -f /etc/haproxy/haproxy.cfg && systemctl reload haproxy"
}

template {
  source      = "/etc/consul-template/templates/prometheus.yml.ctmpl"
  destination = "/etc/prometheus/prometheus.yml"
  command     = "systemctl reload prometheus"
}
```

## Troubleshooting

**Template is not re-rendering:**
```bash
# Check consul-template logs
sudo journalctl -u consul-template -f

# Verify Consul is reachable
consul info
consul kv get config/app/db_host

# Run in debug mode
consul-template -config /etc/consul-template/config.hcl -log-level=debug
```

**Reload command failing:**
```bash
# Test the command directly
nginx -t && nginx -s reload

# Check consul-template has permission to run the command
# The process runs as root by default, but adjust if using a different user
```

**Template renders with empty values:**
- Check that the Consul keys exist: `consul kv get key/name`
- Verify the ACL token has read access to the keys
- Use `keyOrDefault` to provide fallback values

consul-template works well for any scenario where application configuration needs to track the current state of your infrastructure. The pattern of "watch data, render template, run reload command" covers a large percentage of configuration management needs without requiring custom code.
