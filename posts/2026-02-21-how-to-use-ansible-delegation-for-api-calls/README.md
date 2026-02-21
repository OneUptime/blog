# How to Use Ansible Delegation for API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, API, Delegation, REST

Description: Learn how to use Ansible delegation to make REST API calls from the controller or a designated API host during playbook execution.

---

API calls are everywhere in modern infrastructure automation. You need to register hosts with monitoring systems, update CMDBs, trigger CI/CD pipelines, manage cloud resources, and send notifications. These API calls should almost always be delegated to localhost (the Ansible controller) or a dedicated API gateway host, because the target servers usually should not have API credentials or outbound network access to management APIs.

## Basic API Delegation Pattern

The standard pattern delegates API calls to localhost while iterating over remote hosts:

```yaml
# basic-api-delegation.yml - API calls from the controller
---
- name: Deploy and register with external services
  hosts: appservers
  serial: 5
  vars:
    monitoring_api: "http://monitoring.internal:9090/api/v2"
    cmdb_api: "http://cmdb.internal:8080/api/v1"
  tasks:
    - name: Deploy application
      ansible.builtin.copy:
        src: /releases/latest/
        dest: /opt/myapp/
      become: true

    - name: Register host with monitoring API
      ansible.builtin.uri:
        url: "{{ monitoring_api }}/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_host }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          environment: "{{ env }}"
          tags:
            - webserver
            - "{{ env }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]  # 409 = already exists, that is fine
        timeout: 15
      delegate_to: localhost

    - name: Update CMDB with deployment info
      ansible.builtin.uri:
        url: "{{ cmdb_api }}/assets/{{ inventory_hostname }}"
        method: PUT
        body_format: json
        body:
          app_version: "{{ app_version }}"
          last_deployed: "{{ now(utc=true).isoformat() }}"
          deployed_by: "{{ lookup('env', 'USER') }}"
        headers:
          X-API-Key: "{{ cmdb_api_key }}"
        status_code: [200, 204]
        timeout: 15
      delegate_to: localhost
```

## Handling API Authentication

Different APIs use different authentication methods. Here are patterns for the most common ones:

```yaml
# api-auth-patterns.yml - Different API authentication approaches
---
- name: API authentication patterns
  hosts: appservers
  tasks:
    # Bearer token authentication
    - name: Call API with bearer token
      ansible.builtin.uri:
        url: "https://api.example.com/v1/servers/{{ inventory_hostname }}"
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        timeout: 10
      delegate_to: localhost
      register: api_result

    # Basic authentication
    - name: Call API with basic auth
      ansible.builtin.uri:
        url: "https://api.example.com/v1/servers/{{ inventory_hostname }}"
        method: GET
        url_username: "{{ api_username }}"
        url_password: "{{ api_password }}"
        force_basic_auth: true
        timeout: 10
      delegate_to: localhost
      register: basic_auth_result

    # API key in header
    - name: Call API with API key header
      ansible.builtin.uri:
        url: "https://api.example.com/v1/servers"
        method: POST
        headers:
          X-API-Key: "{{ api_key }}"
          Content-Type: "application/json"
        body_format: json
        body:
          name: "{{ inventory_hostname }}"
        timeout: 10
      delegate_to: localhost

    # OAuth2 - get token first, then use it
    - name: Get OAuth2 access token
      ansible.builtin.uri:
        url: "https://auth.example.com/oauth/token"
        method: POST
        body_format: form-urlencoded
        body:
          grant_type: client_credentials
          client_id: "{{ oauth_client_id }}"
          client_secret: "{{ oauth_client_secret }}"
        timeout: 10
      register: oauth_token
      delegate_to: localhost
      run_once: true

    - name: Call API with OAuth2 token
      ansible.builtin.uri:
        url: "https://api.example.com/v1/deploy"
        method: POST
        headers:
          Authorization: "Bearer {{ oauth_token.json.access_token }}"
        body_format: json
        body:
          server: "{{ inventory_hostname }}"
          version: "{{ app_version }}"
        timeout: 10
      delegate_to: localhost
```

## Error Handling for API Calls

API calls can fail for many reasons: network issues, rate limiting, server errors, authentication problems. Handle each appropriately:

```yaml
# api-error-handling.yml - Robust API error handling
---
- name: API calls with proper error handling
  hosts: appservers
  tasks:
    - name: Call critical API with retry logic
      ansible.builtin.uri:
        url: "https://api.example.com/v1/deploy/register"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          version: "{{ app_version }}"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: [200, 201]
        timeout: 15
      delegate_to: localhost
      register: api_result
      retries: 3
      delay: 10
      until: api_result.status in [200, 201]

    - name: Call non-critical API (failures are acceptable)
      ansible.builtin.uri:
        url: "https://analytics.example.com/v1/events"
        method: POST
        body_format: json
        body:
          event_type: deployment
          hostname: "{{ inventory_hostname }}"
          timestamp: "{{ now(utc=true).isoformat() }}"
        headers:
          Authorization: "Bearer {{ analytics_token }}"
        timeout: 5
      delegate_to: localhost
      ignore_errors: true    # Analytics failure should not block deployment
      register: analytics_result

    - name: Log analytics failure if it happened
      ansible.builtin.debug:
        msg: "Analytics API call failed: {{ analytics_result.msg | default('unknown error') }}"
      when: analytics_result is failed

    - name: Handle rate limiting (HTTP 429)
      ansible.builtin.uri:
        url: "https://api.example.com/v1/inventory/{{ inventory_hostname }}"
        method: PUT
        body_format: json
        body:
          status: active
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: [200, 429]
        timeout: 10
      delegate_to: localhost
      register: rate_limited_result
      retries: 5
      delay: "{{ rate_limited_result.json.retry_after | default(30) }}"
      until: rate_limited_result.status == 200
```

## Paginated API Requests

When you need to fetch data from paginated APIs:

```yaml
# paginated-api.yml - Handling paginated API responses
---
- name: Fetch all servers from API with pagination
  hosts: localhost
  gather_facts: false
  vars:
    api_base: "https://api.example.com/v1"
    page_size: 100
  tasks:
    - name: Get first page to determine total count
      ansible.builtin.uri:
        url: "{{ api_base }}/servers?page=1&per_page={{ page_size }}"
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
      register: first_page

    - name: Calculate total pages
      ansible.builtin.set_fact:
        total_pages: "{{ (first_page.json.total / page_size) | round(0, 'ceil') | int }}"

    - name: Fetch all remaining pages
      ansible.builtin.uri:
        url: "{{ api_base }}/servers?page={{ item }}&per_page={{ page_size }}"
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
      register: all_pages
      loop: "{{ range(2, (total_pages | int) + 1) | list }}"
      when: total_pages | int > 1

    - name: Combine all server data
      ansible.builtin.set_fact:
        all_servers: >-
          {{ first_page.json.data +
             (all_pages.results | default([]) | map(attribute='json') | map(attribute='data') | flatten) }}
```

## Webhook Notifications with Delegation

Sending webhooks during deployments is a very common delegation pattern:

```yaml
# webhook-notifications.yml - Deployment notifications via webhooks
---
- name: Deploy with webhook notifications
  hosts: appservers
  serial: "25%"
  tasks:
    - name: Notify deployment start
      ansible.builtin.uri:
        url: "{{ slack_webhook_url }}"
        method: POST
        body_format: json
        body:
          blocks:
            - type: section
              text:
                type: mrkdwn
                text: >
                  *Deployment Started*
                  Version: `{{ app_version }}`
                  Target: {{ play_hosts | length }} hosts
                  Batch: {{ ansible_play_batch | join(', ') }}
      delegate_to: localhost
      run_once: true
      throttle: 1

    - name: Deploy application
      ansible.builtin.copy:
        src: /releases/{{ app_version }}/
        dest: /opt/myapp/
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Notify deployment complete for this batch
      ansible.builtin.uri:
        url: "{{ slack_webhook_url }}"
        method: POST
        body_format: json
        body:
          text: "Batch deployed: {{ ansible_play_batch | join(', ') }}"
      delegate_to: localhost
      run_once: true
      throttle: 1
```

## Using an API Gateway Host

Sometimes the controller does not have network access to internal APIs. In that case, delegate to a bastion or API gateway host:

```yaml
# api-gateway-delegation.yml - Using an API gateway host
---
- name: Operations through API gateway
  hosts: appservers
  vars:
    api_gateway: bastion.internal.example.com
  tasks:
    - name: Register with internal service registry
      ansible.builtin.uri:
        url: "http://service-registry.internal:8500/v1/register"
        method: POST
        body_format: json
        body:
          service: myapp
          hostname: "{{ inventory_hostname }}"
          port: 8080
      delegate_to: "{{ api_gateway }}"
      # Runs on the bastion, which has access to internal APIs
      # The controller might not have this network access

    - name: Update internal CMDB
      ansible.builtin.uri:
        url: "http://cmdb.internal:3000/api/assets"
        method: PUT
        body_format: json
        body:
          name: "{{ inventory_hostname }}"
          role: webserver
      delegate_to: "{{ api_gateway }}"
```

## Summary

API call delegation in Ansible follows a consistent pattern: delegate to localhost (or an API gateway) to keep API credentials and network access centralized. Use `throttle` to prevent overwhelming APIs, `retries`/`delay`/`until` for transient failures, `ignore_errors` for non-critical calls, and structured error handling for critical API interactions. Always store API credentials in Ansible Vault and use `no_log` where appropriate. The delegation model ensures your target servers never need direct API access, which simplifies your security posture.
