# How to Use the Ansible uri Module with Custom Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HTTP Headers, uri Module, API

Description: Learn how to set custom HTTP headers in Ansible uri module requests for authentication, content negotiation, and API versioning.

---

HTTP headers carry metadata about your request: authentication credentials, content type preferences, API versions, caching directives, and custom application-specific data. The Ansible `uri` module lets you set any header you need through the `headers` parameter. Understanding how to use headers effectively is essential for working with APIs that require specific header configurations.

This post covers common header patterns, dynamic header generation, and real-world examples of header usage in Ansible playbooks.

## Setting Custom Headers

The `headers` parameter accepts a dictionary of header name-value pairs:

```yaml
# set custom HTTP headers on a request
---
- name: Request with custom headers
  hosts: localhost
  connection: local
  tasks:
    - name: Make API request with custom headers
      ansible.builtin.uri:
        url: https://api.example.com/data
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
          Accept: application/json
          X-Request-ID: "{{ ansible_date_time.epoch }}-{{ 999999 | random }}"
          X-Client-Name: ansible-automation
          X-Client-Version: "2.15"
        return_content: true
      register: response

    - name: Show response headers
      ansible.builtin.debug:
        msg:
          - "Status: {{ response.status }}"
          - "Content-Type: {{ response.content_type }}"
```

## Content-Type and Accept Headers

These headers control how data is sent and received:

```yaml
# control content negotiation with Content-Type and Accept headers
---
- name: Content negotiation examples
  hosts: localhost
  connection: local
  tasks:
    # Request JSON response
    - name: Request JSON data
      ansible.builtin.uri:
        url: https://api.example.com/users
        method: GET
        headers:
          Accept: application/json
        return_content: true
      register: json_response

    # Request XML response from the same endpoint
    - name: Request XML data
      ansible.builtin.uri:
        url: https://api.example.com/users
        method: GET
        headers:
          Accept: application/xml
        return_content: true
      register: xml_response

    # Send JSON data with explicit Content-Type
    - name: Send JSON with explicit header
      ansible.builtin.uri:
        url: https://api.example.com/users
        method: POST
        headers:
          Content-Type: "application/json; charset=utf-8"
          Accept: application/json
        body: '{"name": "test user", "email": "test@example.com"}'
        status_code: 201

    # Send form data
    - name: Submit form with Content-Type
      ansible.builtin.uri:
        url: https://api.example.com/upload
        method: POST
        headers:
          Content-Type: application/x-www-form-urlencoded
        body: "field1=value1&field2=value2"
        status_code: 200
```

Note that when you use `body_format: json`, Ansible sets `Content-Type: application/json` automatically. You only need to set it manually when using raw body strings.

## API Versioning Headers

Many APIs use headers for version selection:

```yaml
# use headers for API versioning
---
- name: API version control via headers
  hosts: localhost
  connection: local
  vars:
    api_base: https://api.example.com
  tasks:
    # GitHub-style version header
    - name: Use GitHub API v3
      ansible.builtin.uri:
        url: "{{ api_base }}/repos"
        method: GET
        headers:
          Accept: "application/vnd.github.v3+json"
          Authorization: "token {{ github_token }}"
        return_content: true
      register: repos

    # Custom version header
    - name: Use custom API version
      ansible.builtin.uri:
        url: "{{ api_base }}/resources"
        method: GET
        headers:
          X-API-Version: "2024-01-15"
          Accept: application/json
        return_content: true
      register: resources

    # Stripe-style version header
    - name: Stripe API with version header
      ansible.builtin.uri:
        url: https://api.stripe.com/v1/charges
        method: GET
        headers:
          Authorization: "Bearer {{ stripe_api_key }}"
          Stripe-Version: "2024-06-20"
        return_content: true
      register: charges
```

## Cache Control Headers

Control caching behavior with standard HTTP cache headers:

```yaml
# set cache control headers
- name: Fetch fresh data (no cache)
  ansible.builtin.uri:
    url: https://api.example.com/inventory
    method: GET
    headers:
      Cache-Control: no-cache
      Pragma: no-cache
    return_content: true
  register: fresh_data

# Conditional request with ETag
- name: Fetch with conditional ETag header
  ansible.builtin.uri:
    url: https://api.example.com/config
    method: GET
    headers:
      If-None-Match: "{{ previous_etag | default('') }}"
    status_code: [200, 304]
    return_content: true
  register: config_response

- name: Use cached or fresh config
  ansible.builtin.set_fact:
    config: "{{ config_response.json if config_response.status == 200 else cached_config }}"
```

## Dynamic Header Generation

Build headers from variables, facts, and computed values:

```yaml
# generate headers dynamically from variables and facts
---
- name: Dynamic header construction
  hosts: all
  vars:
    common_headers:
      X-Client: ansible
      X-Environment: "{{ env | default('production') }}"
      Accept: application/json
  tasks:
    - name: Build request headers dynamically
      ansible.builtin.uri:
        url: https://api.example.com/register
        method: POST
        headers: "{{ common_headers | combine({
          'Authorization': 'Bearer ' + api_token,
          'X-Source-Host': inventory_hostname,
          'X-Trace-ID': ansible_date_time.epoch + '-' + (999999 | random | string)
        }) }}"
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
        status_code: [200, 201]
      delegate_to: localhost
```

## Request Tracing and Correlation Headers

For distributed systems, correlation headers help trace requests across services:

```yaml
# add tracing and correlation headers for observability
---
- name: Deployment with tracing headers
  hosts: localhost
  connection: local
  vars:
    deployment_id: "deploy-{{ ansible_date_time.epoch }}"
    trace_headers:
      X-Correlation-ID: "{{ deployment_id }}"
      X-Deployment-ID: "{{ deployment_id }}"
      X-Initiated-By: ansible
      X-Playbook: deploy.yaml
  tasks:
    - name: Start deployment in orchestrator
      ansible.builtin.uri:
        url: https://orchestrator.internal/deployments
        method: POST
        headers: "{{ trace_headers | combine({'Authorization': 'Bearer ' + api_token}) }}"
        body_format: json
        body:
          application: myapp
          version: "{{ app_version }}"
        status_code: 201
      register: deployment

    - name: Notify monitoring system
      ansible.builtin.uri:
        url: https://monitoring.internal/events
        method: POST
        headers: "{{ trace_headers | combine({'Authorization': 'Bearer ' + monitoring_token}) }}"
        body_format: json
        body:
          event: deployment_started
          deployment_id: "{{ deployment_id }}"
        status_code: 200

    - name: Update status in deployment dashboard
      ansible.builtin.uri:
        url: "https://dashboard.internal/api/deployments/{{ deployment_id }}"
        method: PATCH
        headers: "{{ trace_headers | combine({'Authorization': 'Bearer ' + dashboard_token}) }}"
        body_format: json
        body:
          status: in_progress
        status_code: 200
```

## Custom Headers for Rate Limiting

Some APIs use headers to communicate rate limit information:

```yaml
# check rate limit headers before making additional requests
---
- name: Rate-limit-aware API calls
  hosts: localhost
  connection: local
  tasks:
    - name: Make API request
      ansible.builtin.uri:
        url: https://api.example.com/data
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        return_content: true
      register: api_response

    - name: Check rate limit headers
      ansible.builtin.debug:
        msg:
          - "Requests remaining: {{ api_response.x_ratelimit_remaining | default('unknown') }}"
          - "Rate limit resets at: {{ api_response.x_ratelimit_reset | default('unknown') }}"

    - name: Pause if rate limit is low
      ansible.builtin.pause:
        seconds: 60
      when:
        - api_response.x_ratelimit_remaining is defined
        - api_response.x_ratelimit_remaining | int < 10
```

## Security Headers for Webhooks

When receiving webhooks, you often need to send verification headers:

```yaml
# send HMAC signature headers for webhook verification
---
- name: Webhook with signature verification
  hosts: localhost
  connection: local
  vars:
    webhook_payload:
      event: deployment.completed
      application: myapp
      version: "2.3.1"
      timestamp: "{{ ansible_date_time.iso8601 }}"
  tasks:
    - name: Compute HMAC signature for webhook
      ansible.builtin.shell:
        cmd: "echo -n '{{ webhook_payload | to_json }}' | openssl dgst -sha256 -hmac '{{ vault_webhook_secret }}' -hex | awk '{print $NF}'"
      register: hmac_sig
      no_log: true
      changed_when: false

    - name: Send signed webhook
      ansible.builtin.uri:
        url: https://hooks.example.com/deploy
        method: POST
        headers:
          Content-Type: application/json
          X-Webhook-Signature: "sha256={{ hmac_sig.stdout }}"
          X-Webhook-Timestamp: "{{ ansible_date_time.epoch }}"
        body_format: json
        body: "{{ webhook_payload }}"
        status_code: 200
      no_log: true
```

## Reading Response Headers

The registered variable from `uri` contains all response headers:

```yaml
# read and use response headers from API calls
- name: Inspect response headers
  ansible.builtin.uri:
    url: https://api.example.com/data
    method: GET
    headers:
      Authorization: "Bearer {{ api_token }}"
    return_content: true
  register: response

- name: Show useful response headers
  ansible.builtin.debug:
    msg:
      - "Content-Type: {{ response.content_type }}"
      - "Server: {{ response.server | default('not set') }}"
      - "ETag: {{ response.etag | default('not set') }}"
      - "Cache-Control: {{ response.cache_control | default('not set') }}"
      - "All headers: {{ response }}"
```

Response headers are available as attributes on the registered variable, with hyphens converted to underscores (e.g., `Content-Type` becomes `content_type`).

## Summary

Custom headers in the Ansible `uri` module give you full control over HTTP metadata. Use them for authentication (Authorization, X-API-Key), content negotiation (Accept, Content-Type), API versioning, request tracing, and security signatures. Build headers dynamically with the `combine` filter to merge common headers with request-specific ones. Always check response headers for rate limit information and caching directives. Store sensitive header values like tokens and API keys in Ansible Vault, and use `no_log: true` on tasks that handle them.
