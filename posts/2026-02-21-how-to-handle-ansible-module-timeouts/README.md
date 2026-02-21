# How to Handle Ansible Module Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Modules, Timeouts, Automation

Description: Learn how to handle module-level timeouts in Ansible for modules that have built-in timeout parameters and for those that do not.

---

Ansible modules are the workhorses that actually execute changes on managed hosts. Some modules have built-in timeout parameters, while others rely on the connection timeout or async execution for time-bounding. Knowing which approach to use for each module type prevents your playbooks from hanging when external services or system operations stall.

## Modules with Built-in Timeout Parameters

Several Ansible modules accept a `timeout` parameter directly. These modules typically interact with external services where response time is unpredictable.

The `uri` module is one of the most commonly used modules with a built-in timeout. Here it is in action:

```yaml
# module-timeout-uri.yml - Using the uri module's built-in timeout
---
- name: API calls with module-level timeouts
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Check external API health with 10 second timeout
      ansible.builtin.uri:
        url: https://api.example.com/v1/health
        method: GET
        timeout: 10          # Module-specific timeout in seconds
        status_code: 200
      register: api_health
      ignore_errors: true

    - name: Post data to webhook with timeout
      ansible.builtin.uri:
        url: https://hooks.example.com/webhook/deploy
        method: POST
        body_format: json
        body:
          event: deployment_started
          timestamp: "{{ ansible_date_time.iso8601 | default(now()) }}"
        timeout: 15
        status_code: [200, 201, 202]
      register: webhook_result
      ignore_errors: true

    - name: Report if webhook failed
      ansible.builtin.debug:
        msg: "Webhook notification failed, but continuing deployment"
      when: webhook_result is failed
```

## The wait_for Module Timeout

The `wait_for` module is entirely built around timeouts. It waits for a condition to be true within a specified time limit.

```yaml
# wait-for-timeouts.yml - Various wait_for timeout patterns
---
- name: Wait for services with timeouts
  hosts: appservers
  tasks:
    - name: Wait for application to start listening on port 8080
      ansible.builtin.wait_for:
        port: 8080
        host: 127.0.0.1
        delay: 5             # Wait 5 seconds before checking
        timeout: 120         # Give up after 2 minutes
        state: started

    - name: Wait for log file to contain ready message
      ansible.builtin.wait_for:
        path: /var/log/myapp/startup.log
        search_regex: "Application started successfully"
        timeout: 180
        delay: 2

    - name: Wait for old process to stop
      ansible.builtin.wait_for:
        path: /var/run/myapp.pid
        state: absent
        timeout: 60
```

## Package Manager Module Timeouts

Package managers like `apt`, `yum`, and `dnf` do not have a built-in timeout parameter in their Ansible modules. This is a common source of hung playbooks because package installations can stall on network issues, lock contention, or large downloads.

You need to use async for these modules:

```yaml
# package-timeouts.yml - Handling package manager timeouts with async
---
- name: Install packages with timeout protection
  hosts: webservers
  become: true
  tasks:
    - name: Update apt cache with timeout
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      async: 120            # 2 minute timeout for cache update
      poll: 10

    - name: Install packages with timeout
      ansible.builtin.apt:
        name:
          - nginx
          - certbot
          - python3-certbot-nginx
        state: present
      async: 600            # 10 minute timeout
      poll: 15
      register: pkg_install

    - name: Fail with helpful message if package install timed out
      ansible.builtin.fail:
        msg: >
          Package installation timed out after 10 minutes on {{ inventory_hostname }}.
          This usually means a slow mirror or apt lock contention.
          Check: sudo lsof /var/lib/dpkg/lock-frontend
      when: pkg_install is failed
```

## Handling apt/yum Lock Contention

A frequent cause of module "timeouts" is lock contention. Another process (like unattended-upgrades) holds the package manager lock, and your task waits indefinitely. Here is how to handle it:

```yaml
# handle-lock.yml - Deal with package manager locks before installing
---
- name: Handle package manager lock contention
  hosts: all
  become: true
  tasks:
    - name: Wait for apt lock to be released
      ansible.builtin.shell: |
        # Loop until the lock is free, up to 5 minutes
        TIMEOUT=300
        ELAPSED=0
        while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
          if [ $ELAPSED -ge $TIMEOUT ]; then
            echo "TIMEOUT waiting for apt lock" >&2
            exit 1
          fi
          sleep 5
          ELAPSED=$((ELAPSED + 5))
        done
        echo "Lock is free"
      register: lock_check
      changed_when: false

    - name: Install packages after lock is free
      ansible.builtin.apt:
        name: nginx
        state: present
      async: 300
      poll: 10
```

## Cloud Module Timeouts

Cloud modules (for AWS, Azure, GCP) often have their own timeout mechanisms because cloud API calls can be slow, especially for operations that create or modify resources.

Here are examples for common cloud modules:

```yaml
# cloud-module-timeouts.yml - Cloud module timeout configurations
---
- name: Cloud operations with proper timeouts
  hosts: localhost
  gather_facts: false
  tasks:
    # AWS EC2 instance creation with wait timeout
    - name: Launch EC2 instance with timeout
      amazon.aws.ec2_instance:
        name: web-server-01
        instance_type: t3.medium
        image_id: ami-0abcdef1234567890
        region: us-east-1
        wait: true
        wait_timeout: 300     # Wait up to 5 minutes for instance to be running
        state: running
      register: ec2_result

    # AWS RDS with longer timeout (database creation is slow)
    - name: Create RDS instance
      amazon.aws.rds_instance:
        db_instance_identifier: myapp-db
        db_instance_class: db.t3.medium
        engine: postgres
        master_username: admin
        master_user_password: "{{ db_password }}"
        allocated_storage: 100
        wait: true
        wait_timeout: 1800    # 30 minutes - RDS creation is genuinely slow
      register: rds_result

    # Azure VM creation
    - name: Create Azure VM with timeout
      azure.azcollection.azure_rm_virtualmachine:
        resource_group: myapp-rg
        name: web-vm-01
        vm_size: Standard_B2s
        image:
          offer: UbuntuServer
          publisher: Canonical
          sku: '20.04-LTS'
          version: latest
        admin_username: azureuser
        ssh_password_enabled: false
        ssh_public_keys:
          - path: /home/azureuser/.ssh/authorized_keys
            key_data: "{{ lookup('file', '~/.ssh/id_rsa.pub') }}"
      # Azure module uses its own internal timeout
      # Use async for an outer timeout boundary
      async: 900
      poll: 30
```

## Custom Module Timeout Wrapper

When a module does not support a timeout parameter and you cannot use async (maybe because you need the return value synchronously), you can write a wrapper using the `shell` module with `timeout`.

```yaml
# module-timeout-wrapper.yml - Wrapping module calls with OS timeout
---
- name: Timeout wrapper for modules without built-in timeout
  hosts: appservers
  tasks:
    - name: Run a module that might hang, via command wrapper
      ansible.builtin.shell: |
        # Use ansible command-line to run a single module with OS timeout
        timeout 120 ansible -m ansible.builtin.get_url \
          -a "url=https://releases.example.com/myapp-2.0.tar.gz dest=/tmp/myapp-2.0.tar.gz" \
          localhost
      delegate_to: "{{ inventory_hostname }}"
      register: download_result

    # Better approach: use get_url with async
    - name: Download artifact with async timeout
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-2.0.tar.gz
        dest: /tmp/myapp-2.0.tar.gz
        timeout: 60           # get_url does have a timeout parameter
      async: 300
      poll: 10
```

## Building a Timeout-Aware Role

For frequently used operations, you can create a role that wraps common tasks with appropriate timeouts.

```yaml
# roles/safe_deploy/tasks/main.yml - Role with built-in timeout handling
---
- name: Download application artifact
  ansible.builtin.get_url:
    url: "{{ artifact_url }}"
    dest: "{{ artifact_dest }}"
    checksum: "sha256:{{ artifact_checksum }}"
    timeout: "{{ download_timeout | default(60) }}"
  async: "{{ download_async_timeout | default(300) }}"
  poll: 10
  register: download_result

- name: Stop application service
  ansible.builtin.systemd:
    name: "{{ app_service_name }}"
    state: stopped
  async: 60
  poll: 5

- name: Run database migrations
  ansible.builtin.shell: |
    cd {{ app_dir }} && ./run_migrations.sh
  async: "{{ migration_timeout | default(600) }}"
  poll: 15
  become: true
  become_user: "{{ app_user }}"

- name: Start application service
  ansible.builtin.systemd:
    name: "{{ app_service_name }}"
    state: started
  async: 60
  poll: 5

- name: Verify application health
  ansible.builtin.uri:
    url: "http://localhost:{{ app_port }}/health"
    timeout: 10
  register: health
  until: health.status == 200
  retries: 30
  delay: 5
```

## Summary

Module timeouts in Ansible fall into three categories: modules with built-in timeout parameters (like `uri`, `get_url`, `wait_for`, and cloud modules), modules that need async/poll wrapping (like `apt`, `yum`, `copy`), and edge cases where the OS `timeout` command provides a safety net. The best approach is to know your modules, set appropriate timeouts for each, and always have a fallback plan for when things take longer than expected. In production playbooks, every task that touches the network or an external service should have a bounded execution time.
