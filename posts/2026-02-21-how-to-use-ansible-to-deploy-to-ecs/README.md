# How to Use Ansible to Deploy to ECS (Elastic Container Service)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, ECS, Containers, DevOps

Description: Deploy containerized applications to AWS ECS using Ansible for task definition management, service updates, and cluster configuration.

---

AWS Elastic Container Service (ECS) is Amazon's managed container orchestration platform. It runs your Docker containers without requiring you to manage Kubernetes clusters. Ansible has excellent support for ECS through the amazon.aws and community.aws collections, letting you manage task definitions, services, and clusters as code.

## Prerequisites

```bash
# Install AWS collections and dependencies
ansible-galaxy collection install amazon.aws community.aws
pip install boto3 botocore
```

Configure AWS credentials either through environment variables, AWS CLI profile, or IAM role.

## Defining ECS Task Definitions

```yaml
# roles/ecs_deploy/tasks/task_definition.yml
# Register an ECS task definition
- name: Register ECS task definition
  community.aws.ecs_taskdefinition:
    family: "{{ app_name }}"
    task_role_arn: "{{ ecs_task_role_arn }}"
    execution_role_arn: "{{ ecs_execution_role_arn }}"
    network_mode: awsvpc
    launch_type: FARGATE
    cpu: "{{ task_cpu }}"
    memory: "{{ task_memory }}"
    containers:
      - name: "{{ app_name }}"
        image: "{{ ecr_registry }}/{{ app_name }}:{{ app_version }}"
        essential: true
        portMappings:
          - containerPort: "{{ app_port }}"
            protocol: tcp
        environment:
          - name: DATABASE_URL
            value: "{{ database_url }}"
          - name: LOG_LEVEL
            value: "{{ log_level }}"
        secrets:
          - name: API_KEY
            valueFrom: "{{ secrets_manager_arn }}/api-key"
        logConfiguration:
          logDriver: awslogs
          options:
            awslogs-group: "/ecs/{{ app_name }}"
            awslogs-region: "{{ aws_region }}"
            awslogs-stream-prefix: ecs
        healthCheck:
          command:
            - CMD-SHELL
            - "curl -f http://localhost:{{ app_port }}/health || exit 1"
          interval: 30
          timeout: 5
          retries: 3
          startPeriod: 60
    state: present
  register: task_definition

- name: Display task definition ARN
  ansible.builtin.debug:
    msg: "Task definition: {{ task_definition.taskdefinition.taskDefinitionArn }}"
```

## Creating the ECS Service

```yaml
# roles/ecs_deploy/tasks/service.yml
# Create or update an ECS service
- name: Create ECS service
  community.aws.ecs_service:
    name: "{{ app_name }}-service"
    cluster: "{{ ecs_cluster_name }}"
    task_definition: "{{ app_name }}"
    desired_count: "{{ desired_count }}"
    launch_type: FARGATE
    network_configuration:
      subnets: "{{ ecs_subnets }}"
      security_groups: "{{ ecs_security_groups }}"
      assign_public_ip: false
    load_balancers:
      - targetGroupArn: "{{ target_group_arn }}"
        containerName: "{{ app_name }}"
        containerPort: "{{ app_port }}"
    deployment_configuration:
      minimum_healthy_percent: 50
      maximum_percent: 200
    health_check_grace_period_seconds: 120
    state: present
  register: ecs_service

- name: Wait for service to stabilize
  community.aws.ecs_service_info:
    cluster: "{{ ecs_cluster_name }}"
    service: "{{ app_name }}-service"
  register: service_info
  until:
    - service_info.services[0].runningCount == desired_count
  retries: 30
  delay: 20
```

## Creating the CloudWatch Log Group

```yaml
# roles/ecs_deploy/tasks/logging.yml
# Create CloudWatch log group for ECS tasks
- name: Create CloudWatch log group
  amazon.aws.cloudwatchlogs_log_group:
    log_group_name: "/ecs/{{ app_name }}"
    retention: "{{ log_retention_days }}"
    state: present
```

## Variables

```yaml
# inventories/production/group_vars/ecs.yml
# ECS deployment configuration
aws_region: us-east-1
ecs_cluster_name: production-cluster
ecr_registry: "123456789.dkr.ecr.us-east-1.amazonaws.com"
app_name: myapp
app_version: "v2.1.0"
app_port: 8080
task_cpu: "512"
task_memory: "1024"
desired_count: 3
ecs_subnets:
  - subnet-abc123
  - subnet-def456
ecs_security_groups:
  - sg-789abc
ecs_task_role_arn: "arn:aws:iam::123456789:role/ecs-task-role"
ecs_execution_role_arn: "arn:aws:iam::123456789:role/ecs-execution-role"
target_group_arn: "arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/myapp/abc123"
log_retention_days: 30
database_url: "{{ vault_database_url }}"
log_level: "info"
```

## Full Deployment Playbook

```yaml
# playbooks/deploy_ecs.yml
# Complete ECS deployment workflow
- name: Deploy to ECS
  hosts: localhost
  connection: local
  roles:
    - role: ecs_deploy
      tasks_from: logging
    - role: ecs_deploy
      tasks_from: task_definition
    - role: ecs_deploy
      tasks_from: service
  post_tasks:
    - name: Verify deployment
      community.aws.ecs_service_info:
        cluster: "{{ ecs_cluster_name }}"
        service: "{{ app_name }}-service"
      register: final_status

    - name: Assert service is healthy
      ansible.builtin.assert:
        that:
          - final_status.services[0].runningCount == desired_count
          - final_status.services[0].deployments | length == 1
        fail_msg: "ECS service is not healthy"
```

## ECS Scaling

```yaml
# playbooks/scale_ecs.yml
# Scale ECS service
- name: Scale ECS service
  hosts: localhost
  connection: local
  tasks:
    - name: Update service desired count
      community.aws.ecs_service:
        name: "{{ app_name }}-service"
        cluster: "{{ ecs_cluster_name }}"
        task_definition: "{{ app_name }}"
        desired_count: "{{ new_count }}"
        state: present
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

Deploying to ECS with Ansible provides infrastructure-as-code for your container workloads on AWS. Task definitions, services, and supporting resources like log groups are all managed declaratively. The combination of Ansible's variable management and ECS's managed container orchestration gives you a deployment pipeline that is both flexible and reliable.
