# How to Use Jinja2 Whitespace Control in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Configuration Management

Description: Learn how to control whitespace in Jinja2 templates for Ansible to produce clean, properly formatted configuration files.

---

If you have ever generated a configuration file with Ansible templates and ended up with random blank lines scattered throughout, you know how frustrating whitespace issues can be. Jinja2 templates are powerful, but by default they preserve all the whitespace around your template tags. This means every `{% if %}`, `{% for %}`, and `{% endif %}` block leaves behind empty lines in your output. In this post, we will look at several techniques for taming whitespace in your Ansible Jinja2 templates.

## Why Whitespace Matters in Templates

Configuration files for services like Nginx, Apache, HAProxy, and systemd are often sensitive to formatting. Extra blank lines might not break anything in some cases, but they make the output look messy and harder to diff against expected baselines. When you are managing hundreds of servers, clean configuration output is a matter of operational hygiene.

Consider a simple template that generates an `/etc/hosts` style file:

```yaml
# hosts.j2 - Template that generates a hosts file
{% for host in hosts %}
{{ host.ip }}  {{ host.name }}
{% endfor %}
```

When rendered with three hosts, you might expect a tight list. Instead, you get extra blank lines because each `{% for %}` and `{% endfor %}` tag occupies its own line, and Jinja2 faithfully preserves those newlines.

## The Dash Modifier: Your Primary Tool

Jinja2 provides a dash (`-`) modifier that you can place inside any tag delimiter to strip whitespace on that side. You can add it to the opening side, the closing side, or both.

Here are the three variations:

```jinja2
{# Strip whitespace BEFORE the tag #}
{%- for host in hosts %}

{# Strip whitespace AFTER the tag #}
{% for host in hosts -%}

{# Strip whitespace on BOTH sides #}
{%- for host in hosts -%}
```

Let us fix our hosts template using dash modifiers:

```yaml
# hosts_clean.j2 - Same template but with whitespace control
{%- for host in hosts %}
{{ host.ip }}  {{ host.name }}
{%- endfor %}
```

This produces output with no extra blank lines. The `{%-` at the start of the for loop eats the newline before it, and the `{%-` on the endfor eats the newline that would otherwise appear after the last host entry.

## Practical Example: Generating an Nginx Upstream Block

Let us build a real-world example. Suppose you want to generate an Nginx upstream configuration with conditional health checks.

Here is the playbook:

```yaml
# playbook.yml - Generates nginx upstream config from template
- name: Generate nginx upstream config
  hosts: localhost
  vars:
    upstream_name: "backend_pool"
    servers:
      - address: "10.0.1.10"
        port: 8080
        weight: 5
        backup: false
      - address: "10.0.1.11"
        port: 8080
        weight: 3
        backup: false
      - address: "10.0.1.12"
        port: 8080
        weight: 1
        backup: true
    health_check: true
    health_check_interval: 30
  tasks:
    - name: Render upstream config
      ansible.builtin.template:
        src: upstream.conf.j2
        dest: /etc/nginx/conf.d/upstream.conf
```

And here is the template without any whitespace control:

```jinja2
# upstream_bad.conf.j2 - Without whitespace control (produces messy output)
upstream {{ upstream_name }} {
{% for server in servers %}
{% if server.backup %}
    server {{ server.address }}:{{ server.port }} weight={{ server.weight }} backup;
{% else %}
    server {{ server.address }}:{{ server.port }} weight={{ server.weight }};
{% endif %}
{% endfor %}
{% if health_check %}
    # Health check configuration
    health_check interval={{ health_check_interval }};
{% endif %}
}
```

This will produce output with blank lines between each server entry and around the health check block. Now let us fix it:

```jinja2
# upstream_good.conf.j2 - With whitespace control (clean output)
upstream {{ upstream_name }} {
{%- for server in servers %}
{%- if server.backup %}
    server {{ server.address }}:{{ server.port }} weight={{ server.weight }} backup;
{%- else %}
    server {{ server.address }}:{{ server.port }} weight={{ server.weight }};
{%- endif %}
{%- endfor %}
{%- if health_check %}
    # Health check configuration
    health_check interval={{ health_check_interval }};
{%- endif %}
}
```

The rendered output will be:

```nginx
upstream backend_pool {
    server 10.0.1.10:8080 weight=5;
    server 10.0.1.11:8080 weight=3;
    server 10.0.1.12:8080 weight=1 backup;
    # Health check configuration
    health_check interval=30;
}
```

Clean and exactly what you would write by hand.

## Global Whitespace Settings in Ansible

Instead of sprinkling dashes throughout every template, you can configure Ansible to trim whitespace globally. In your `ansible.cfg`:

```ini
# ansible.cfg - Global Jinja2 whitespace settings
[defaults]
jinja2_extensions = jinja2.ext.loopcontrols
```

And in individual template tasks, you can set `trim_blocks` and `lstrip_blocks`:

```yaml
# playbook.yml - Using trim_blocks and lstrip_blocks per task
- name: Render config with global whitespace trimming
  ansible.builtin.template:
    src: myconfig.conf.j2
    dest: /etc/myapp/config.conf
    trim_blocks: true
    lstrip_blocks: true
```

What do these options do?

- **trim_blocks**: Removes the first newline after a block tag. So `{% if something %}\n` becomes `{% if something %}` with no trailing newline.
- **lstrip_blocks**: Strips leading whitespace (spaces and tabs) from the start of a line up to and including a block tag. This lets you indent your Jinja2 tags for readability without that indentation appearing in the output.

You can also set these in `ansible.cfg` globally:

```ini
# ansible.cfg - Enable both trim and lstrip globally
[defaults]
jinja2_native = false
```

Note that as of Ansible 2.14+, you can set `ANSIBLE_JINJA2_NATIVE` and related environment variables as well. But the per-task `trim_blocks` and `lstrip_blocks` options give you fine-grained control.

## Combining lstrip_blocks with Indented Templates

The `lstrip_blocks` option is particularly useful when you want your template source to be readable. Without it, you often end up with all your Jinja2 tags crammed against the left margin. With `lstrip_blocks: true`, you can write:

```jinja2
# haproxy.cfg.j2 - Readable template using lstrip_blocks
global
    maxconn 4096
    log /dev/log local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80
    {% for acl in acls %}
    acl {{ acl.name }} {{ acl.condition }}
    {% endfor %}

    {% for rule in use_backend_rules %}
    use_backend {{ rule.backend }} if {{ rule.acl }}
    {% endfor %}

    default_backend {{ default_backend }}

{% for backend in backends %}
backend {{ backend.name }}
    balance {{ backend.balance | default('roundrobin') }}
    {% for server in backend.servers %}
    server {{ server.name }} {{ server.address }}:{{ server.port }} check
    {% endfor %}

{% endfor %}
```

With `trim_blocks` and `lstrip_blocks` both enabled, this renders cleanly without the indented Jinja2 tags inserting extra spaces into the output.

## Expression Whitespace Control

Do not forget that the dash modifier also works with expression tags (`{{ }}`):

```jinja2
# Stripping whitespace around expressions
connection_string = {{- db_host -}}:{{- db_port -}}/{{- db_name -}}
```

This collapses all whitespace between the variable values, producing something like:

```
connection_string =db_host_value:5432/mydb
```

Be careful with this though. Usually you want some whitespace around expressions, so use this sparingly.

## A Quick Reference for Whitespace Modifiers

| Syntax | Effect |
|--------|--------|
| `{% tag %}` | No whitespace stripping |
| `{%- tag %}` | Strip whitespace before the tag |
| `{% tag -%}` | Strip whitespace after the tag |
| `{%- tag -%}` | Strip whitespace on both sides |
| `{{ var }}` | Normal expression output |
| `{{- var -}}` | Strip whitespace around expression |

## Tips for Debugging Whitespace Issues

When you are troubleshooting template whitespace, try rendering the template locally first:

```yaml
# debug_whitespace.yml - Render template to stdout for inspection
- name: Debug template output
  hosts: localhost
  gather_facts: false
  vars:
    items:
      - one
      - two
      - three
  tasks:
    - name: Render and display template
      ansible.builtin.debug:
        msg: "{{ lookup('template', 'mytemplate.j2') }}"
```

This lets you see exactly what the rendered output looks like without writing to a file. You can compare the output line by line with your expected result.

Another helpful trick is to temporarily add visible markers in your template:

```jinja2
# Temporary markers to visualize whitespace (remove before production)
|START|{%- for item in items %}
{{ item }}
{%- endfor %}|END|
```

The pipe characters make it obvious where your content begins and ends.

## Wrapping Up

Whitespace control in Jinja2 templates comes down to three mechanisms: the dash modifier inside tags, the `trim_blocks` option, and the `lstrip_blocks` option. For most Ansible projects, enabling `trim_blocks` and `lstrip_blocks` globally and then using dash modifiers for edge cases is the most maintainable approach. Your configuration files will render cleanly, your diffs will be sensible, and anyone reviewing your templates will thank you for keeping things tidy.
