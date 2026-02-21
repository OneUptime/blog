# How to Use Ansible skipped Test in Conditionals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Task Control, Automation

Description: Learn how to use the Ansible skipped test in conditionals to detect when tasks were skipped and build responsive playbook logic.

---

Ansible tasks get skipped for various reasons: a `when` condition evaluated to false, a loop had no items, or the task was excluded by tags. Whatever the reason, knowing that a task was skipped can be just as valuable as knowing it succeeded or changed something. The `skipped` test lets you build logic around these skipped states and create playbooks that adapt to what actually happened during execution.

I have found this pattern especially useful in multi-stage deployments where later steps depend on whether earlier optional steps were executed or not.

## Understanding Task Skip Behavior

When Ansible skips a task, the registered variable (if any) gets a special structure. Instead of the usual task output, you get an object with `skipped: true` and a `skip_reason` field. The `is skipped` test checks this property.

Here is a basic example to see how it works.

```yaml
# Demonstrate skip detection with a simple conditional
---
- name: Skip detection demo
  hosts: localhost
  gather_facts: false

  vars:
    deploy_frontend: false

  tasks:
    - name: Build frontend assets
      ansible.builtin.debug:
        msg: "Building frontend..."
      when: deploy_frontend | bool
      register: frontend_build

    - name: Report frontend was skipped
      ansible.builtin.debug:
        msg: "Frontend build was skipped, using cached assets instead"
      when: frontend_build is skipped

    - name: Report frontend was built
      ansible.builtin.debug:
        msg: "Frontend was freshly built"
      when: frontend_build is not skipped
```

When `deploy_frontend` is false, the first task gets skipped, and the second task runs because it detects the skip. If you flip `deploy_frontend` to true, the first task runs and the third task executes instead.

## Practical Use Case: Fallback Logic

One of the most useful applications of the `skipped` test is building fallback paths. If the primary approach does not apply, you can take an alternative route.

```yaml
# Use skipped test for fallback package installation
---
- name: Install monitoring agent
  hosts: all
  become: true

  tasks:
    - name: Install from internal package repo
      ansible.builtin.apt:
        name: monitoring-agent
        state: present
      register: internal_install
      when: "'internal' in group_names"
      ignore_errors: true

    - name: Fall back to public repo installation
      ansible.builtin.apt:
        deb: "https://packages.example.com/monitoring-agent_latest_amd64.deb"
      when: internal_install is skipped or internal_install is failed
      register: fallback_install

    - name: Fail if neither installation method worked
      ansible.builtin.fail:
        msg: "Could not install monitoring agent via internal or public repo"
      when:
        - internal_install is skipped or internal_install is failed
        - fallback_install is skipped or fallback_install is failed
```

This playbook tries the internal repo first. If the host is not in the `internal` group, that task gets skipped and the fallback kicks in. The final task catches the case where both methods failed.

## Combining skipped with Other Tests

The `skipped` test works well alongside `changed`, `failed`, and `success` tests. You can build decision trees that account for every possible outcome.

```yaml
# Decision tree based on multiple task outcomes
---
- name: Database migration workflow
  hosts: db_servers
  become: true

  tasks:
    - name: Check if migration is needed
      ansible.builtin.command:
        cmd: /opt/app/check_migration.sh
      register: migration_check
      changed_when: false
      failed_when: false

    - name: Run database migration
      ansible.builtin.command:
        cmd: /opt/app/migrate.sh
      register: migration_result
      when: migration_check.rc == 0

    - name: Send migration success notification
      ansible.builtin.uri:
        url: "https://hooks.slack.com/services/your/webhook/url"
        method: POST
        body_format: json
        body:
          text: "Database migration completed successfully on {{ inventory_hostname }}"
      when:
        - migration_result is not skipped
        - migration_result is success

    - name: Send skip notification
      ansible.builtin.uri:
        url: "https://hooks.slack.com/services/your/webhook/url"
        method: POST
        body_format: json
        body:
          text: "No migration needed on {{ inventory_hostname }}"
      when: migration_result is skipped
```

## Handling Skipped Tasks in Loops

When you register a variable from a loop, the behavior of the `skipped` test changes slightly. The registered variable has a `results` list, and each item in that list can have its own skipped status.

```yaml
# Detect skipped items within a loop
---
- name: Conditional service management
  hosts: all
  become: true

  vars:
    services:
      - name: nginx
        required: true
      - name: redis
        required: "{{ use_caching | default(false) }}"
      - name: elasticsearch
        required: "{{ use_search | default(false) }}"

  tasks:
    - name: Ensure required services are running
      ansible.builtin.service:
        name: "{{ item.name }}"
        state: started
        enabled: true
      loop: "{{ services }}"
      when: item.required | bool
      register: service_results

    - name: List skipped services
      ansible.builtin.debug:
        msg: "Service {{ item.item.name }} was not required and was skipped"
      loop: "{{ service_results.results }}"
      when: item is skipped
      loop_control:
        label: "{{ item.item.name }}"
```

Each item in `service_results.results` retains its own skip state, so you can iterate through them and react to each one individually.

## Skip Detection in Block Structures

The `skipped` test also works with tasks inside `block` structures. This is useful for building complex workflows where entire sections might be conditional.

```yaml
# Use skip detection with blocks
---
- name: Conditional deployment pipeline
  hosts: app_servers
  become: true

  vars:
    run_tests: true
    deploy_app: false

  tasks:
    - name: Run test suite
      block:
        - name: Execute unit tests
          ansible.builtin.command:
            cmd: /opt/app/run_tests.sh
          register: test_execution
      when: run_tests | bool

    - name: Deploy application
      block:
        - name: Pull latest code
          ansible.builtin.git:
            repo: "https://github.com/example/app.git"
            dest: /opt/app
          register: code_pull
      when: deploy_app | bool

    - name: Generate deployment report
      ansible.builtin.template:
        src: report.j2
        dest: /var/log/deployment_report.txt
      vars:
        tests_ran: "{{ test_execution is defined and test_execution is not skipped }}"
        code_deployed: "{{ code_pull is defined and code_pull is not skipped }}"
```

Notice the `is defined` check before testing for `skipped`. When a task inside a conditional block is skipped, the registered variable might still be undefined if the entire block was skipped. Always pair `is defined` with `is skipped` when working with blocks to avoid undefined variable errors.

## Building a Status Summary

Here is a pattern I use frequently in production playbooks to generate a summary of what happened during a run.

```yaml
# Generate a run summary using skip detection
---
- name: Full deployment with summary
  hosts: app_servers
  become: true

  tasks:
    - name: Update system packages
      ansible.builtin.apt:
        upgrade: safe
      register: system_update
      when: update_system | default(false) | bool

    - name: Deploy application code
      ansible.builtin.git:
        repo: "{{ app_repo }}"
        dest: /opt/app
        version: "{{ app_version }}"
      register: code_deploy
      when: deploy_code | default(true) | bool

    - name: Run database migrations
      ansible.builtin.command:
        cmd: /opt/app/manage.py migrate
      register: db_migrate
      when: run_migrations | default(false) | bool

    - name: Clear application cache
      ansible.builtin.file:
        path: /opt/app/cache
        state: absent
      register: cache_clear
      when: clear_cache | default(false) | bool

    - name: Print deployment summary
      ansible.builtin.debug:
        msg: |
          Deployment Summary for {{ inventory_hostname }}:
          - System update: {{ 'SKIPPED' if system_update is skipped else ('CHANGED' if system_update is changed else 'OK') }}
          - Code deploy:   {{ 'SKIPPED' if code_deploy is skipped else ('CHANGED' if code_deploy is changed else 'OK') }}
          - DB migration:  {{ 'SKIPPED' if db_migrate is skipped else ('CHANGED' if db_migrate is changed else 'OK') }}
          - Cache clear:   {{ 'SKIPPED' if cache_clear is skipped else ('CHANGED' if cache_clear is changed else 'OK') }}
```

This summary tells you at a glance which steps actually ran and which were skipped, making it much easier to understand what a playbook run actually did.

## Things to Watch Out For

A common mistake is testing `skipped` on a variable that was never registered. If the task did not have a `register` directive, there is no variable to test, and Ansible will throw an undefined variable error. Always register the task output before testing its skip status.

Another thing to keep in mind: tasks that are skipped due to tags being excluded do not register any variable at all. The `skipped` test only works for tasks that were evaluated by Ansible and then skipped due to a `when` condition.

The `skipped` test is a small feature, but it fills an important gap in playbook logic. It lets you account for the "nothing happened" scenario, which is often just as important as handling success or failure.
