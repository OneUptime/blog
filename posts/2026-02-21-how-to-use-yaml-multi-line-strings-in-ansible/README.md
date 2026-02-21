# How to Use YAML Multi-Line Strings in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Strings, Configuration, DevOps

Description: Master YAML multi-line string syntax in Ansible including literal blocks, folded blocks, and their modifiers for clean configuration management.

---

Multi-line strings in YAML are essential when working with Ansible. You need them for shell commands, configuration file content, long descriptions, and template snippets. YAML provides several ways to handle multi-line strings, each with different behavior regarding newlines and whitespace.

## The Two Main Styles

YAML has two multi-line string indicators: the pipe (`|`) for literal blocks and the greater-than (`>`) for folded blocks.

### Literal Block (`|`)

The pipe preserves newlines exactly as written. Each line break in the YAML becomes a line break in the resulting string.

```yaml
# Literal block - preserves newlines
- name: Create a multi-line script
  ansible.builtin.copy:
    dest: /tmp/setup.sh
    content: |
      #!/bin/bash
      echo "Starting setup"
      apt-get update
      apt-get install -y nginx
      systemctl start nginx
      echo "Setup complete"
    mode: '0755'
```

The resulting file will have each line on its own line, exactly as you wrote it.

### Folded Block (`>`)

The greater-than sign folds newlines into spaces, creating one long line from multiple YAML lines. Blank lines become actual newlines.

```yaml
# Folded block - joins lines with spaces
- name: Display a long message
  ansible.builtin.debug:
    msg: >
      This is a very long message that would be
      hard to read if it were all on one line
      in the YAML file. The folded block style
      joins these lines with spaces.
```

The result is a single paragraph: "This is a very long message that would be hard to read if it were all on one line in the YAML file. The folded block style joins these lines with spaces."

## Chomping Modifiers

Both literal and folded blocks support chomping modifiers that control trailing newlines.

```yaml
# Default (clip) - single trailing newline
trailing_newline: |
  line one
  line two

# Strip (-) - no trailing newline
no_trailing: |-
  line one
  line two

# Keep (+) - preserve all trailing newlines
all_trailing: |+
  line one
  line two


```

## Practical Examples

### Shell Commands

```yaml
# Use literal block for multi-line shell commands
- name: Run database migration
  ansible.builtin.shell: |
    cd /opt/app
    source venv/bin/activate
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
  args:
    executable: /bin/bash
```

### Configuration Files

```yaml
# Use literal block for configuration file content
- name: Deploy nginx configuration
  ansible.builtin.copy:
    dest: /etc/nginx/conf.d/app.conf
    content: |
      server {
          listen 80;
          server_name {{ server_name }};

          location / {
              proxy_pass http://127.0.0.1:8080;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
          }
      }
```

### Long When Conditions

```yaml
# Use folded block with strip for long conditions
- name: Apply production-only configuration
  ansible.builtin.template:
    src: prod.conf.j2
    dest: /etc/app/prod.conf
  when: >-
    deploy_environment == 'production'
    and feature_flags.new_config_enabled
    and inventory_hostname in groups['primary']
```

Note the `>-` which folds lines and strips the trailing newline, producing a single-line condition string.

### Jinja2 Templates Inline

```yaml
# Use literal block for inline Jinja2 templates
- name: Generate hosts file entries
  ansible.builtin.copy:
    dest: /etc/hosts.ansible
    content: |
      # Managed by Ansible
      127.0.0.1 localhost
      {% for host in groups['all'] %}
      {{ hostvars[host].ansible_host }} {{ host }}
      {% endfor %}
```

## Indentation in Multi-Line Blocks

The indentation indicator tells YAML how many spaces to strip from the beginning of each line:

```yaml
# Explicit indentation indicator (2 spaces)
- name: Write indented content
  ansible.builtin.copy:
    dest: /tmp/indented.txt
    content: |2
        This line has 4 spaces of indentation
        This one too
      This line has 2 spaces
```

## Common Mistakes

```yaml
# Mistake: forgetting the trailing colon-space before the block
# This will cause a YAML parse error
bad_example:|
  some content

# Correct: space after the colon
good_example: |
  some content

# Mistake: inconsistent indentation within a block
bad_indent: |
  line one
    line two with different indent
  line three

# This is valid YAML but the extra spaces are preserved
# which may not be what you want
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

Multi-line strings in YAML boil down to a simple choice. Use `|` (literal) when newlines matter, like scripts and configuration files. Use `>` (folded) when you want a single paragraph from multiple YAML lines, like long descriptions and conditions. Add `-` to strip trailing newlines or `+` to keep them all. Master these four combinations and you will handle every multi-line string scenario in Ansible.
