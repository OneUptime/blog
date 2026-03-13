# How to Use the Ansible uri Module to Check API Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Health Checks, API Monitoring, uri Module

Description: Build reliable API health checks in Ansible using the uri module with retries, response validation, and alerting patterns.

---

Health checks are the backbone of reliable deployments. Before you deploy, you want to make sure dependent services are up. After you deploy, you want to confirm the new version is healthy. During maintenance, you want to monitor for regressions. The Ansible `uri` module turns these checks into simple, repeatable tasks that you can embed in any playbook.

This post covers health check patterns from basic connectivity tests to sophisticated multi-endpoint validation with alerting.

## Basic Health Check

The simplest health check verifies that an endpoint returns HTTP 200:

```yaml
# basic health check that verifies HTTP 200 response
---
- name: Basic health check
  hosts: localhost
  connection: local
  tasks:
    - name: Check API health
      ansible.builtin.uri:
        url: https://api.example.com/health
        method: GET
        status_code: 200
        timeout: 10
      register: health

    - name: Report health status
      ansible.builtin.debug:
        msg: "API is healthy (responded in {{ health.elapsed }}s)"
```

If the endpoint returns anything other than 200, the task fails and the playbook stops.

## Health Check with Retries

Services sometimes take a moment to come up after a restart. Use `retries` and `until` to wait:

```yaml
# health check with retry logic for services that need startup time
- name: Wait for API to become healthy
  ansible.builtin.uri:
    url: "http://{{ inventory_hostname }}:3000/health"
    method: GET
    status_code: 200
    timeout: 5
  register: health_result
  retries: 12
  delay: 10
  until: health_result.status == 200

- name: API is healthy
  ansible.builtin.debug:
    msg: "Service came up after {{ health_result.attempts }} attempts"
```

This checks every 10 seconds for up to 2 minutes. If the service does not respond with 200 in that time, the task fails.

## Validating Response Body Content

A 200 status code does not always mean the service is truly healthy. Validate the response body:

```yaml
# validate response body content for deeper health checks
---
- name: Deep health check
  hosts: localhost
  connection: local
  tasks:
    - name: Check API health with body validation
      ansible.builtin.uri:
        url: https://api.example.com/health
        method: GET
        return_content: true
        timeout: 10
      register: health
      failed_when: >
        health.status != 200 or
        health.json.status != 'healthy' or
        health.json.database != 'connected' or
        health.json.cache != 'connected'

    - name: Show health details
      ansible.builtin.debug:
        msg:
          - "Overall: {{ health.json.status }}"
          - "Database: {{ health.json.database }}"
          - "Cache: {{ health.json.cache }}"
          - "Version: {{ health.json.version | default('unknown') }}"
          - "Uptime: {{ health.json.uptime | default('unknown') }}"
```

## Multi-Service Health Dashboard

Check multiple services and collect the results:

```yaml
# check health of multiple services and build a status report
---
- name: Service health dashboard
  hosts: localhost
  connection: local
  vars:
    services:
      - name: API Gateway
        url: https://gateway.internal/health
        critical: true
      - name: Auth Service
        url: https://auth.internal/health
        critical: true
      - name: User Service
        url: https://users.internal/health
        critical: true
      - name: Notification Service
        url: https://notifications.internal/health
        critical: false
      - name: Analytics Service
        url: https://analytics.internal/health
        critical: false
  tasks:
    - name: Check all services
      ansible.builtin.uri:
        url: "{{ item.url }}"
        method: GET
        timeout: 10
        status_code: 200
        return_content: true
      register: health_results
      loop: "{{ services }}"
      ignore_errors: true

    - name: Build health report
      ansible.builtin.set_fact:
        health_report: >-
          {{ health_report | default([]) + [{
            'name': item.item.name,
            'status': 'healthy' if item.status | default(0) == 200 else 'unhealthy',
            'critical': item.item.critical,
            'response_time': item.elapsed | default('N/A'),
            'details': item.json | default({})
          }] }}
      loop: "{{ health_results.results }}"

    - name: Display health report
      ansible.builtin.debug:
        msg: "{{ item.name }}: {{ item.status }} ({{ item.response_time }}s) {{ '[CRITICAL]' if item.critical and item.status == 'unhealthy' else '' }}"
      loop: "{{ health_report }}"

    - name: Fail if any critical service is unhealthy
      ansible.builtin.fail:
        msg: "Critical services are unhealthy: {{ health_report | selectattr('critical') | selectattr('status', 'equalto', 'unhealthy') | map(attribute='name') | list | join(', ') }}"
      when: health_report | selectattr('critical') | selectattr('status', 'equalto', 'unhealthy') | list | length > 0
```

## Pre-Deployment Health Gate

Run health checks as a gate before deployment proceeds:

```yaml
# pre-deployment health gate that blocks deployment if services are down
---
- name: Pre-deployment health gate
  hosts: localhost
  connection: local
  tasks:
    - name: Verify all dependencies are healthy
      ansible.builtin.uri:
        url: "{{ item }}"
        method: GET
        timeout: 10
        status_code: 200
      loop:
        - https://database.internal:5432/health
        - https://redis.internal:6379/health
        - https://rabbitmq.internal:15672/api/health/checks/alarms
      register: dependency_checks

    - name: All dependencies healthy - proceeding with deployment
      ansible.builtin.debug:
        msg: "All {{ dependency_checks.results | length }} dependencies are healthy"

- name: Deploy application
  hosts: app_servers
  serial: "25%"
  tasks:
    - name: Deploy new version
      ansible.builtin.include_tasks: tasks/deploy.yaml

    - name: Post-deployment health check
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:3000/health"
        method: GET
        status_code: 200
        return_content: true
      register: post_deploy_health
      retries: 10
      delay: 5
      until: post_deploy_health.status == 200

    - name: Verify correct version is deployed
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:3000/version"
        method: GET
        return_content: true
      register: version_check
      failed_when: version_check.json.version != target_version
```

## Response Time Monitoring

Track response times to detect performance degradation:

```yaml
# monitor API response times and alert on slow responses
---
- name: Performance health check
  hosts: localhost
  connection: local
  vars:
    max_response_time: 2  # seconds
  tasks:
    - name: Check API response time
      ansible.builtin.uri:
        url: https://api.example.com/health
        method: GET
        timeout: 10
        return_content: true
      register: perf_check

    - name: Report response time
      ansible.builtin.debug:
        msg: "API response time: {{ perf_check.elapsed }}s"

    - name: Warn on slow response
      ansible.builtin.debug:
        msg: "WARNING: API response time {{ perf_check.elapsed }}s exceeds threshold of {{ max_response_time }}s"
      when: perf_check.elapsed | float > max_response_time | float

    - name: Run multiple checks for average
      ansible.builtin.uri:
        url: https://api.example.com/health
        method: GET
        timeout: 10
      register: multi_check
      loop: "{{ range(5) | list }}"

    - name: Calculate average response time
      ansible.builtin.set_fact:
        avg_response_time: "{{ (multi_check.results | map(attribute='elapsed') | map('float') | sum) / multi_check.results | length }}"

    - name: Report average response time
      ansible.builtin.debug:
        msg: "Average response time over 5 checks: {{ avg_response_time | round(3) }}s"
```

## Health Check with Alerting

Send alerts when health checks fail:

```yaml
# health check with alerting on failure
---
- name: Health check with alerting
  hosts: localhost
  connection: local
  tasks:
    - name: Run health checks
      ansible.builtin.uri:
        url: "{{ item.url }}"
        method: GET
        timeout: 10
        status_code: 200
      register: checks
      loop:
        - name: API
          url: https://api.example.com/health
        - name: Web
          url: https://www.example.com/health
      ignore_errors: true

    - name: Identify failures
      ansible.builtin.set_fact:
        failed_services: "{{ checks.results | selectattr('failed', 'defined') | selectattr('failed') | map(attribute='item') | map(attribute='name') | list }}"

    - name: Send Slack alert on failure
      ansible.builtin.uri:
        url: "{{ vault_slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: "Health Check FAILED for: {{ failed_services | join(', ') }}"
          channel: "#alerts"
        status_code: 200
      when: failed_services | length > 0

    - name: Send PagerDuty alert on failure
      ansible.builtin.uri:
        url: https://events.pagerduty.com/v2/enqueue
        method: POST
        body_format: json
        body:
          routing_key: "{{ vault_pagerduty_key }}"
          event_action: trigger
          payload:
            summary: "Health check failed: {{ failed_services | join(', ') }}"
            source: ansible-health-check
            severity: critical
        status_code: 202
      when: failed_services | length > 0
```

## Endpoint-Specific Health Checks

Different services expose health data differently. Here are patterns for common cases:

```yaml
# health check patterns for different service types
---
- name: Service-specific health checks
  hosts: localhost
  connection: local
  tasks:
    # Standard /health endpoint
    - name: Check application health
      ansible.builtin.uri:
        url: https://api.example.com/health
        method: GET
        return_content: true
      register: app_health
      failed_when: app_health.json.status != 'ok'

    # Kubernetes-style readiness probe
    - name: Check readiness endpoint
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:3000/ready"
        method: GET
        status_code: 200
      register: ready_check

    # Elasticsearch cluster health
    - name: Check Elasticsearch health
      ansible.builtin.uri:
        url: "http://{{ es_host }}:9200/_cluster/health"
        method: GET
        return_content: true
      register: es_health
      failed_when: es_health.json.status == 'red'

    - name: Show Elasticsearch status
      ansible.builtin.debug:
        msg: "Elasticsearch: {{ es_health.json.status }} ({{ es_health.json.number_of_nodes }} nodes)"

    # RabbitMQ health via management API
    - name: Check RabbitMQ health
      ansible.builtin.uri:
        url: "http://{{ rabbitmq_host }}:15672/api/health/checks/alarms"
        method: GET
        url_username: guest
        url_password: guest
        force_basic_auth: true
        return_content: true
      register: rmq_health
      failed_when: rmq_health.json.status != 'ok'
```

## Summary

API health checks with the Ansible `uri` module are straightforward to implement and incredibly valuable for reliable automation. Start with basic status code checks, then add response body validation for deeper verification. Use `retries` and `until` for post-deployment health waits. Build multi-service dashboards by looping over endpoints. Integrate alerting via Slack or PagerDuty webhooks for failed checks. Make health checks a gate before and after every deployment by embedding them in your playbooks with `failed_when` conditions that verify not just connectivity but actual service health.
