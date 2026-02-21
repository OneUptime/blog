# How to Handle Indentation Issues in Ansible YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Indentation, Debugging, DevOps

Description: Debug and fix common YAML indentation problems in Ansible playbooks with practical examples and prevention techniques.

---

Indentation errors are the number one source of YAML parsing failures in Ansible. YAML uses indentation to define structure, and a single misplaced space can completely change the meaning of your playbook or cause it to fail entirely.

## The Golden Rules

1. Always use spaces, never tabs
2. Use consistent 2-space indentation
3. Items in a list must be at the same indentation level
4. Mapping values must be indented more than their parent key

## Common Indentation Errors

### Mixed Tabs and Spaces

```yaml
# This looks correct but has a tab character
- name: Install packages
	ansible.builtin.apt:  # TAB here - will fail
    name: nginx
```

Fix: configure your editor to insert spaces when you press Tab.

### Inconsistent List Indentation

```yaml
# Wrong: list items at different levels
- name: Install packages
  ansible.builtin.apt:
    name:
      - nginx
       - curl   # One extra space - this is wrong
      - wget
```

### Module Arguments at Wrong Level

```yaml
# Wrong: dest is at the same level as template
- name: Deploy config
  ansible.builtin.template:
  src: config.j2     # Wrong level
  dest: /etc/config  # Wrong level

# Correct: arguments indented under module
- name: Deploy config
  ansible.builtin.template:
    src: config.j2
    dest: /etc/config
```

### When/Loop at Wrong Level

```yaml
# Wrong: when at the same level as module arguments
- name: Install on Debian
  ansible.builtin.apt:
    name: nginx
    when: ansible_os_family == 'Debian'  # Wrong - inside module args

# Correct: when at the same level as module name
- name: Install on Debian
  ansible.builtin.apt:
    name: nginx
  when: ansible_os_family == 'Debian'
```

## Debugging Indentation

```bash
# Use yamllint to find indentation issues
yamllint -d '{rules: {indentation: {spaces: 2}}}' playbook.yml

# Use python to validate YAML
python3 -c "import yaml; yaml.safe_load(open('playbook.yml'))"

# Use cat with visible whitespace
cat -A playbook.yml | head -20
# Tabs show as ^I, line endings as $
```

## Editor Configuration

```json
// VS Code settings.json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "files.trimTrailingWhitespace": true,
  "[yaml]": {
    "editor.tabSize": 2,
    "editor.autoIndent": "full"
  }
}
```

```
# .editorconfig
[*.yml]
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
insert_final_newline = true
```


## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```


## Conclusion

Indentation issues in YAML are preventable. Configure your editor to use spaces and show whitespace, use yamllint in your workflow, and follow the 2-space convention consistently. When debugging, remember that YAML indentation defines structure, so a task's `when` clause must be at the same level as the module name, not inside the module arguments.

