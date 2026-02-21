# How to Use the Ansible uri Module with POST Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HTTP POST, uri Module, REST API

Description: Learn how to send POST requests from Ansible playbooks for creating resources, submitting data, and triggering webhooks.

---

POST requests are how you create new resources, submit data, and trigger actions through APIs. In Ansible, the `uri` module handles POST requests with support for JSON bodies, form data, file uploads, and custom headers. If you are integrating your Ansible playbooks with REST APIs, CI/CD systems, or notification services, POST requests will be a central part of your workflow.

This post covers everything about POST requests in Ansible, from simple form submissions to complex API integrations.

## Basic POST Request

The simplest POST request sends a body to a URL:

```yaml
# send a basic POST request with a JSON body
---
- name: Create a new resource
  hosts: localhost
  connection: local
  tasks:
    - name: Create a new user via API
      ansible.builtin.uri:
        url: https://api.example.com/users
        method: POST
        body_format: json
        body:
          name: "Jane Smith"
          email: "jane@example.com"
          role: "developer"
        status_code: 201
      register: new_user

    - name: Show created user
      ansible.builtin.debug:
        msg: "Created user {{ new_user.json.name }} with ID {{ new_user.json.id }}"
```

The `body_format: json` parameter tells Ansible to serialize the `body` dictionary as JSON and set the `Content-Type` header to `application/json` automatically.

## Form-Encoded POST Requests

Some APIs and web forms expect form-encoded data instead of JSON:

```yaml
# send form-encoded POST data
- name: Submit form data
  ansible.builtin.uri:
    url: https://api.example.com/login
    method: POST
    body_format: form-urlencoded
    body:
      username: admin
      password: "{{ vault_admin_password }}"
      grant_type: password
    status_code: 200
  register: login_response
  no_log: true

- name: Save auth token
  ansible.builtin.set_fact:
    auth_token: "{{ login_response.json.access_token }}"
  no_log: true
```

With `body_format: form-urlencoded`, the body is encoded as `key=value&key=value` pairs, which is what traditional HTML forms send.

## Sending Raw String Bodies

For APIs that expect raw text or XML:

```yaml
# send raw string body in a POST request
- name: Send XML to SOAP API
  ansible.builtin.uri:
    url: https://api.example.com/soap
    method: POST
    body: |
      <?xml version="1.0" encoding="UTF-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
        <soapenv:Body>
          <GetServerStatus xmlns="http://example.com/api">
            <ServerName>web-prod-01</ServerName>
          </GetServerStatus>
        </soapenv:Body>
      </soapenv:Envelope>
    headers:
      Content-Type: "text/xml; charset=utf-8"
      SOAPAction: "http://example.com/api/GetServerStatus"
    status_code: 200
    return_content: true
  register: soap_response
```

When you provide a string body without `body_format`, Ansible sends it as-is. Make sure to set the `Content-Type` header yourself.

## POST with Ansible Variables in the Body

Building request bodies dynamically from Ansible variables and facts:

```yaml
# build POST body dynamically from Ansible variables and facts
---
- name: Register host with inventory service
  hosts: all
  tasks:
    - name: Register this host
      ansible.builtin.uri:
        url: https://inventory.internal/api/hosts
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          kernel: "{{ ansible_kernel }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpu_cores: "{{ ansible_processor_vcpus }}"
          groups: "{{ group_names }}"
          last_seen: "{{ ansible_date_time.iso8601 }}"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: [200, 201]
      delegate_to: localhost
```

## Handling POST Response Data

POST responses often contain the created resource, which you need for subsequent API calls:

```yaml
# capture and use POST response data for follow-up requests
---
- name: Create project with tasks
  hosts: localhost
  connection: local
  vars:
    api_base: https://api.example.com/v2
  tasks:
    - name: Create a new project
      ansible.builtin.uri:
        url: "{{ api_base }}/projects"
        method: POST
        body_format: json
        body:
          name: "Infrastructure Migration"
          description: "Migrate from on-prem to cloud"
          team: "platform-engineering"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
        return_content: true
      register: project

    - name: Add tasks to the project
      ansible.builtin.uri:
        url: "{{ api_base }}/projects/{{ project.json.id }}/tasks"
        method: POST
        body_format: json
        body:
          title: "{{ item.title }}"
          assignee: "{{ item.assignee }}"
          priority: "{{ item.priority }}"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
      loop:
        - title: "Set up VPC"
          assignee: "alice"
          priority: "high"
        - title: "Migrate databases"
          assignee: "bob"
          priority: "high"
        - title: "Update DNS records"
          assignee: "carol"
          priority: "medium"
```

## Idempotent POST Requests

POST requests are not naturally idempotent (running them twice creates two resources). Here is how to make them idempotent in Ansible:

```yaml
# make POST requests idempotent by checking first
---
- name: Idempotent resource creation
  hosts: localhost
  connection: local
  vars:
    resource_name: "prod-web-pool"
  tasks:
    - name: Check if resource already exists
      ansible.builtin.uri:
        url: "https://api.example.com/pools?name={{ resource_name }}"
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        return_content: true
      register: existing_check

    - name: Create resource only if it does not exist
      ansible.builtin.uri:
        url: https://api.example.com/pools
        method: POST
        body_format: json
        body:
          name: "{{ resource_name }}"
          algorithm: round-robin
          health_check: "/health"
          members: []
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
      when: existing_check.json.data | length == 0
      register: create_result

    - name: Set pool ID regardless of creation
      ansible.builtin.set_fact:
        pool_id: "{{ create_result.json.id if create_result is changed else existing_check.json.data[0].id }}"
```

## Webhook Notifications with POST

Sending notifications to Slack, Microsoft Teams, or custom webhooks:

```yaml
# send notification webhooks via POST
---
- name: Deployment notifications
  hosts: localhost
  connection: local
  vars:
    deployment_status: success
    app_version: "2.3.1"
    environment: production
  tasks:
    # Slack webhook
    - name: Notify Slack
      ansible.builtin.uri:
        url: "{{ vault_slack_webhook }}"
        method: POST
        body_format: json
        body:
          channel: "#deployments"
          username: "Ansible Deploy Bot"
          icon_emoji: ":rocket:"
          attachments:
            - color: "{{ '#36a64f' if deployment_status == 'success' else '#ff0000' }}"
              title: "Deployment {{ deployment_status | upper }}"
              fields:
                - title: "Application"
                  value: "myapp"
                  short: true
                - title: "Version"
                  value: "{{ app_version }}"
                  short: true
                - title: "Environment"
                  value: "{{ environment }}"
                  short: true
        status_code: 200

    # Microsoft Teams webhook
    - name: Notify Microsoft Teams
      ansible.builtin.uri:
        url: "{{ vault_teams_webhook }}"
        method: POST
        body_format: json
        body:
          "@type": "MessageCard"
          summary: "Deployment {{ deployment_status }}"
          themeColor: "{{ '00FF00' if deployment_status == 'success' else 'FF0000' }}"
          sections:
            - activityTitle: "Deployment {{ deployment_status | upper }}"
              facts:
                - name: "Application"
                  value: "myapp"
                - name: "Version"
                  value: "{{ app_version }}"
                - name: "Environment"
                  value: "{{ environment }}"
        status_code: 200
```

## Error Handling for POST Requests

POST requests can fail for many reasons. Handle errors properly:

```yaml
# error handling for POST requests
---
- name: POST with error handling
  hosts: localhost
  connection: local
  tasks:
    - name: Attempt to create resource
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: POST
        body_format: json
        body:
          name: "new-resource"
          type: "compute"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: [200, 201, 409]  # 409 = conflict (already exists)
        return_content: true
      register: create_result

    - name: Handle successful creation
      ansible.builtin.debug:
        msg: "Created resource: {{ create_result.json.id }}"
      when: create_result.status in [200, 201]

    - name: Handle conflict (resource exists)
      ansible.builtin.debug:
        msg: "Resource already exists, using existing"
      when: create_result.status == 409

    - name: Retry on temporary failures
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: POST
        body_format: json
        body:
          name: "retry-resource"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
      register: retry_result
      retries: 3
      delay: 5
      until: retry_result.status == 201
```

## Triggering CI/CD Pipelines

POST requests are commonly used to trigger builds and pipelines:

```yaml
# trigger CI/CD pipelines via POST
---
- name: Trigger downstream pipelines
  hosts: localhost
  connection: local
  tasks:
    # Trigger GitLab CI pipeline
    - name: Trigger GitLab pipeline
      ansible.builtin.uri:
        url: "https://gitlab.example.com/api/v4/projects/{{ project_id }}/trigger/pipeline"
        method: POST
        body_format: form-urlencoded
        body:
          token: "{{ gitlab_trigger_token }}"
          ref: main
          "variables[DEPLOY_ENV]": production
          "variables[APP_VERSION]": "{{ app_version }}"
        status_code: 201
      register: pipeline

    - name: Show pipeline URL
      ansible.builtin.debug:
        msg: "Pipeline started: {{ pipeline.json.web_url }}"

    # Trigger Jenkins job
    - name: Trigger Jenkins build
      ansible.builtin.uri:
        url: "https://jenkins.example.com/job/deploy-{{ environment }}/buildWithParameters"
        method: POST
        url_username: "{{ jenkins_user }}"
        url_password: "{{ jenkins_token }}"
        force_basic_auth: true
        body_format: form-urlencoded
        body:
          VERSION: "{{ app_version }}"
          ENVIRONMENT: "{{ environment }}"
        status_code: 201
```

## Summary

POST requests in Ansible's `uri` module are your tool for creating resources, submitting data, and triggering actions. Use `body_format: json` for modern REST APIs, `form-urlencoded` for legacy web forms, and raw strings for XML/SOAP services. Always check the expected `status_code` (201 for resource creation, 200 for actions). Make POST operations idempotent by checking if a resource exists before creating it. Use `register` to capture response data for follow-up API calls, and add `no_log: true` whenever the request body contains credentials. For notifications, POST requests to Slack and Teams webhooks integrate your deployments with your team's communication channels.
