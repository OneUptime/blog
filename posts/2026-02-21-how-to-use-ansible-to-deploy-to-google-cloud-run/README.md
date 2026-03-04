# How to Use Ansible to Deploy to Google Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Google Cloud, Cloud Run, Serverless, Containers

Description: Deploy containerized applications to Google Cloud Run using Ansible for serverless container management with auto-scaling and traffic splitting.

---

Google Cloud Run is a serverless platform that runs containers without requiring you to manage servers or clusters. It automatically scales from zero to thousands of instances based on traffic. While Cloud Run is typically managed through gcloud CLI or Terraform, Ansible provides a way to integrate Cloud Run deployments into your existing automation workflows.

## Prerequisites

```bash
# Install Google Cloud collection
ansible-galaxy collection install google.cloud
pip install google-auth google-api-python-client
```

Authenticate with Google Cloud:

```bash
# Set up application default credentials
gcloud auth application-default login
export GCP_PROJECT=my-project-id
```

## Deploying to Cloud Run

```yaml
# roles/cloudrun_deploy/tasks/main.yml
# Deploy a container to Google Cloud Run
- name: Deploy Cloud Run service
  ansible.builtin.command:
    cmd: >
      gcloud run deploy {{ service_name }}
      --image {{ container_image }}
      --platform managed
      --region {{ gcp_region }}
      --port {{ container_port }}
      --memory {{ memory_limit }}
      --cpu {{ cpu_limit }}
      --min-instances {{ min_instances }}
      --max-instances {{ max_instances }}
      --set-env-vars {{ env_vars | join(',') }}
      --service-account {{ service_account }}
      --allow-unauthenticated
      --project {{ gcp_project }}
      --quiet
  register: deploy_result
  changed_when: "'Deploying' in deploy_result.stderr"

- name: Get service URL
  ansible.builtin.command:
    cmd: >
      gcloud run services describe {{ service_name }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
      --format 'value(status.url)'
  register: service_url
  changed_when: false

- name: Display service URL
  ansible.builtin.debug:
    msg: "Service deployed at: {{ service_url.stdout }}"

- name: Verify service health
  ansible.builtin.uri:
    url: "{{ service_url.stdout }}/health"
    status_code: 200
  register: health
  until: health.status == 200
  retries: 10
  delay: 10
```

## Variables

```yaml
# inventories/production/group_vars/cloudrun.yml
# Cloud Run deployment configuration
gcp_project: my-production-project
gcp_region: us-central1
service_name: myapp-api
container_image: "gcr.io/{{ gcp_project }}/myapp:{{ app_version }}"
container_port: 8080
memory_limit: "512Mi"
cpu_limit: "1"
min_instances: 1
max_instances: 100
service_account: "myapp@{{ gcp_project }}.iam.gserviceaccount.com"
env_vars:
  - "DATABASE_URL={{ vault_database_url }}"
  - "LOG_LEVEL=info"
  - "ENVIRONMENT=production"
```

## Traffic Splitting for Canary Deployments

```yaml
# roles/cloudrun_deploy/tasks/traffic_split.yml
# Configure traffic splitting between revisions
- name: Deploy new revision without routing traffic
  ansible.builtin.command:
    cmd: >
      gcloud run deploy {{ service_name }}
      --image {{ container_image }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
      --no-traffic
      --tag canary
      --quiet
  changed_when: true

- name: Split traffic between stable and canary
  ansible.builtin.command:
    cmd: >
      gcloud run services update-traffic {{ service_name }}
      --to-tags canary={{ canary_percent }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
  changed_when: true

- name: Verify canary health
  ansible.builtin.uri:
    url: "https://canary---{{ service_name }}-{{ gcp_run_hash }}.a.run.app/health"
    status_code: 200
  register: canary_health
  retries: 5
  delay: 10

- name: Promote canary to full traffic
  ansible.builtin.command:
    cmd: >
      gcloud run services update-traffic {{ service_name }}
      --to-latest
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
  when: promote_canary | default(false)
  changed_when: true
```

## Secrets Management

```yaml
# roles/cloudrun_deploy/tasks/secrets.yml
# Configure Cloud Run to use Secret Manager secrets
- name: Deploy with Secret Manager references
  ansible.builtin.command:
    cmd: >
      gcloud run deploy {{ service_name }}
      --image {{ container_image }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
      --set-secrets "DB_PASSWORD=db-password:latest,API_KEY=api-key:latest"
      --quiet
  changed_when: true
```

## Custom Domain Mapping

```yaml
# roles/cloudrun_deploy/tasks/domain.yml
# Map a custom domain to Cloud Run service
- name: Map custom domain
  ansible.builtin.command:
    cmd: >
      gcloud run domain-mappings create
      --service {{ service_name }}
      --domain {{ custom_domain }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
  register: domain_result
  failed_when: false
  changed_when: "'already exists' not in domain_result.stderr"
```

## Cleanup Old Revisions

```yaml
# roles/cloudrun_deploy/tasks/cleanup.yml
# Remove old Cloud Run revisions
- name: List old revisions
  ansible.builtin.command:
    cmd: >
      gcloud run revisions list
      --service {{ service_name }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
      --format 'value(name)'
      --sort-by '~creationTimestamp'
  register: revisions
  changed_when: false

- name: Delete old revisions keeping last N
  ansible.builtin.command:
    cmd: >
      gcloud run revisions delete {{ item }}
      --platform managed
      --region {{ gcp_region }}
      --project {{ gcp_project }}
      --quiet
  loop: "{{ revisions.stdout_lines[keep_revisions:] }}"
  when: revisions.stdout_lines | length > keep_revisions
  changed_when: true
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

Google Cloud Run with Ansible gives you serverless container deployments managed as code. You get automatic scaling, traffic splitting for canary releases, and Secret Manager integration. Using Ansible to orchestrate these deployments means your Cloud Run configuration lives alongside the rest of your infrastructure code and follows the same review and deployment processes. The serverless model means you only pay for what you use, while Ansible ensures every deployment is consistent and repeatable.
