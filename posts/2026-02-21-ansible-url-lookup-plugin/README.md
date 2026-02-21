# How to Use the Ansible url Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, HTTP, API Integration

Description: Learn how to use the Ansible url lookup plugin to fetch data from HTTP endpoints and APIs directly within your playbooks and templates.

---

There are plenty of situations where your Ansible playbook needs to grab data from a remote HTTP endpoint. Maybe you need to pull a configuration file from an internal API, check a service discovery endpoint, or fetch the latest release version from GitHub. The Ansible `url` lookup plugin lets you make HTTP requests directly inside your playbook variables and tasks without shelling out to `curl`.

## What the url Lookup Does

The `url` lookup plugin fetches content from a URL and returns it as a string. It supports HTTP and HTTPS, basic authentication, custom headers, and various other options you would expect from an HTTP client.

## Basic Usage

The simplest form fetches a URL and returns its content.

This playbook fetches a public IP address from an API:

```yaml
# playbook.yml - Fetch data from a URL
---
- name: Get external information from APIs
  hosts: localhost
  tasks:
    - name: Get public IP address
      ansible.builtin.debug:
        msg: "Public IP: {{ lookup('url', 'https://api.ipify.org') }}"
```

## Fetching JSON APIs

Most modern APIs return JSON. You can parse the response with the `from_json` filter.

This example fetches release information from a GitHub API:

```yaml
# playbook.yml - Fetch and parse JSON from an API
---
- name: Get latest release info
  hosts: localhost
  tasks:
    - name: Fetch latest Nginx release info
      ansible.builtin.set_fact:
        release_info: "{{ lookup('url', 'https://api.github.com/repos/nginx/nginx/tags', headers={'Accept': 'application/json'}) | from_json }}"

    - name: Show latest tag
      ansible.builtin.debug:
        msg: "Latest Nginx tag: {{ release_info[0].name }}"
```

## Authentication

The plugin supports basic authentication and custom headers for protected endpoints.

This playbook accesses an authenticated API:

```yaml
# playbook.yml - Authenticated URL lookups
---
- name: Access protected APIs
  hosts: localhost
  vars:
    api_token: "{{ vault_api_token }}"
  tasks:
    # Basic authentication
    - name: Fetch from basic auth endpoint
      ansible.builtin.debug:
        msg: "{{ lookup('url', 'https://api.example.com/config', username='admin', password='secret') }}"

    # Bearer token authentication via headers
    - name: Fetch from token-authenticated API
      ansible.builtin.set_fact:
        api_response: "{{ lookup('url', 'https://api.example.com/settings', headers={'Authorization': 'Bearer ' + api_token}) | from_json }}"

    - name: Use the API response
      ansible.builtin.debug:
        msg: "Setting value: {{ api_response.max_workers }}"
```

## Parameter Reference

The `url` lookup supports many parameters that control the HTTP request behavior.

Here is a playbook showing the most useful parameters:

```yaml
# playbook.yml - Demonstrating url lookup parameters
---
- name: URL lookup parameter examples
  hosts: localhost
  tasks:
    # Validate SSL certificates (default is true)
    - name: Fetch from self-signed endpoint
      ansible.builtin.debug:
        msg: "{{ lookup('url', 'https://internal.example.com/config', validate_certs=false) }}"

    # Set a custom timeout
    - name: Fetch with 30 second timeout
      ansible.builtin.debug:
        msg: "{{ lookup('url', 'https://slow-api.example.com/data', timeout=30) }}"

    # Split response by lines
    - name: Get response as list of lines
      ansible.builtin.debug:
        msg: "{{ lookup('url', 'https://example.com/list.txt', split_lines=true) }}"

    # Use client certificates for mTLS
    - name: Fetch with client certificate
      ansible.builtin.debug:
        msg: "{{ lookup('url', 'https://secure.example.com/data', client_cert='/etc/ssl/client.pem', client_key='/etc/ssl/client.key') }}"
```

Key parameters include:

- **validate_certs**: Whether to validate SSL certificates (default: `true`)
- **username/password**: Basic auth credentials
- **headers**: Dictionary of HTTP headers to send
- **timeout**: Request timeout in seconds
- **split_lines**: Return result as a list of lines instead of a single string
- **client_cert/client_key**: Client certificate for mutual TLS
- **use_proxy**: Whether to use the system proxy (default: `true`)
- **force**: Always fetch, ignore cache (default: `false`)

## Practical Example: Dynamic Inventory Configuration

One useful pattern is pulling configuration data from a central config service.

Say you have a config API that returns per-environment settings:

```yaml
# playbook.yml - Pull config from a central API
---
- name: Configure application from central config service
  hosts: appservers
  vars:
    env: "{{ target_env | default('staging') }}"
    config_url: "https://config.internal.example.com/api/v1/config/{{ env }}"
    app_config: "{{ lookup('url', config_url, headers={'X-Api-Key': vault_config_api_key}) | from_json }}"
  tasks:
    - name: Display fetched configuration
      ansible.builtin.debug:
        msg: |
          Environment: {{ env }}
          Database host: {{ app_config.database.host }}
          Cache TTL: {{ app_config.cache.ttl }}

    - name: Template application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/config.yml
        mode: '0644'
      notify: restart myapp
```

## Fetching Files for Deployment

You can use the url lookup to download configuration snippets or scripts from a central repository.

This playbook fetches and deploys an Nginx configuration:

```yaml
# playbook.yml - Fetch and deploy configs from a URL
---
- name: Deploy Nginx config from central repo
  hosts: webservers
  tasks:
    - name: Fetch the latest Nginx config template
      ansible.builtin.copy:
        content: "{{ lookup('url', 'https://configs.internal.example.com/nginx/default.conf') }}"
        dest: /etc/nginx/conf.d/default.conf
        mode: '0644'
      notify: reload nginx

    - name: Fetch SSL parameters
      ansible.builtin.copy:
        content: "{{ lookup('url', 'https://configs.internal.example.com/nginx/ssl-params.conf') }}"
        dest: /etc/nginx/snippets/ssl-params.conf
        mode: '0644'
      notify: reload nginx
```

## Service Discovery Integration

If you use a service discovery system like Consul, the url lookup lets you query it directly.

This example queries Consul for healthy service instances:

```yaml
# playbook.yml - Query Consul for service discovery
---
- name: Configure load balancer from Consul
  hosts: loadbalancers
  vars:
    consul_url: "http://consul.internal.example.com:8500"
    backend_services: "{{ lookup('url', consul_url + '/v1/health/service/webapp?passing=true') | from_json }}"
  tasks:
    - name: Show discovered backends
      ansible.builtin.debug:
        msg: "Backend: {{ item.Service.Address }}:{{ item.Service.Port }}"
      loop: "{{ backend_services }}"

    - name: Template HAProxy config with discovered backends
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
      notify: reload haproxy
```

## Error Handling

The url lookup will fail the play if the request fails. Use `default` filter or `ignore_errors` to handle failures gracefully.

This playbook handles HTTP errors:

```yaml
# playbook.yml - Handling URL lookup errors
---
- name: Graceful URL fetching
  hosts: localhost
  tasks:
    # Method 1: Use the default filter
    - name: Fetch with fallback value
      ansible.builtin.set_fact:
        api_data: "{{ lookup('url', 'https://possibly-down.example.com/config', errors='ignore') | default('{}', true) | from_json }}"

    # Method 2: Use block/rescue
    - name: Try to fetch critical data
      block:
        - name: Fetch configuration
          ansible.builtin.set_fact:
            remote_config: "{{ lookup('url', 'https://config-api.example.com/v1/settings') | from_json }}"
      rescue:
        - name: Use local fallback config
          ansible.builtin.set_fact:
            remote_config: "{{ lookup('file', 'fallback_config.json') | from_json }}"
        - name: Warn about fallback
          ansible.builtin.debug:
            msg: "WARNING: Using local fallback configuration"
```

## Security Considerations

A few things to keep in mind when using the url lookup:

1. **Do not hardcode credentials**: Store API keys and passwords in Ansible Vault, not in your playbooks.

2. **Validate SSL certificates**: Only set `validate_certs=false` for development environments with self-signed certs. In production, always validate.

3. **Be cautious with untrusted content**: The content returned by the url lookup is a string. If you use it in a template or pass it to a shell command, it could be a vector for injection attacks. Sanitize untrusted content.

4. **Rate limiting**: If you call an API inside a loop across many hosts, you might hit rate limits. Consider fetching once on localhost and distributing the result with `set_fact` and `delegate_to`.

5. **Network dependency**: Your playbook now depends on a remote service being available. If that service is down, your deployment fails. Always have a fallback plan.

The `url` lookup plugin bridges the gap between Ansible and the wider HTTP ecosystem. Instead of writing custom modules or shelling out to curl, you get clean, inline HTTP requests that integrate naturally with the rest of your playbook logic.
