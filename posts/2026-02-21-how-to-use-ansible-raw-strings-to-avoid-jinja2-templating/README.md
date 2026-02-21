# How to Use Ansible Raw Strings to Avoid Jinja2 Templating

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templating, YAML, DevOps

Description: Learn how to prevent Ansible from interpreting Jinja2 curly braces in strings using raw blocks, !unsafe tags, and other escaping techniques.

---

Ansible processes almost every string through its Jinja2 templating engine. This is usually what you want. Variables get expanded, filters get applied, and conditionals get evaluated. But sometimes you need to pass a literal string that contains curly braces `{{ }}` or other Jinja2 syntax without Ansible trying to interpret it. This happens more often than you might think: deploying Prometheus alerting rules, Grafana dashboards, Go templates, Terraform configurations, or any application that uses a similar templating syntax.

In this post, I will cover every technique for telling Ansible to leave your strings alone.

## The Problem

Consider this task that deploys a Prometheus alerting rule:

```yaml
# This will FAIL because Ansible tries to evaluate {{ $value }} as Jinja2
- name: Deploy Prometheus alert rule
  copy:
    content: |
      groups:
        - name: node_alerts
          rules:
            - alert: HighCPU
              expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
              annotations:
                summary: "CPU usage is {{ $value }}% on {{ $labels.instance }}"
    dest: /etc/prometheus/rules/node_alerts.yml
```

Ansible sees `{{ $value }}` and `{{ $labels.instance }}` and tries to resolve them as Jinja2 variables. Since `$value` and `$labels` do not exist in the Ansible context, this task fails with an undefined variable error.

## Solution 1: The {% raw %} Block

The most common solution is to wrap the problematic content in Jinja2 raw blocks:

```yaml
# Using {% raw %} to prevent Jinja2 interpretation
- name: Deploy Prometheus alert rule
  copy:
    content: |
      groups:
        - name: node_alerts
          rules:
            - alert: HighCPU
              expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
              annotations:
                {% raw %}summary: "CPU usage is {{ $value }}% on {{ $labels.instance }}"{% endraw %}
    dest: /etc/prometheus/rules/node_alerts.yml
```

You can wrap entire multi-line blocks:

```yaml
# Wrapping a large block of Go template content
- name: Deploy Go template configuration
  copy:
    content: |
      {% raw %}
      {{ define "main" }}
      <!DOCTYPE html>
      <html>
        <head><title>{{ .Title }}</title></head>
        <body>
          {{ range .Items }}
            <div class="item">
              <h2>{{ .Name }}</h2>
              <p>{{ .Description }}</p>
            </div>
          {{ end }}
        </body>
      </html>
      {{ end }}
      {% endraw %}
    dest: /opt/myapp/templates/main.gohtml
```

## Solution 2: The !unsafe Tag

Ansible's `!unsafe` YAML tag marks a value as unsafe, which tells Ansible to skip Jinja2 processing entirely:

```yaml
# Using !unsafe to prevent all Jinja2 templating on this value
- name: Deploy Grafana dashboard JSON
  copy:
    content: !unsafe |
      {
        "panels": [
          {
            "title": "CPU Usage",
            "targets": [
              {
                "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                "legendFormat": "{{ instance }}"
              }
            ]
          }
        ]
      }
    dest: /etc/grafana/dashboards/cpu.json
```

The `!unsafe` tag is simpler than `{% raw %}` but comes with a trade-off: you cannot use any Jinja2 templating in the entire value. With `{% raw %}`, you can mix templated and raw content in the same string.

## Solution 3: Escaping Individual Curly Braces

For cases where you only have a few Jinja2-like expressions mixed in with actual Ansible variables, you can escape the literal braces:

```yaml
# Escape literal curly braces by wrapping them in Jinja2 string expressions
- name: Deploy config with mixed templating
  copy:
    content: |
      # This uses an Ansible variable (will be templated)
      server_name: {{ server_name }}

      # These are literal curly braces for the application's own templating
      alert_template: "CPU is {{ '{{' }} $value {{ '}}' }}% on {{ '{{' }} $labels.instance {{ '}}' }}"
    dest: /etc/myapp/config.yml
```

The expression `{{ '{{' }}` outputs a literal `{{` because Jinja2 evaluates the string `'{{'` and outputs it as-is.

## Solution 4: Using Variables for Raw Content

Store the raw content in a variable and mark it as unsafe:

```yaml
---
# deploy-templates.yml
# Store raw template content in variables

- hosts: webservers
  become: yes
  vars:
    # The !unsafe tag on the variable prevents Jinja2 processing
    prometheus_annotation: !unsafe "CPU usage is {{ $value }}% on {{ $labels.instance }}"

    grafana_legend: !unsafe "{{ instance }}"

  tasks:
    - name: Deploy Prometheus rule with raw annotation
      template:
        src: prometheus-rule.yml.j2
        dest: /etc/prometheus/rules/cpu.yml
```

In the template file, you can use the variable normally since it was already marked unsafe at definition time:

```yaml
# templates/prometheus-rule.yml.j2
groups:
  - name: cpu_alerts
    rules:
      - alert: HighCPU
        expr: node_cpu_usage > 80
        annotations:
          summary: {{ prometheus_annotation }}
```

## Solution 5: The raw Lookup Plugin

For loading raw content from external files, the `file` lookup with `!unsafe` works well:

```yaml
# Load file content without any Jinja2 processing
- name: Deploy Terraform template as-is
  copy:
    content: !unsafe "{{ lookup('file', 'files/terraform/user-data.tftpl') }}"
    dest: /opt/terraform/user-data.tftpl
```

Wait, that does not actually work because `!unsafe` and Jinja2 lookups conflict. Instead, use the `copy` module with `src` directly:

```yaml
# Copy a file without any templating
- name: Deploy Terraform template as-is
  copy:
    src: files/terraform/user-data.tftpl
    dest: /opt/terraform/user-data.tftpl
```

The `copy` module with `src` does not process Jinja2 at all, so the file content is transferred exactly as-is. This is the simplest approach when the raw content lives in a separate file.

## When to Use Each Technique

Here is a quick comparison:

```yaml
# Technique comparison:
#
# {% raw %}...{% endraw %}
#   - Use when: Mixing Ansible variables with literal curly braces
#   - Pro: Selective, can wrap just the parts that need escaping
#   - Con: Verbose for large blocks
#
# !unsafe
#   - Use when: The entire value should not be templated at all
#   - Pro: Clean, simple syntax
#   - Con: All-or-nothing, no Ansible variable interpolation allowed
#
# {{ '{{' }}
#   - Use when: Only a few instances of literal curly braces
#   - Pro: Inline, no wrapping needed
#   - Con: Ugly and hard to read with many occurrences
#
# copy with src (no template)
#   - Use when: The raw content is in a separate file
#   - Pro: Zero risk of Jinja2 interference
#   - Con: Cannot inject any Ansible variables into the file
```

## Real-World Example: Deploying a Complete Alertmanager Config

This example combines raw blocks with Ansible variables:

```yaml
---
# deploy-alertmanager.yml
# Mixes Ansible variables (for connection settings) with raw Go template syntax

- hosts: monitoring
  become: yes
  vars:
    slack_webhook: "https://hooks.slack.com/services/T00/B00/XXX"
    slack_channel: "#alerts"
    pagerduty_key: "abc123"

  tasks:
    - name: Deploy Alertmanager configuration
      copy:
        content: |
          global:
            slack_api_url: '{{ slack_webhook }}'

          route:
            receiver: 'slack-default'
            group_by: ['alertname', 'cluster']
            group_wait: 30s
            group_interval: 5m
            repeat_interval: 4h

          receivers:
            - name: 'slack-default'
              slack_configs:
                - channel: '{{ slack_channel }}'
                  send_resolved: true
                  {% raw %}
                  title: '{{ .Status | toUpper }}{{ if eq .Status "firing" }} ({{ .Alerts.Firing | len }}){{ end }}'
                  text: >-
                    {{ range .Alerts }}
                    *Alert:* {{ .Annotations.summary }}
                    *Description:* {{ .Annotations.description }}
                    *Severity:* {{ .Labels.severity }}
                    {{ end }}
                  {% endraw %}

            - name: 'pagerduty-critical'
              pagerduty_configs:
                - service_key: '{{ pagerduty_key }}'
                  {% raw %}
                  description: '{{ .CommonAnnotations.summary }}'
                  details:
                    firing: '{{ .Alerts.Firing | len }}'
                    resolved: '{{ .Alerts.Resolved | len }}'
                  {% endraw %}
        dest: /etc/alertmanager/alertmanager.yml
        owner: alertmanager
        group: alertmanager
        mode: '0640'
      notify: restart alertmanager
```

## Wrapping Up

Dealing with literal curly braces in Ansible is one of those problems that trips up everyone at least once. Use `{% raw %}` blocks when you need to mix Ansible variables with application-level templating syntax. Use `!unsafe` when an entire value should be passed through untouched. Use `copy` with `src` for files that should never be templated. And reserve the `{{ '{{' }}` escape for the rare case where only one or two expressions need protection. Pick the technique that keeps your playbook readable, and you will save yourself debugging time down the road.
