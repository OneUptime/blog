# How to Create Custom Facts Files on Remote Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Custom Facts, Remote Hosts, Configuration Management

Description: Step-by-step guide to creating and managing custom facts files on remote hosts using Ansible for better infrastructure metadata tracking.

---

Custom facts files on remote hosts give Ansible persistent, host-specific metadata that survives between playbook runs. Unlike variables defined in inventory or playbooks, custom facts live on the managed hosts themselves. This means they can reflect the actual state of the machine, not just what your inventory says it should be.

## Where Custom Facts Live

Ansible looks for custom facts in the `/etc/ansible/facts.d/` directory on each managed host. Files in this directory must have the `.fact` extension. They can be in three formats: INI, JSON, or executable scripts that output JSON.

The directory does not exist by default on most systems. You need to create it before deploying fact files.

```yaml
# create-facts-dir.yml
# Creates the facts.d directory on all managed hosts
---
- name: Prepare hosts for custom facts
  hosts: all
  become: yes
  tasks:
    - name: Create the facts.d directory
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        owner: root
        group: root
        mode: '0755'
        recurse: yes
```

## Creating INI Format Fact Files

INI is the simplest format. It uses sections and key-value pairs. Each section becomes a dictionary, and each key-value pair becomes an entry in that dictionary.

```yaml
# deploy-ini-facts.yml
# Creates an INI-format custom fact file on remote hosts
---
- name: Deploy INI custom facts
  hosts: webservers
  become: yes
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Create web server fact file
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/webserver.fact
        content: |
          [config]
          server_type=nginx
          listen_port=8080
          worker_processes=auto
          ssl_enabled=true

          [deployment]
          environment=production
          region=us-east-1
          cluster=web-cluster-01
        owner: root
        group: root
        mode: '0644'

    - name: Refresh local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: Verify the facts are readable
      ansible.builtin.debug:
        msg:
          - "Server type: {{ ansible_local.webserver.config.server_type }}"
          - "Environment: {{ ansible_local.webserver.deployment.environment }}"
          - "Region: {{ ansible_local.webserver.deployment.region }}"
```

When you run this, the output shows the facts parsed correctly from the INI file. The filename without the `.fact` extension becomes the top-level key under `ansible_local`.

## Creating JSON Format Fact Files

JSON format supports richer data structures including lists, nested objects, booleans, and numbers (INI treats everything as strings).

```yaml
# deploy-json-facts.yml
# Creates a JSON-format custom fact with nested data
---
- name: Deploy JSON custom facts
  hosts: dbservers
  become: yes
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Create database fact file
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/database.fact
        content: |
          {
            "engine": "postgresql",
            "version": "15.4",
            "port": 5432,
            "max_connections": 200,
            "shared_buffers_mb": 2048,
            "replication": {
              "enabled": true,
              "role": "primary",
              "replicas": ["db-replica-01", "db-replica-02"]
            },
            "databases": [
              {"name": "appdb", "size_gb": 45},
              {"name": "analytics", "size_gb": 120}
            ]
          }
        mode: '0644'

    - name: Refresh local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: Display database facts
      ansible.builtin.debug:
        msg:
          - "Engine: {{ ansible_local.database.engine }} {{ ansible_local.database.version }}"
          - "Replication role: {{ ansible_local.database.replication.role }}"
          - "Replicas: {{ ansible_local.database.replication.replicas | join(', ') }}"
          - "Database count: {{ ansible_local.database.databases | length }}"
```

## Creating Executable Fact Scripts

Executable fact files are scripts that run on the remote host and output JSON to stdout. They must have the execute permission set. This is the most powerful option because the facts can reflect live system state.

```yaml
# deploy-executable-fact.yml
# Creates a fact script that reports live system metrics
---
- name: Deploy executable fact script
  hosts: all
  become: yes
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Deploy system health check fact script
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/health.fact
        mode: '0755'
        content: |
          #!/bin/bash
          # Collects real-time system health metrics
          # Output must be valid JSON

          # Get load average
          LOAD=$(awk '{print $1}' /proc/loadavg)

          # Get memory usage percentage
          MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
          MEM_AVAIL=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
          MEM_USED_PCT=$(echo "scale=1; (($MEM_TOTAL - $MEM_AVAIL) * 100) / $MEM_TOTAL" | bc)

          # Get root filesystem usage
          DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

          # Count running processes
          PROC_COUNT=$(ps aux | wc -l)

          # Check if system needs reboot
          if [ -f /var/run/reboot-required ]; then
            NEEDS_REBOOT="true"
          else
            NEEDS_REBOOT="false"
          fi

          cat <<EOF
          {
            "load_average": $LOAD,
            "memory_used_percent": $MEM_USED_PCT,
            "disk_root_used_percent": $DISK_PCT,
            "process_count": $PROC_COUNT,
            "needs_reboot": $NEEDS_REBOOT,
            "checked_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }
          EOF

    - name: Gather local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: Show health status
      ansible.builtin.debug:
        var: ansible_local.health
```

## Templating Fact Files for Per-Host Customization

Static fact files are the same on every host. Templates let you create fact files that differ based on inventory variables or other host attributes.

```yaml
# deploy-templated-facts.yml
# Uses a template to create host-specific fact files
---
- name: Deploy per-host custom facts
  hosts: all
  become: yes
  vars:
    maintenance_window: "sunday 02:00-06:00"
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Deploy host metadata fact from template
      ansible.builtin.template:
        src: host_metadata.fact.j2
        dest: /etc/ansible/facts.d/host_metadata.fact
        mode: '0644'

    - name: Refresh local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: Display host metadata
      ansible.builtin.debug:
        var: ansible_local.host_metadata
```

```jinja2
{# templates/host_metadata.fact.j2 #}
{# Per-host metadata fact file - customized per host using inventory data #}
{
  "hostname": "{{ inventory_hostname }}",
  "groups": {{ group_names | to_json }},
  "environment": "{{ env | default('development') }}",
  "datacenter": "{{ datacenter | default('dc1') }}",
  "maintenance_window": "{{ maintenance_window }}",
  "managed_by": "ansible",
  "provisioned_at": "{{ ansible_date_time.iso8601 }}",
  "ansible_managed": true
}
```

## Managing Multiple Fact Files

In larger environments, you might have several fact files per host. Here is a role-based approach that deploys different facts depending on the host's role.

```yaml
# deploy-role-facts.yml
# Deploys role-specific fact files based on group membership
---
- name: Deploy role-based custom facts
  hosts: all
  become: yes
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Deploy web server facts
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/role_web.fact
        content: '{"role": "webserver", "ports": [80, 443], "proxy_protocol": true}'
        mode: '0644'
      when: "'webservers' in group_names"

    - name: Deploy database server facts
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/role_db.fact
        content: '{"role": "database", "ports": [5432], "backup_enabled": true}'
        mode: '0644'
      when: "'dbservers' in group_names"

    - name: Deploy monitoring server facts
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/role_monitoring.fact
        content: '{"role": "monitoring", "ports": [9090, 3000], "retention_days": 30}'
        mode: '0644'
      when: "'monitoring' in group_names"

    - name: Refresh local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: List all local facts
      ansible.builtin.debug:
        var: ansible_local
```

## Cleaning Up Old Fact Files

When decommissioning services, clean up their fact files to prevent stale data.

```yaml
# cleanup-facts.yml
# Removes fact files for decommissioned services
---
- name: Clean up old fact files
  hosts: all
  become: yes
  tasks:
    - name: Remove deprecated fact files
      ansible.builtin.file:
        path: "/etc/ansible/facts.d/{{ item }}"
        state: absent
      loop:
        - old_service.fact
        - legacy_config.fact
        - deprecated_app.fact

    - name: Refresh facts after cleanup
      ansible.builtin.setup:
        filter: ansible_local
```

## Using Custom Facts in Other Playbooks

Once fact files are deployed, every subsequent playbook run picks them up automatically during fact gathering. You do not need any special configuration.

```yaml
# use-custom-facts.yml
# A separate playbook that consumes custom facts deployed earlier
---
- name: Configure monitoring based on custom facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Configure alerts for high-memory hosts
      ansible.builtin.template:
        src: alert-rules.yml.j2
        dest: /etc/prometheus/rules/host-alerts.yml
      when:
        - ansible_local.health is defined
        - ansible_local.health.memory_used_percent | float > 80

    - name: Schedule reboot during maintenance window
      ansible.builtin.cron:
        name: "scheduled reboot"
        special_time: reboot
        job: "/sbin/shutdown -r now"
      when:
        - ansible_local.health is defined
        - ansible_local.health.needs_reboot | bool
        - ansible_local.host_metadata is defined
```

## Summary

Custom facts files on remote hosts provide persistent, queryable metadata about your infrastructure. Use INI for simple key-value data, JSON for structured data with nesting and proper types, and executable scripts for dynamic real-time information. Deploy them with `ansible.builtin.copy` or `ansible.builtin.template`, always remember to refresh facts after deploying new files, and access them through `ansible_local.<filename>.<key>`. This approach gives every host a self-describing identity that Ansible can leverage in any playbook.
