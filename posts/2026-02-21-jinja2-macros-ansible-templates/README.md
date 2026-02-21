# How to Use Jinja2 Macros in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Automation

Description: Learn how to create and use Jinja2 macros in Ansible templates to build reusable template functions and reduce duplication.

---

If you have ever found yourself copying and pasting the same chunk of template logic across multiple sections of a Jinja2 file, macros are the solution you have been looking for. Jinja2 macros work like functions: you define a block of template code with parameters, then call it wherever you need that output. In the context of Ansible templates, this keeps your configuration generation DRY and maintainable.

## What Are Jinja2 Macros?

A macro is essentially a reusable template fragment. You define it with `{% macro %}` and call it like a function. Here is the simplest possible example:

```jinja2
{# Define a macro that generates a server line #}
{% macro server_line(address, port, weight=1) %}
    server {{ address }}:{{ port }} weight={{ weight }};
{% endmacro %}

{# Call the macro #}
{{ server_line("10.0.1.10", 8080) }}
{{ server_line("10.0.1.11", 8080, weight=3) }}
```

This renders to:

```
    server 10.0.1.10:8080 weight=1;
    server 10.0.1.11:8080 weight=3;
```

The macro accepts parameters, has default values, and produces output just like a function call.

## Real-World Example: Nginx Location Blocks

Let us say you are generating an Nginx configuration with multiple location blocks, and many of them share similar structure. Without macros, you end up with a lot of repetition:

```jinja2
{# nginx_without_macros.conf.j2 - Repetitive and hard to maintain #}
location /api {
    proxy_pass http://api_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 30s;
    proxy_read_timeout 60s;
}

location /auth {
    proxy_pass http://auth_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 30s;
    proxy_read_timeout 60s;
}
```

Now with a macro:

```jinja2
{# nginx_with_macros.conf.j2 - Clean and DRY #}
{% macro proxy_location(path, backend, connect_timeout="30s", read_timeout="60s") -%}
location {{ path }} {
    proxy_pass http://{{ backend }};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout {{ connect_timeout }};
    proxy_read_timeout {{ read_timeout }};
}
{%- endmacro %}

{{ proxy_location("/api", "api_backend") }}

{{ proxy_location("/auth", "auth_backend") }}

{{ proxy_location("/uploads", "upload_backend", read_timeout="300s") }}
```

Three location blocks with consistent formatting, and if you need to add a new proxy header, you change it in one place.

## Macros with Complex Logic

Macros can contain conditionals, loops, and any other Jinja2 construct. Here is a macro that generates an HAProxy backend section with optional SSL and health checks:

```jinja2
{# haproxy_macros.cfg.j2 - Macro with conditional logic inside #}
{% macro haproxy_backend(name, servers, balance="roundrobin", ssl=false, health_path="/health") -%}
backend {{ name }}
    balance {{ balance }}
    option httpchk GET {{ health_path }}
    http-check expect status 200
{%- for server in servers %}
    server {{ server.name }} {{ server.host }}:{{ server.port }} check inter 3000{% if ssl %} ssl verify none{% endif %}{% if server.weight is defined %} weight {{ server.weight }}{% endif %}

{%- endfor %}

{%- endmacro %}

{# Now generate multiple backends using the macro #}
{{ haproxy_backend("web_servers", web_backends) }}

{{ haproxy_backend("api_servers", api_backends, balance="leastconn", ssl=true) }}

{{ haproxy_backend("static_servers", static_backends, health_path="/ping") }}
```

The corresponding playbook variables would look like this:

```yaml
# group_vars/all.yml - Backend server definitions
web_backends:
  - name: web1
    host: 10.0.1.10
    port: 8080
    weight: 5
  - name: web2
    host: 10.0.1.11
    port: 8080
    weight: 3

api_backends:
  - name: api1
    host: 10.0.2.10
    port: 9090
  - name: api2
    host: 10.0.2.11
    port: 9090

static_backends:
  - name: static1
    host: 10.0.3.10
    port: 80
```

## The caller() Function

Macros support a special feature called `caller()` that works with the `{% call %}` block. This lets you pass a block of content into a macro, similar to how block elements work in HTML components.

```jinja2
{# Macro that wraps content in an Nginx server block #}
{% macro server_block(server_name, listen_port=80) -%}
server {
    listen {{ listen_port }};
    server_name {{ server_name }};

{{ caller() }}
}
{%- endmacro %}

{# Use call to pass content into the macro #}
{% call server_block("example.com") %}
    location / {
        root /var/www/example;
        index index.html;
    }

    location /api {
        proxy_pass http://api_backend;
    }
{% endcall %}

{% call server_block("staging.example.com", 8080) %}
    location / {
        root /var/www/staging;
        index index.html;
        auth_basic "Staging Area";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
{% endcall %}
```

The `caller()` function inserts whatever content is between `{% call %}` and `{% endcall %}` into the macro output. This pattern is powerful for wrapper-style macros where the outer structure is consistent but the inner content varies.

## Importing Macros from External Files

For larger projects, you will want to keep your macros in separate files and import them. Create a dedicated macros file:

```jinja2
{# templates/macros/nginx_macros.j2 - Shared Nginx macros #}
{% macro upstream_block(name, servers, method="least_conn") -%}
upstream {{ name }} {
    {{ method }};
{%- for server in servers %}
    server {{ server.host }}:{{ server.port }}{% if server.weight is defined %} weight={{ server.weight }}{% endif %};
{%- endfor %}
}
{%- endmacro %}

{% macro ssl_config(cert_path, key_path, protocols="TLSv1.2 TLSv1.3") -%}
    ssl_certificate {{ cert_path }};
    ssl_certificate_key {{ key_path }};
    ssl_protocols {{ protocols }};
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
{%- endmacro %}
```

Then import and use them in your main template:

```jinja2
{# templates/nginx.conf.j2 - Main template that imports macros #}
{% from 'macros/nginx_macros.j2' import upstream_block, ssl_config %}

{{ upstream_block("app_pool", app_servers) }}
{{ upstream_block("api_pool", api_servers, method="ip_hash") }}

server {
    listen 443 ssl;
    server_name {{ domain_name }};

{{ ssl_config(ssl_cert_path, ssl_key_path) }}

    location / {
        proxy_pass http://app_pool;
    }
}
```

For this to work, both template files need to be accessible to Ansible. Place them in the same `templates/` directory of your role, or use the full path.

## Macro Scope and Variables

One thing to know about macros is that they have their own scope. Variables defined outside the macro are not automatically available inside it. You need to pass everything the macro needs as parameters:

```jinja2
{# This will NOT work - environment is not in macro scope #}
{% set environment = "production" %}

{% macro broken_macro() %}
    Environment: {{ environment }}
{% endmacro %}

{# This WILL work - pass it as a parameter #}
{% macro working_macro(env) %}
    Environment: {{ env }}
{% endmacro %}

{{ working_macro(environment) }}
```

There is one exception: Ansible variables (facts, inventory variables, role defaults) are available inside macros through the special `varargs` context, but relying on this can make your macros harder to test and reuse. It is better practice to pass everything explicitly.

## Debugging Macros

When a macro produces unexpected output, use the `debug` module to inspect the rendered result:

```yaml
# debug_macro.yml - Test macro output before deploying
- name: Test macro rendering
  hosts: localhost
  gather_facts: false
  vars:
    test_servers:
      - name: srv1
        host: "192.168.1.10"
        port: 8080
  tasks:
    - name: Render template with macros and display
      ansible.builtin.debug:
        msg: "{{ lookup('template', 'templates/test_macros.j2') }}"
```

This lets you see the macro output without deploying to any host.

## When to Use Macros vs. Includes

Ansible templates also support `{% include %}` for pulling in other template files. The choice between macros and includes depends on your use case:

- Use **macros** when you need parameterized, reusable fragments that produce different output based on input values.
- Use **includes** when you want to pull in a static or semi-static block of template content.

Macros are more flexible because they take arguments and can be called multiple times with different parameters. Includes are simpler but less powerful.

## Wrapping Up

Jinja2 macros bring function-like reusability to your Ansible templates. Define common patterns once, call them with different parameters, and keep your templates DRY. For complex infrastructure configurations where the same structural patterns repeat with different values, macros can cut your template size significantly and make updates much less error-prone. Start small with a simple macro for your most repeated pattern, and build from there.
