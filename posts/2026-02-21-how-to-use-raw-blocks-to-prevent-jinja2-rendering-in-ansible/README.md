# How to Use raw Blocks to Prevent Jinja2 Rendering in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Raw Blocks, Configuration Management

Description: Learn how to use raw blocks in Ansible templates to prevent Jinja2 from processing sections of your template that should be output literally.

---

Jinja2 processes everything in an Ansible template by default. Every `{{ }}` gets treated as a variable expression, every `{% %}` as a control statement, and every `{# #}` as a comment. But sometimes you need parts of your template to pass through without any processing. The `{% raw %}` block tells Jinja2 to treat its contents as plain text, outputting it exactly as written.

This is different from the escaping approaches covered in other articles. Raw blocks are not about escaping individual characters; they are about telling Jinja2 to completely ignore an entire section.

## Basic Syntax

```jinja2
{# Anything between raw and endraw is output literally #}
{% raw %}
This {{ will_not_be_interpreted }} as a variable.
This {% will_not_be_treated %} as a tag.
This {# will_not_be_removed #} as a comment.
{% endraw %}
```

Output (exactly as written):
```
This {{ will_not_be_interpreted }} as a variable.
This {% will_not_be_treated %} as a tag.
This {# will_not_be_removed #} as a comment.
```

## Why raw Blocks Exist

Raw blocks solve several problems:

1. Generating config files for tools that use `{{ }}` syntax (Prometheus, Go templates, Consul Template)
2. Including literal Jinja2 syntax in documentation or examples
3. Embedding template snippets that another system will process later
4. Writing configuration for template engines that share Jinja2's syntax (like Nunjucks or Twig)

## Prometheus Alert Rules

This is probably the single most common use case for raw blocks in real-world Ansible usage:

```jinja2
{# templates/prometheus_rules.yml.j2 - Prometheus rules with Go template annotations #}
# Prometheus Alert Rules
# Environment: {{ environment }}
# Generated: {{ ansible_date_time.iso8601 }}

groups:
  - name: system_alerts
    rules:
      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > {{ cpu_threshold | default(80) }}
        for: 10m
        labels:
          severity: warning
          env: {{ environment }}
        annotations:
{% raw %}
          summary: "High CPU on {{ $labels.instance }}"
          description: |
            CPU usage is {{ printf "%.1f" $value }}% on {{ $labels.instance }}.
            This has been above threshold for more than 10 minutes.
{% endraw %}

      - alert: DiskAlmostFull
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < {{ disk_threshold | default(10) }}
        for: 5m
        labels:
          severity: critical
          env: {{ environment }}
        annotations:
{% raw %}
          summary: "Disk almost full on {{ $labels.instance }}"
          description: |
            Filesystem {{ $labels.mountpoint }} on {{ $labels.instance }}
            has only {{ printf "%.1f" $value }}% space remaining.
{% endraw %}
```

Notice how Ansible variables (`environment`, `cpu_threshold`) are used outside raw blocks, while Go template variables (`$labels.instance`, `$value`) are protected inside raw blocks.

## Consul Template Files

Consul Template uses the same `{{ }}` syntax for its own template engine:

```jinja2
{# templates/haproxy.ctmpl.j2 - Consul Template for HAProxy backends #}
# HAProxy Backends - Generated via Consul Template
# Installed by Ansible on {{ inventory_hostname }}
# Consul Address: {{ consul_address }}

{% raw %}
backend web_backend
    balance roundrobin
    option httpchk GET /health
{{range service "web"}}
    server {{.Node}} {{.Address}}:{{.Port}} check inter 5s
{{end}}

backend api_backend
    balance leastconn
    option httpchk GET /api/health
{{range service "api"}}
    server {{.Node}} {{.Address}}:{{.Port}} check inter 5s
{{end}}
{% endraw %}
```

## Generating Jinja2 Templates

A meta use case: generating Jinja2 templates themselves with Ansible:

```jinja2
{# templates/email_template.html.j2 - Generate a Jinja2 template for a web app #}
{# This Ansible template generates a Jinja2 template that the web application will use #}

{% raw %}
<!DOCTYPE html>
<html>
<head><title>{{ subject }}</title></head>
<body>
  <h1>Hello {{ user.name }},</h1>
  <p>{{ message_body }}</p>
  {% if action_url %}
  <a href="{{ action_url }}">{{ action_text }}</a>
  {% endif %}
  <footer>
    <p>&copy; {{ current_year }} Our Company</p>
  </footer>
</body>
</html>
{% endraw %}
```

The entire template is inside a raw block because every `{{ }}` and `{% %}` is meant for the web application's Jinja2 rendering, not for Ansible.

But what if you need to inject some Ansible values? Break up the raw blocks:

```jinja2
{# templates/email_template.html.j2 - Mix Ansible and raw content #}
{% raw %}
<!DOCTYPE html>
<html>
<head><title>{{ subject }}</title></head>
<body>
  <h1>Hello {{ user.name }},</h1>
{% endraw %}
  <!-- App version: {{ app_version }} deployed by Ansible -->
{% raw %}
  <p>{{ message_body }}</p>
  {% if action_url %}
  <a href="{{ action_url }}">{{ action_text }}</a>
  {% endif %}
</body>
</html>
{% endraw %}
```

## Terraform HCL Files

When generating Terraform configurations:

```jinja2
{# templates/main.tf.j2 - Terraform config with both Ansible and HCL variables #}
# Terraform Configuration
# Region: {{ aws_region }}
# Account: {{ aws_account_id }}

provider "aws" {
  region = "{{ aws_region }}"
}

{% raw %}
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 2
}

resource "aws_instance" "app" {
  count         = var.instance_count
  instance_type = "t3.medium"

  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
{% endraw %}
```

## Envoy Proxy Configuration

Envoy uses Go template syntax in some dynamic configurations:

```jinja2
{# templates/envoy_lds.yml.j2 - Envoy listener config template #}
# Envoy Listener Discovery Service
# Cluster: {{ cluster_name }}

resources:
  - "@type": type.googleapis.com/envoy.config.listener.v3.Listener
    name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: {{ envoy_port | default(10000) }}
    filter_chains:
      - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stat_prefix: ingress_http
              access_log_format:
{% raw %}
                "[%START_TIME%] \"%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%\" %RESPONSE_CODE% {{.upstream_host}}"
{% endraw %}
```

## Whitespace Control with raw

Raw blocks preserve all whitespace, including leading spaces. If you need to control indentation:

```jinja2
{# Whitespace is preserved exactly as written inside raw blocks #}
    some_key:
{% raw %}
      annotations:
        summary: "{{ $labels.instance }} is down"
{% endraw %}
```

The indentation inside the raw block is output literally, so make sure it matches what the target file format expects.

## Nesting Considerations

You cannot nest raw blocks. This will cause an error:

```jinja2
{# THIS WILL FAIL - no nesting of raw blocks #}
{% raw %}
  outer raw
  {% raw %}
  inner raw
  {% endraw %}
  still outer
{% endraw %}
```

Jinja2 matches the first `{% endraw %}` it finds with the opening `{% raw %}`, so the "inner raw" line would not work as expected.

## Alternative: The copy Module

If your entire file should be output without any Jinja2 processing, skip the template module entirely:

```yaml
# For files that need zero Ansible processing, use copy instead
- name: Deploy static config file
  ansible.builtin.copy:
    src: files/consul_template.ctmpl
    dest: /etc/consul-template/templates/
    mode: '0644'
```

This is simpler than wrapping the entire file in a raw block.

## Performance Note

Raw blocks have essentially zero performance overhead. Jinja2 simply skips parsing for the raw section and copies the text directly to the output. For very large template files where most content is in raw blocks, you might consider whether the `copy` module would be more appropriate, but for typical config files, raw blocks are perfectly fine.

## Testing Raw Block Output

Always verify that your raw blocks produce the expected output:

```yaml
# Test template rendering before deploying
- name: Render template to temp location
  ansible.builtin.template:
    src: prometheus_rules.yml.j2
    dest: /tmp/test_rules.yml

- name: Verify Go template syntax is preserved
  ansible.builtin.shell: "grep -c '{{ .labels' /tmp/test_rules.yml"
  register: grep_result
  changed_when: false

- name: Confirm literal braces are present
  ansible.builtin.assert:
    that: grep_result.stdout | int > 0
    fail_msg: "Raw blocks did not preserve Go template syntax"
```

## Summary

Raw blocks are the most straightforward way to include literal `{{ }}`, `{% %}`, or `{# #}` syntax in Ansible templates. Use them whenever you generate configuration files for systems that share Jinja2's delimiter syntax, especially Prometheus, Consul Template, Terraform, Go templates, and other Jinja2-based template engines. Break up raw blocks when you need to mix Ansible variables with literal syntax, and consider using the `copy` module instead when the entire file needs no Ansible processing. Keep raw blocks as small as possible so you can still use Ansible variables for the parts that need dynamic values.
