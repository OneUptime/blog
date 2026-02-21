# How to Use Ansible to Scan Container Images for Vulnerabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Security, Vulnerability Scanning, Trivy

Description: Automate container image vulnerability scanning with Ansible using Trivy, Grype, and custom scanning policies for CI/CD integration.

---

Container images can contain vulnerable software packages that attackers exploit. Scanning images before deployment catches these vulnerabilities early. Ansible can automate the scanning process, enforce policies based on severity, and block deployments that fail security checks.

## Setting Up Trivy

```yaml
# roles/image_scanning/tasks/install_trivy.yml
# Install Trivy vulnerability scanner
- name: Download Trivy
  ansible.builtin.get_url:
    url: "https://github.com/aquasecurity/trivy/releases/download/v{{ trivy_version }}/trivy_{{ trivy_version }}_Linux-64bit.tar.gz"
    dest: /tmp/trivy.tar.gz

- name: Extract and install Trivy
  ansible.builtin.unarchive:
    src: /tmp/trivy.tar.gz
    dest: /usr/local/bin/
    remote_src: true
    creates: /usr/local/bin/trivy

- name: Update Trivy vulnerability database
  ansible.builtin.command:
    cmd: trivy image --download-db-only
  changed_when: true
```

## Scanning Images

```yaml
# roles/image_scanning/tasks/scan.yml
# Scan container images and enforce security policy
- name: Scan image for vulnerabilities
  ansible.builtin.command:
    cmd: >
      trivy image
      --severity {{ scan_severity }}
      --format json
      --output /tmp/scan-{{ item.name | replace('/', '-') }}.json
      {{ item.image }}:{{ item.tag }}
  register: scan_results
  failed_when: false
  changed_when: false
  loop: "{{ images_to_scan }}"

- name: Read scan results
  ansible.builtin.slurp:
    src: "/tmp/scan-{{ item.name | replace('/', '-') }}.json"
  register: scan_data
  loop: "{{ images_to_scan }}"

- name: Check for critical vulnerabilities
  ansible.builtin.fail:
    msg: "Image {{ item.item.image }} has {{ (item.content | b64decode | from_json).Results | map(attribute='Vulnerabilities') | flatten | selectattr('Severity', 'equalto', 'CRITICAL') | list | length }} CRITICAL vulnerabilities"
  loop: "{{ scan_data.results }}"
  when:
    - (item.content | b64decode | from_json).Results is defined
    - (item.content | b64decode | from_json).Results | map(attribute='Vulnerabilities') | flatten | selectattr('Severity', 'equalto', 'CRITICAL') | list | length > 0
    - block_on_critical | default(true)
  loop_control:
    label: "{{ item.item.name }}"
```

## Scanning in CI Pipeline

```yaml
# playbooks/scan_before_deploy.yml
# Scan all images before deployment
- name: Pre-deployment security scan
  hosts: localhost
  connection: local
  tasks:
    - name: Include scanning role
      ansible.builtin.include_role:
        name: image_scanning
        tasks_from: scan
      vars:
        images_to_scan:
          - name: web-app
            image: "{{ registry }}/web-app"
            tag: "{{ deploy_version }}"
          - name: api-service
            image: "{{ registry }}/api-service"
            tag: "{{ deploy_version }}"
        scan_severity: "HIGH,CRITICAL"
        block_on_critical: true
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

Automated vulnerability scanning with Ansible catches security issues before they reach production. Integrate Trivy or Grype into your deployment playbooks, define clear policies about which severity levels block deployments, and generate reports for your security team. This approach shifts security left in your pipeline without adding manual steps.
