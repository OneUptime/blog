# How to Implement Ansible Tower/AWX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Ansible Tower, Automation Platform, DevOps, Enterprise Automation

Description: Deploy and configure AWX (the upstream project for automation controller, formerly Ansible Tower) for enterprise automation with web UI, RBAC, job scheduling, and API-driven workflows.

---

Automation controller (formerly Ansible Tower) and AWX (open-source upstream) provide a web-based interface and API for managing Ansible automation at scale. They add features essential for enterprise use: role-based access control, job scheduling, credential management, and audit logging. AWX transforms command-line Ansible into a self-service automation platform.

This guide covers deploying AWX and configuring it for production use.

## AWX vs Automation Controller

Automation controller is derived from selected, hardened AWX releases and is included with Red Hat Ansible Automation Platform. The products differ in support and packaging:

| Feature | AWX | Automation Controller |
|---------|-----|---------------|
| License | Apache 2.0 | Commercial |
| Support | Community | Red Hat |
| Updates | Fast-moving upstream releases | Enterprise product releases |
| Scaling | Community-managed | Supported with automation mesh |
| Best for | Development, small teams | Enterprise production |

## Deploying AWX on Kubernetes

AWX runs best on Kubernetes using the AWX Operator.

```bash
# Create a kustomization.yaml file with a specific release tag

# Find the latest release at: https://github.com/ansible/awx-operator/releases
cat << 'EOF' > kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - github.com/ansible/awx-operator/config/default?ref=2.19.1
images:
  - name: quay.io/ansible/awx-operator
    newTag: 2.19.1
namespace: awx
EOF

# Install AWX Operator using kustomize (recommended approach)
kubectl apply -k .

# Wait for operator to be ready
kubectl get pods -n awx -w
```

Create an AWX instance:

```yaml
# awx-instance.yml
---
apiVersion: awx.ansible.com/v1beta1
kind: AWX
metadata:
  name: awx
  namespace: awx
spec:
  # Basic settings
  service_type: ClusterIP
  ingress_type: ingress
  hostname: awx.example.com
  service_labels: |
    monitoring: awx

  # Admin user
  admin_user: admin
  admin_password_secret: awx-admin-password

  # PostgreSQL settings
  postgres_storage_class: standard
  postgres_storage_requirements:
    requests:
      storage: 10Gi

  # Resource limits
  web_resource_requirements:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi

  task_resource_requirements:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

  # Persistent storage for projects
  projects_persistence: true
  projects_storage_class: standard
  projects_storage_size: 10Gi
```

```bash
# Create admin password secret
kubectl create secret generic awx-admin-password \
  -n awx \
  --from-literal=password='SecurePassword123!'

# Deploy AWX
kubectl apply -f awx-instance.yml

# Monitor deployment
kubectl logs -f deployment/awx-operator-controller-manager -c awx-manager -n awx
```

## Initial Configuration

After deployment, configure AWX through the web UI or API.

### Creating Organizations

```bash
# Using the AWX CLI or API
# Install the AWX CLI
pip install awxkit

# Configure authentication
export CONTROLLER_HOST=https://awx.example.com
export CONTROLLER_USERNAME=admin
export CONTROLLER_PASSWORD=SecurePassword123!
```

```bash
# Create organization
awx organizations create \
  --name "Operations" \
  --description "Operations team organization"

# Create team
awx teams create \
  --name "DevOps" \
  --organization "Operations"
```

### Setting Up Credentials

```bash
# Machine credential (SSH)
awx credentials create \
  --name "Production Servers" \
  --organization "Operations" \
  --credential_type "Machine" \
  --inputs '{"username": "deploy", "ssh_key_data": "@~/.ssh/deploy_key"}'

# Source Control credential (Git)
awx credentials create \
  --name "GitHub" \
  --organization "Operations" \
  --credential_type "Source Control" \
  --inputs '{"username": "git", "ssh_key_data": "@~/.ssh/github_key"}'

# Vault credential
awx credentials create \
  --name "Ansible Vault" \
  --organization "Operations" \
  --credential_type "Vault" \
  --inputs '{"vault_password": "vault_secret_password"}'
```

### Creating Projects

```bash
# Create project from Git repository
awx projects create \
  --name "Infrastructure Automation" \
  --organization "Operations" \
  --scm_type "git" \
  --scm_url "git@github.com:company/ansible-configs.git" \
  --scm_branch "main" \
  --credential "GitHub" \
  --scm_update_on_launch true
```

### Setting Up Inventories

```bash
# Create static inventory
awx inventories create \
  --name "Production" \
  --organization "Operations"

# Add hosts
awx hosts create \
  --name "web1.example.com" \
  --inventory "Production" \
  --variables '{"http_port": 80}'

# Add groups
awx groups create \
  --name "webservers" \
  --inventory "Production"

# Add host to group
awx hosts associate \
  --host "web1.example.com" \
  --group "webservers"
```

### Creating Job Templates

```bash
# Create job template
awx job_templates create \
  --name "Deploy Application" \
  --project "Infrastructure Automation" \
  --playbook "playbooks/deploy.yml" \
  --inventory "Production" \
  --credential "Production Servers" \
  --vault_credential 42 \
  --ask_variables_on_launch true \
  --extra_vars '{"app_version": "latest"}'
```

Replace `42` with the numeric ID of the vault credential.

## Role-Based Access Control

Configure permissions for teams and users.

```yaml
# RBAC configuration via API
# POST /api/v2/teams/<team_id>/roles/

# Grant team access to inventory
{
  "id": 21,
  "associate": true
}

# Grant job template execute permission
# POST /api/v2/teams/<team_id>/roles/
{
  "id": 34,
  "associate": true
}
```

```bash
# Using awx-cli
# Grant team admin access to project
awx teams grant "DevOps" \
  --project "Infrastructure Automation" \
  --role admin

# Grant execute permission on job template
awx teams grant "DevOps" \
  --job_template "Deploy Application" \
  --role execute
```

## Dynamic Inventory

Configure cloud provider inventory sources.

```yaml
# AWS EC2 dynamic inventory source
# inventory_source.yml
---
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2
keyed_groups:
  - key: tags.Environment
    prefix: env
  - key: instance_type
    prefix: type
filters:
  instance-state-name: running
compose:
  ansible_host: public_ip_address
```

```bash
# Create inventory source in AWX
awx inventory_sources create \
  --name "AWS EC2" \
  --inventory "Production" \
  --source "ec2" \
  --credential "AWS Credentials" \
  --update_on_launch true \
  --overwrite true
```

## Workflow Templates

Chain multiple job templates together.

```mermaid
graph LR
    A[Deploy Database] --> B{Success?}
    B -->|Yes| C[Deploy App]
    B -->|No| D[Rollback]
    C --> E{Success?}
    E -->|Yes| F[Notify Success]
    E -->|No| D
    D --> G[Notify Failure]
```

```bash
# Create workflow template
awx workflow_job_templates create \
  --name "Full Deployment" \
  --organization "Operations" \
  --ask_variables_on_launch true

# Add workflow nodes
awx workflow_job_template_nodes create \
  --workflow_job_template "Full Deployment" \
  --unified_job_template "Deploy Database"

awx workflow_job_template_nodes create \
  --workflow_job_template "Full Deployment" \
  --unified_job_template "Deploy Application"

# Link nodes with success/failure paths
# (This is typically done through the UI for complex workflows)
```

## Scheduling Jobs

Automate recurring tasks with schedules.

```bash
# Create schedule for nightly backups
awx schedules create \
  --name "Nightly Backup" \
  --unified_job_template 12 \
  --rrule "DTSTART:20260125T020000Z RRULE:FREQ=DAILY;INTERVAL=1"

# Weekly security scan
awx schedules create \
  --name "Weekly Security Scan" \
  --unified_job_template 13 \
  --rrule "DTSTART:20260125T060000Z RRULE:FREQ=WEEKLY;BYDAY=SU"
```

Replace `12` and `13` with the numeric IDs of the job templates to schedule.

## API Integration

Trigger jobs from external systems.

```python
# Python example using requests
import time
import requests

AWX_URL = "https://awx.example.com"
TOKEN = "your_api_token"

def launch_job(template_id, extra_vars=None):
    """Launch a job template via AWX API"""
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {}
    if extra_vars:
        payload["extra_vars"] = extra_vars

    response = requests.post(
        f"{AWX_URL}/api/v2/job_templates/{template_id}/launch/",
        headers=headers,
        json=payload
    )

    if response.status_code == 201:
        job = response.json()
        return job["id"]
    else:
        raise Exception(f"Failed to launch job: {response.text}")

def wait_for_job(job_id):
    """Wait for job completion and return status"""
    headers = {"Authorization": f"Bearer {TOKEN}"}

    while True:
        response = requests.get(
            f"{AWX_URL}/api/v2/jobs/{job_id}/",
            headers=headers
        )
        job = response.json()

        if job["status"] in ["successful", "failed", "error", "canceled"]:
            return job["status"]

        time.sleep(5)

# Launch deployment
job_id = launch_job(
    template_id=5,
    extra_vars={"app_version": "v1.2.0"}
)
print(f"Launched job {job_id}")

status = wait_for_job(job_id)
print(f"Job completed with status: {status}")
```

## CI/CD Integration

Integrate AWX with your CI/CD pipeline.

```yaml
# .github/workflows/deploy.yml
name: Deploy with AWX

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger AWX Deployment
        id: launch
        run: |
          JOB_ID=$(curl -s -X POST \
            -H "Authorization: Bearer ${{ secrets.AWX_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"extra_vars": {"app_version": "${{ github.sha }}"}}' \
            "${{ secrets.AWX_URL }}/api/v2/job_templates/5/launch/" \
            | jq -r '.id')
          echo "job_id=$JOB_ID" >> "$GITHUB_OUTPUT"

      - name: Wait for deployment
        run: |
          # Poll job status until complete
          JOB_ID="${{ steps.launch.outputs.job_id }}"

          while true; do
            STATUS=$(curl -s \
              -H "Authorization: Bearer ${{ secrets.AWX_TOKEN }}" \
              "${{ secrets.AWX_URL }}/api/v2/jobs/$JOB_ID/" \
              | jq -r '.status')

            echo "Job status: $STATUS"

            if [ "$STATUS" = "successful" ]; then
              exit 0
            elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "error" ]; then
              exit 1
            fi

            sleep 10
          done
```

## Backup and Recovery

Protect your AWX configuration.

```bash
# Create an AWXBackup custom resource
cat << 'EOF' > awx-backup.yml
---
apiVersion: awx.ansible.com/v1beta1
kind: AWXBackup
metadata:
  name: awxbackup-2026-01-25
  namespace: awx
spec:
  deployment_name: awx
EOF

kubectl apply -f awx-backup.yml

# Export configuration as code
awx export > awx-config-backup.json

# Restore from backup
cat << 'EOF' > awx-restore.yml
---
apiVersion: awx.ansible.com/v1beta1
kind: AWXRestore
metadata:
  name: awxrestore-2026-01-25
  namespace: awx
spec:
  deployment_name: awx
  backup_name: awxbackup-2026-01-25
EOF

kubectl apply -f awx-restore.yml
```

## Monitoring AWX

Track job execution and system health.

```yaml
# Prometheus ServiceMonitor for AWX metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: awx
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - awx
  selector:
    matchLabels:
      monitoring: awx
  endpoints:
    - port: http
      path: /api/v2/metrics/
      interval: 30s
      authorization:
        type: Bearer
        credentials:
          name: awx-prometheus-token
          key: token
```

---

AWX transforms Ansible from a powerful command-line tool into an enterprise automation platform. The web interface makes automation accessible to operations teams who may not be comfortable with CLIs, while the API enables integration with CI/CD pipelines and ticketing systems. Start with basic job templates, add RBAC as your team grows, and leverage workflows for complex multi-step deployments.
