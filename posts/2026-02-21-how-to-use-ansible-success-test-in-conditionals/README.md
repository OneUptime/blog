# How to Use Ansible success Test in Conditionals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Error Handling, Automation

Description: Learn how to use the Ansible success test in when conditionals to branch playbook logic based on task success status.

---

When building Ansible playbooks for production systems, you often need to verify that a task completed successfully before moving on to dependent steps. The `success` test (also available as `succeeded`) gives you a clean way to check whether a registered task result indicates a successful execution. While Ansible stops on failure by default, combining `ignore_errors` with the `success` test opens up powerful branching patterns.

## What the success Test Actually Checks

The `success` test evaluates the return code of a task result. For most modules, a task is considered successful when it completes without raising an error. For command-based modules like `command`, `shell`, and `raw`, success means the command returned exit code 0.

Here is the most straightforward example.

```yaml
# Check if a command succeeded before proceeding
---
- name: Success test basics
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Test database connectivity
      ansible.builtin.command:
        cmd: pg_isready -h localhost -p 5432
      register: db_check
      ignore_errors: true

    - name: Run migrations if database is reachable
      ansible.builtin.command:
        cmd: /opt/app/manage.py migrate
      when: db_check is success

    - name: Alert that database is down
      ansible.builtin.debug:
        msg: "WARNING: Database is not reachable, skipping migrations"
      when: db_check is not success
```

The `ignore_errors: true` on the first task prevents Ansible from stopping if the database check fails. Then the `success` test determines which path to take.

## success vs failed: When to Use Which

You might wonder why not just use `is failed` instead of `is not success`. In most cases they are equivalent, but there is a subtle difference. The `success` test checks that the task completed with a successful status, while `failed` specifically checks for failure. A task that was *skipped* is neither successful nor failed. If you care about that distinction, use the specific test.

```yaml
# Show the difference between success, failed, and skipped
---
- name: Test comparison demo
  hosts: localhost
  gather_facts: false

  vars:
    run_check: false

  tasks:
    - name: Optional connectivity check
      ansible.builtin.command:
        cmd: ping -c 1 example.com
      register: connectivity
      when: run_check | bool
      ignore_errors: true

    # This will NOT run because a skipped task is not "success"
    - name: Only on success
      ansible.builtin.debug:
        msg: "Connectivity check passed"
      when: connectivity is success

    # This will NOT run because a skipped task is not "failed"
    - name: Only on failure
      ansible.builtin.debug:
        msg: "Connectivity check failed"
      when: connectivity is failed

    # This WILL run because the task was skipped
    - name: Only on skip
      ansible.builtin.debug:
        msg: "Connectivity check was skipped"
      when: connectivity is skipped
```

## Real World Pattern: Health Checks Before Deployment

One of my favorite patterns is running health checks before deploying and using the `success` test to gate the deployment.

```yaml
# Pre-deployment health checks using success test
---
- name: Safe deployment with health checks
  hosts: app_servers
  become: true
  serial: 1

  tasks:
    - name: Check if application is currently healthy
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        return_content: true
        status_code: 200
      register: pre_deploy_health
      ignore_errors: true

    - name: Skip unhealthy hosts
      ansible.builtin.fail:
        msg: "Host {{ inventory_hostname }} is unhealthy before deployment, skipping"
      when: pre_deploy_health is not success

    - name: Deploy new version
      ansible.builtin.copy:
        src: app-v2.jar
        dest: /opt/app/app.jar
      register: deploy_result

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      when: deploy_result is changed

    - name: Wait for application to start
      ansible.builtin.pause:
        seconds: 10

    - name: Post-deployment health check
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        return_content: true
        status_code: 200
      register: post_deploy_health
      ignore_errors: true
      retries: 3
      delay: 5

    - name: Report deployment status
      ansible.builtin.debug:
        msg: >
          Deployment on {{ inventory_hostname }}:
          Pre-check={{ 'PASS' if pre_deploy_health is success else 'FAIL' }},
          Post-check={{ 'PASS' if post_deploy_health is success else 'FAIL' }}
```

With `serial: 1`, this playbook deploys one server at a time, checking health before and after. If a host is already unhealthy, it gets skipped entirely.

## Combining success with Retry Logic

The `success` test pairs well with retry patterns where you want to try an operation, check if it worked, and try something else if it did not.

```yaml
# Try multiple approaches until one succeeds
---
- name: Install package with fallback sources
  hosts: all
  become: true

  tasks:
    - name: Try installing from primary repo
      ansible.builtin.apt:
        name: special-tool
        state: present
      register: primary_install
      ignore_errors: true

    - name: Try installing from secondary repo
      ansible.builtin.apt:
        deb: "https://backup-repo.example.com/special-tool_latest.deb"
      register: secondary_install
      when: primary_install is not success
      ignore_errors: true

    - name: Build from source as last resort
      block:
        - name: Clone source repository
          ansible.builtin.git:
            repo: "https://github.com/example/special-tool.git"
            dest: /tmp/special-tool-src

        - name: Build and install
          ansible.builtin.command:
            cmd: make install
            chdir: /tmp/special-tool-src
      register: source_build
      when:
        - primary_install is not success
        - secondary_install is defined
        - secondary_install is not success
      ignore_errors: true

    - name: Verify installation succeeded through some path
      ansible.builtin.command:
        cmd: which special-tool
      register: verify_install

    - name: Report installation method
      ansible.builtin.debug:
        msg: >
          Installation result:
          Primary repo: {{ 'SUCCESS' if primary_install is success else 'FAILED' }}
          Secondary repo: {{ 'SUCCESS' if (secondary_install is defined and secondary_install is success) else 'SKIPPED/FAILED' }}
          Source build: {{ 'SUCCESS' if (source_build is defined and source_build is success) else 'SKIPPED/FAILED' }}
```

## Using success with API Calls

When working with REST APIs, the `success` test helps you handle different response scenarios gracefully.

```yaml
# API interaction with success-based branching
---
- name: Manage cloud resources via API
  hosts: localhost
  gather_facts: false

  vars:
    api_base: "https://api.cloud.example.com/v1"
    api_token: "{{ vault_api_token }}"

  tasks:
    - name: Check if load balancer exists
      ansible.builtin.uri:
        url: "{{ api_base }}/load-balancers/my-lb"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: [200, 404]
      register: lb_check

    - name: Create load balancer if it does not exist
      ansible.builtin.uri:
        url: "{{ api_base }}/load-balancers"
        method: POST
        headers:
          Authorization: "Bearer {{ api_token }}"
        body_format: json
        body:
          name: my-lb
          type: application
        status_code: 201
      register: lb_create
      when: lb_check.status == 404

    - name: Update existing load balancer
      ansible.builtin.uri:
        url: "{{ api_base }}/load-balancers/my-lb"
        method: PUT
        headers:
          Authorization: "Bearer {{ api_token }}"
        body_format: json
        body:
          type: application
          settings:
            idle_timeout: 120
        status_code: 200
      when:
        - lb_check is success
        - lb_check.status == 200
```

## Checking success Across a List of Results

When you register results from a loop, you can check whether all iterations succeeded or find the ones that did not.

```yaml
# Check success across looped tasks
---
- name: Verify multiple service endpoints
  hosts: monitoring
  gather_facts: false

  vars:
    endpoints:
      - name: API
        url: "https://api.example.com/health"
      - name: Web
        url: "https://www.example.com/health"
      - name: Auth
        url: "https://auth.example.com/health"

  tasks:
    - name: Check all endpoints
      ansible.builtin.uri:
        url: "{{ item.url }}"
        status_code: 200
        timeout: 5
      loop: "{{ endpoints }}"
      register: endpoint_checks
      ignore_errors: true
      loop_control:
        label: "{{ item.name }}"

    - name: Report failed endpoints
      ansible.builtin.debug:
        msg: "ALERT: {{ item.item.name }} endpoint is down ({{ item.item.url }})"
      loop: "{{ endpoint_checks.results }}"
      when: item is not success
      loop_control:
        label: "{{ item.item.name }}"

    - name: Fail if any endpoint is down
      ansible.builtin.fail:
        msg: "One or more endpoints are unhealthy"
      when: endpoint_checks.results | selectattr('failed') | list | length > 0
```

## Tips for Using the success Test

Always pair the `success` test with `ignore_errors: true` on the task you are checking. Without `ignore_errors`, a failed task will halt the playbook before you ever get to your conditional logic.

Keep in mind that some modules define success differently. The `uri` module, for example, considers any HTTP response with the expected status code as success. The `command` module considers exit code 0 as success. Understanding what "success" means for each module helps you write accurate conditionals.

The `success` test is straightforward, but it forms the backbone of resilient automation. By checking task outcomes explicitly rather than relying on Ansible's default stop-on-failure behavior, you can build playbooks that handle real-world complexity where things do not always go as planned.
