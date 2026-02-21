# How to Use the Ansible uri Module with GET Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HTTP GET, uri Module, REST API

Description: A detailed guide to making HTTP GET requests with the Ansible uri module for API queries, health checks, and data retrieval.

---

GET requests are the most common HTTP method you will use with the Ansible `uri` module. They are used for health checks, fetching configuration data from APIs, querying service status, and pulling information that your playbook needs to make decisions. Unlike POST or PUT, GET requests are read-only and safe to repeat without side effects.

This post goes deep on GET requests specifically, covering query parameters, response handling, pagination, conditional logic based on responses, and real-world patterns you will encounter in production.

## Simple GET Request

The most basic GET request checks if a URL is reachable and returns a 200 status:

```yaml
# make a simple GET request and verify the status code
---
- name: Basic GET examples
  hosts: localhost
  connection: local
  tasks:
    - name: Check if API is reachable
      ansible.builtin.uri:
        url: https://api.example.com/status
        method: GET
      register: api_status

    - name: Show response status
      ansible.builtin.debug:
        msg: "API returned status {{ api_status.status }}"
```

The `method: GET` is actually the default, so you can omit it. But being explicit makes your playbooks more readable.

## Capturing Response Content

To work with the response body, set `return_content: true`:

```yaml
# capture and parse the response body from a GET request
- name: Fetch server configuration from API
  ansible.builtin.uri:
    url: https://api.example.com/config/app
    method: GET
    return_content: true
    headers:
      Accept: application/json
      Authorization: "Bearer {{ api_token }}"
  register: config_response

- name: Show the full response
  ansible.builtin.debug:
    msg:
      - "Status: {{ config_response.status }}"
      - "Content-Type: {{ config_response.content_type }}"
      - "Body: {{ config_response.json }}"

- name: Use specific fields from the response
  ansible.builtin.debug:
    msg: "Database host: {{ config_response.json.database.host }}"
```

When the response has `Content-Type: application/json`, Ansible automatically parses it into a dictionary available via `.json`. For other content types, use `.content` to get the raw response body.

## GET Requests with Query Parameters

Query parameters are part of the URL. Build them using string formatting or the `urlencode` filter:

```yaml
# pass query parameters in GET requests
---
- name: API queries with parameters
  hosts: localhost
  connection: local
  vars:
    api_base: https://api.example.com/v2
  tasks:
    # Simple query parameters in the URL
    - name: Search for active servers
      ansible.builtin.uri:
        url: "{{ api_base }}/servers?status=active&region=us-east-1"
        method: GET
        return_content: true
        headers:
          Authorization: "Bearer {{ api_token }}"
      register: active_servers

    # Dynamic parameters with url encoding
    - name: Search with dynamic filters
      ansible.builtin.uri:
        url: "{{ api_base }}/logs?query={{ search_query | urlencode }}&from={{ start_date }}&to={{ end_date }}&limit=100"
        method: GET
        return_content: true
        headers:
          Authorization: "Bearer {{ api_token }}"
      register: log_results
      vars:
        search_query: "level:error AND service:payment"
        start_date: "2026-02-20T00:00:00Z"
        end_date: "2026-02-21T00:00:00Z"

    - name: Show log count
      ansible.builtin.debug:
        msg: "Found {{ log_results.json.total }} matching log entries"
```

## Handling Different Response Codes

The `status_code` parameter controls which HTTP status codes are considered successful. By default, only 200 is accepted:

```yaml
# handle multiple acceptable status codes
---
- name: Handle various response codes
  hosts: localhost
  connection: local
  tasks:
    # Accept multiple success codes
    - name: Check resource (might not exist yet)
      ansible.builtin.uri:
        url: "https://api.example.com/resources/{{ resource_id }}"
        method: GET
        status_code: [200, 404]
        return_content: true
      register: resource_check

    - name: Create resource if it does not exist
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: POST
        body_format: json
        body:
          id: "{{ resource_id }}"
          name: "New Resource"
        status_code: 201
      when: resource_check.status == 404

    - name: Use existing resource
      ansible.builtin.debug:
        msg: "Resource already exists: {{ resource_check.json.name }}"
      when: resource_check.status == 200
```

## Following Redirects

By default, the `uri` module follows redirects. You can control this behavior:

```yaml
# control redirect following behavior
- name: Check URL without following redirects
  ansible.builtin.uri:
    url: http://example.com/old-path
    method: GET
    follow_redirects: none
    status_code: [200, 301, 302]
  register: redirect_check

- name: Show redirect destination
  ansible.builtin.debug:
    msg: "Redirects to: {{ redirect_check.location }}"
  when: redirect_check.status in [301, 302]

- name: Follow all redirects (including unsafe ones)
  ansible.builtin.uri:
    url: http://example.com/resource
    method: GET
    follow_redirects: all  # follows redirects even if method changes
    return_content: true
  register: final_response
```

The `follow_redirects` parameter accepts `none`, `safe` (default, follows redirects that do not change the method), and `all`.

## Timeout Configuration

Set timeouts to avoid hanging on slow endpoints:

```yaml
# configure request timeout for GET requests
- name: Fetch data with timeout
  ansible.builtin.uri:
    url: https://api.slow-service.com/large-dataset
    method: GET
    timeout: 60  # seconds
    return_content: true
  register: dataset

- name: Quick health check with short timeout
  ansible.builtin.uri:
    url: "http://{{ inventory_hostname }}:3000/health"
    method: GET
    timeout: 5
    status_code: 200
  register: health
  failed_when: health.status != 200
```

## Paginated API Responses

Many APIs return paginated results. Here is how to handle pagination with a loop:

```yaml
# handle paginated GET responses by looping
---
- name: Fetch all pages from paginated API
  hosts: localhost
  connection: local
  vars:
    api_url: https://api.example.com/v2/items
    all_items: []
  tasks:
    - name: Fetch first page
      ansible.builtin.uri:
        url: "{{ api_url }}?page=1&per_page=100"
        method: GET
        return_content: true
        headers:
          Authorization: "Bearer {{ api_token }}"
      register: first_page

    - name: Set total pages
      ansible.builtin.set_fact:
        total_pages: "{{ first_page.json.total_pages }}"
        all_items: "{{ first_page.json.items }}"

    - name: Fetch remaining pages
      ansible.builtin.uri:
        url: "{{ api_url }}?page={{ item }}&per_page=100"
        method: GET
        return_content: true
        headers:
          Authorization: "Bearer {{ api_token }}"
      register: page_results
      loop: "{{ range(2, total_pages | int + 1) | list }}"
      when: total_pages | int > 1

    - name: Combine all results
      ansible.builtin.set_fact:
        all_items: "{{ all_items + item.json.items }}"
      loop: "{{ page_results.results }}"
      when: page_results.results is defined and item.json is defined

    - name: Show total items fetched
      ansible.builtin.debug:
        msg: "Fetched {{ all_items | length }} items across {{ total_pages }} pages"
```

## Conditional Task Execution Based on GET Response

Use GET responses to drive playbook logic:

```yaml
# use GET response data to control playbook flow
---
- name: Conditional deployment based on API state
  hosts: app_servers
  tasks:
    - name: Check current deployed version
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:3000/version"
        method: GET
        return_content: true
        timeout: 10
      register: current_version
      failed_when: false

    - name: Determine if deployment is needed
      ansible.builtin.set_fact:
        needs_deploy: "{{ current_version.status | default(0) != 200 or current_version.json.version | default('') != target_version }}"

    - name: Skip if already on target version
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} already running {{ target_version }}, skipping"
      when: not needs_deploy

    - name: Deploy new version
      ansible.builtin.include_tasks: tasks/deploy.yaml
      when: needs_deploy
```

## Caching GET Responses

For APIs you call frequently, avoid redundant requests by caching:

```yaml
# cache API responses to avoid redundant GET requests
---
- name: Efficient API querying
  hosts: all
  tasks:
    - name: Fetch shared configuration (only once)
      ansible.builtin.uri:
        url: https://api.example.com/global-config
        method: GET
        return_content: true
      register: global_config
      run_once: true
      delegate_to: localhost

    - name: Use cached config on all hosts
      ansible.builtin.template:
        src: app_config.j2
        dest: /etc/myapp/config.yaml
      vars:
        config: "{{ global_config.json }}"
```

The `run_once: true` with `delegate_to: localhost` means the API is called only once, not once per host.

## Verifying Response Content

Sometimes you need to validate not just the status code but the response body:

```yaml
# validate response content beyond just the status code
- name: Verify API health response content
  ansible.builtin.uri:
    url: "http://{{ inventory_hostname }}:3000/health"
    method: GET
    return_content: true
  register: health
  failed_when: >
    health.status != 200 or
    health.json.status | default('') != 'healthy' or
    health.json.database | default('') != 'connected'

- name: Verify response contains expected data
  ansible.builtin.uri:
    url: https://api.example.com/users/admin
    method: GET
    return_content: true
    headers:
      Authorization: "Bearer {{ api_token }}"
  register: admin_check
  failed_when: >
    admin_check.status != 200 or
    admin_check.json.role != 'administrator' or
    admin_check.json.active != true
```

## Summary

GET requests with the Ansible `uri` module are your primary tool for reading data from HTTP APIs and checking service health. Use `return_content: true` to access response bodies, `status_code` to define acceptable response codes, and `timeout` to prevent hanging. Build query parameters into the URL using `urlencode` for special characters. For paginated APIs, loop through pages and aggregate results. Combine GET responses with `when` conditions to build smart playbooks that adapt to the current state of your infrastructure. And use `run_once` with `delegate_to` to avoid making the same API call for every host in your inventory.
