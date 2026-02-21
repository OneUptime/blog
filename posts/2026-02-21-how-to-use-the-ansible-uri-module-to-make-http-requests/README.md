# How to Use the Ansible uri Module to Make HTTP Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HTTP, uri Module, API

Description: Learn how to make HTTP requests from Ansible playbooks using the uri module for API calls, health checks, and webhooks.

---

The Ansible `uri` module lets you make HTTP and HTTPS requests directly from your playbooks. This opens up a huge range of possibilities: checking if a service is healthy, calling REST APIs, sending webhook notifications, downloading files, and interacting with any HTTP-based service.

This post covers the fundamentals of the `uri` module with practical examples that you will actually use in real playbooks.

## Basic GET Request

The simplest use case is making a GET request and checking the response:

```yaml
# make a basic GET request and check the status code
---
- name: Basic HTTP requests
  hosts: localhost
  connection: local
  tasks:
    - name: Check if website is up
      ansible.builtin.uri:
        url: https://example.com
        method: GET
        status_code: 200
      register: response

    - name: Show response details
      ansible.builtin.debug:
        msg:
          - "Status: {{ response.status }}"
          - "Content-Type: {{ response.content_type }}"
          - "Response time: {{ response.elapsed }}s"
```

If the response code does not match `status_code`, the task fails. This makes the `uri` module perfect for health checks.

## POST Request with Data

Sending data to an API with a POST request:

```yaml
# send a POST request with form data
- name: Submit form data
  ansible.builtin.uri:
    url: https://api.example.com/users
    method: POST
    body_format: form-urlencoded
    body:
      username: johndoe
      email: john@example.com
      role: developer
    status_code: 201
  register: create_response

- name: Show created user
  ansible.builtin.debug:
    var: create_response.json
```

## POST Request with JSON Body

Most modern APIs expect JSON. Use `body_format: json`:

```yaml
# send a POST request with JSON body
- name: Create a resource via API
  ansible.builtin.uri:
    url: https://api.example.com/deployments
    method: POST
    body_format: json
    body:
      application: myapp
      version: "2.3.1"
      environment: production
      deployed_by: ansible
      timestamp: "{{ ansible_date_time.iso8601 }}"
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: [200, 201]
  register: deploy_response
```

## PUT and PATCH Requests

For updating existing resources:

```yaml
# update a resource with PUT and PATCH
---
- name: API update examples
  hosts: localhost
  connection: local
  tasks:
    # PUT replaces the entire resource
    - name: Update server configuration
      ansible.builtin.uri:
        url: "https://api.example.com/servers/{{ server_id }}"
        method: PUT
        body_format: json
        body:
          name: web-prod-01
          region: us-east-1
          instance_type: t3.large
          status: active
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 200

    # PATCH updates specific fields only
    - name: Update server status
      ansible.builtin.uri:
        url: "https://api.example.com/servers/{{ server_id }}"
        method: PATCH
        body_format: json
        body:
          status: maintenance
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 200
```

## DELETE Requests

Removing resources:

```yaml
# delete a resource via API
- name: Remove old deployment
  ansible.builtin.uri:
    url: "https://api.example.com/deployments/{{ old_deployment_id }}"
    method: DELETE
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: [200, 204]
```

## Handling Response Data

The `uri` module returns the response in the registered variable. For JSON responses, Ansible automatically parses them:

```yaml
# work with JSON response data
---
- name: Query and use API data
  hosts: localhost
  connection: local
  tasks:
    - name: Get list of servers from API
      ansible.builtin.uri:
        url: https://api.example.com/servers
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        return_content: true
      register: servers_response

    - name: Show server names
      ansible.builtin.debug:
        msg: "Server: {{ item.name }} ({{ item.status }})"
      loop: "{{ servers_response.json.data }}"

    - name: Count active servers
      ansible.builtin.debug:
        msg: "Active servers: {{ servers_response.json.data | selectattr('status', 'equalto', 'active') | list | length }}"
```

The `return_content: true` parameter is important when you need to work with the response body. Without it, Ansible only returns metadata like status code and headers.

## Timeouts and Retries

Network requests can fail. Configure timeouts and retries:

```yaml
# configure timeouts and retries for unreliable endpoints
- name: Call external API with retry logic
  ansible.builtin.uri:
    url: https://api.external-service.com/data
    method: GET
    timeout: 30
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: 200
  register: api_response
  retries: 3
  delay: 10
  until: api_response.status == 200
```

## Sending Webhook Notifications

A practical use case is sending deployment notifications:

```yaml
# send Slack notification via webhook
---
- name: Deployment notification
  hosts: localhost
  connection: local
  vars:
    app_version: "2.3.1"
    environment: production
  tasks:
    - name: Notify Slack about deployment
      ansible.builtin.uri:
        url: "{{ slack_webhook_url }}"
        method: POST
        body_format: json
        body:
          text: "Deployment complete"
          blocks:
            - type: section
              text:
                type: mrkdwn
                text: "*Deployment Notification*\nApp: myapp\nVersion: {{ app_version }}\nEnvironment: {{ environment }}\nStatus: success"
        status_code: 200

    - name: Notify PagerDuty about maintenance window
      ansible.builtin.uri:
        url: https://events.pagerduty.com/v2/enqueue
        method: POST
        body_format: json
        body:
          routing_key: "{{ pagerduty_routing_key }}"
          event_action: resolve
          payload:
            summary: "Maintenance complete on {{ environment }}"
            source: ansible
            severity: info
        status_code: 202
```

## Checking Multiple Endpoints

Loop over a list of URLs to check multiple services:

```yaml
# check health of multiple services in a loop
---
- name: Service health dashboard
  hosts: localhost
  connection: local
  vars:
    endpoints:
      - name: API Gateway
        url: https://api.example.com/health
      - name: Auth Service
        url: https://auth.example.com/health
      - name: User Service
        url: https://users.example.com/health
      - name: Payment Service
        url: https://payments.example.com/health
  tasks:
    - name: Check all service endpoints
      ansible.builtin.uri:
        url: "{{ item.url }}"
        method: GET
        timeout: 10
        status_code: 200
      register: health_checks
      loop: "{{ endpoints }}"
      ignore_errors: true

    - name: Report health status
      ansible.builtin.debug:
        msg: "{{ item.item.name }}: {{ 'HEALTHY' if item.status | default(0) == 200 else 'UNHEALTHY' }}"
      loop: "{{ health_checks.results }}"
```

## Working with Query Parameters

Pass query parameters in the URL or use the `url` with variables:

```yaml
# pass query parameters to API requests
- name: Search API with query parameters
  ansible.builtin.uri:
    url: "https://api.example.com/search?q={{ search_term | urlencode }}&limit=100&offset={{ offset }}&sort=created_at&order=desc"
    method: GET
    headers:
      Authorization: "Bearer {{ api_token }}"
    return_content: true
  register: search_results
  vars:
    search_term: "error 500"
    offset: 0
```

## Practical Example: Deployment Pipeline with API Integration

Here is a real-world playbook that integrates with multiple APIs during deployment:

```yaml
# deployment pipeline with API integration
---
- name: Deploy with API integration
  hosts: app_servers
  serial: "25%"
  vars:
    lb_api: https://lb.internal/api/v1
    monitor_api: https://monitoring.internal/api/v1
    app_version: "{{ lookup('env', 'APP_VERSION') }}"
  tasks:
    - name: Create deployment record
      ansible.builtin.uri:
        url: "{{ monitor_api }}/deployments"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
          version: "{{ app_version }}"
          status: started
        status_code: 201
      delegate_to: localhost
      register: deployment

    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "{{ lb_api }}/pools/web/members/{{ inventory_hostname }}"
        method: DELETE
        status_code: [200, 204]
      delegate_to: localhost

    - name: Wait for connections to drain
      ansible.builtin.pause:
        seconds: 15

    - name: Deploy new version
      ansible.builtin.unarchive:
        src: "/releases/myapp-{{ app_version }}.tar.gz"
        dest: /opt/myapp/
        remote_src: true

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: restarted

    - name: Verify local health
      ansible.builtin.uri:
        url: "http://localhost:3000/health"
        status_code: 200
      retries: 10
      delay: 5

    - name: Add back to load balancer
      ansible.builtin.uri:
        url: "{{ lb_api }}/pools/web/members"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
          port: 3000
        status_code: [200, 201]
      delegate_to: localhost

    - name: Update deployment record
      ansible.builtin.uri:
        url: "{{ monitor_api }}/deployments/{{ deployment.json.id }}"
        method: PATCH
        body_format: json
        body:
          status: completed
        status_code: 200
      delegate_to: localhost
```

## Summary

The `uri` module is one of the most versatile modules in Ansible. It supports all HTTP methods (GET, POST, PUT, PATCH, DELETE), handles JSON and form-encoded bodies, returns parsed JSON responses, and integrates naturally with Ansible's `register`, `when`, and `loop` features. Use it for health checks, API integrations, webhook notifications, and any workflow that involves HTTP communication. Combine it with `retries` and `until` for resilient API calls, and always specify `status_code` to catch unexpected responses early.
