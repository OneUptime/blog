# How to Configure Ansible Tower/AWX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Ansible Tower, Automation, DevOps, Kubernetes, CI/CD

Description: A complete guide to installing and configuring Ansible Tower or its open-source alternative AWX for enterprise automation workflows.

---

Ansible Tower (commercial) and AWX (open-source) provide a web-based interface, REST API, and enterprise features for managing Ansible automation at scale. This guide covers installation, configuration, and best practices for both platforms.

## Understanding Tower vs AWX

AWX is the upstream open-source project from which Ansible Tower is derived. Tower adds support, certification, and some enterprise features.

```mermaid
flowchart TB
    subgraph Opensource["Open Source"]
        AWX[AWX Project]
    end

    subgraph Commercial["Commercial"]
        Tower[Ansible Tower]
        AAP[Ansible Automation Platform]
    end

    subgraph Features["Core Features"]
        WebUI[Web Interface]
        API[REST API]
        RBAC[Role-Based Access]
        Schedules[Job Scheduling]
        Inventory[Dynamic Inventory]
        Credentials[Credential Management]
        Notifications[Notifications]
        Workflows[Workflow Automation]
    end

    AWX --> Features
    Tower --> Features
    AAP --> Features

    AWX -->|Upstream| Tower
    Tower -->|Part of| AAP
```

## Installing AWX on Kubernetes

AWX is designed to run on Kubernetes. The AWX Operator is the recommended installation method.

### Prerequisites

- Kubernetes cluster (1.22+)
- kubectl configured
- At least 4GB RAM and 2 CPUs available
- Storage class for persistent volumes

### Install AWX Operator

```bash
# Create namespace for AWX
kubectl create namespace awx

# Install AWX Operator using kubectl
kubectl apply -f https://raw.githubusercontent.com/ansible/awx-operator/main/deploy/awx-operator.yaml
```

Alternatively, use Helm:

```bash
# Add the AWX Operator Helm repository
helm repo add awx-operator https://ansible.github.io/awx-operator/
helm repo update

# Install the operator
helm install awx-operator awx-operator/awx-operator \
  --namespace awx \
  --create-namespace
```

### Deploy AWX Instance

Create a custom resource to define your AWX deployment:

```yaml
# awx-instance.yaml

---
apiVersion: awx.ansible.com/v1beta1
kind: AWX
metadata:
  name: awx
  namespace: awx
spec:
  # Basic configuration
  service_type: ClusterIP

  # Resource allocation
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

  # PostgreSQL database configuration
  postgres_configuration_secret: awx-postgres-configuration

  # Persistent storage
  projects_persistence: true
  projects_storage_class: standard
  projects_storage_size: 10Gi

  # Admin user
  admin_user: admin
  admin_password_secret: awx-admin-password
```

Create the required secrets:

```yaml
# awx-secrets.yaml

---
apiVersion: v1
kind: Secret
metadata:
  name: awx-admin-password
  namespace: awx
type: Opaque
stringData:
  password: "YourSecurePassword123!"

---
apiVersion: v1
kind: Secret
metadata:
  name: awx-postgres-configuration
  namespace: awx
type: Opaque
stringData:
  host: "postgres.database.svc.cluster.local"
  port: "5432"
  database: "awx"
  username: "awx"
  password: "PostgresPassword123!"
  sslmode: "prefer"
  type: "managed"
```

Apply the configuration:

```bash
# Apply secrets first
kubectl apply -f awx-secrets.yaml

# Deploy AWX instance
kubectl apply -f awx-instance.yaml

# Watch the deployment progress
kubectl -n awx get pods -w
```

### Access AWX Web Interface

```bash
# Get the service details
kubectl -n awx get svc

# For local testing, port-forward to access the UI
kubectl -n awx port-forward svc/awx-service 8080:80

# Access at http://localhost:8080
```

For production, configure an Ingress:

```yaml
# awx-ingress.yaml

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: awx-ingress
  namespace: awx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - awx.example.com
      secretName: awx-tls
  rules:
    - host: awx.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: awx-service
                port:
                  number: 80
```

## Configuring Organizations and Teams

AWX uses a hierarchical structure for access control.

```mermaid
flowchart TD
    subgraph Org["Organization: DevOps Team"]
        Team1["Team: Infrastructure"]
        Team2["Team: Application Deploy"]
        Team3["Team: Security"]
    end

    subgraph Users["Users"]
        U1[Admin User]
        U2[Developer 1]
        U3[Developer 2]
        U4[Security Auditor]
    end

    subgraph Resources["Resources"]
        Inv[Inventories]
        Proj[Projects]
        Cred[Credentials]
        Jobs[Job Templates]
    end

    U1 --> Org
    U2 --> Team1
    U3 --> Team2
    U4 --> Team3

    Team1 --> Inv
    Team1 --> Proj
    Team2 --> Jobs
    Team3 --> Cred
```

### Create Organization via API

```bash
# Authenticate and get token
TOKEN=$(curl -s -k -u admin:password https://awx.example.com/api/v2/tokens/ \
  -H "Content-Type: application/json" \
  -d '{"description": "API Token"}' | jq -r '.token')

# Create organization
curl -k -X POST https://awx.example.com/api/v2/organizations/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DevOps Team",
    "description": "Main DevOps organization"
  }'
```

### Create Team

```bash
# Create team within organization
curl -k -X POST https://awx.example.com/api/v2/teams/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Infrastructure",
    "description": "Infrastructure management team",
    "organization": 1
  }'
```

## Setting Up Projects

Projects link AWX to your Git repositories containing Ansible playbooks.

### Create Project via UI or API

```bash
# Create a project linked to Git repository
curl -k -X POST https://awx.example.com/api/v2/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Infrastructure Playbooks",
    "description": "Main infrastructure automation playbooks",
    "organization": 1,
    "scm_type": "git",
    "scm_url": "https://github.com/myorg/ansible-playbooks.git",
    "scm_branch": "main",
    "scm_update_on_launch": true,
    "credential": 1
  }'
```

### Project with SSH Key Authentication

```yaml
# First create an SCM credential for private repos
# Then reference it in the project configuration

# credential-definition.yaml (for ansible CLI setup)
credentials:
  - name: GitHub Deploy Key
    credential_type: Source Control
    organization: DevOps Team
    inputs:
      ssh_key_data: |
        -----BEGIN OPENSSH PRIVATE KEY-----
        ...
        -----END OPENSSH PRIVATE KEY-----
```

## Configuring Inventories

AWX supports static and dynamic inventories.

### Static Inventory

```bash
# Create inventory
curl -k -X POST https://awx.example.com/api/v2/inventories/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Servers",
    "description": "Production environment inventory",
    "organization": 1
  }'

# Add host to inventory
curl -k -X POST https://awx.example.com/api/v2/hosts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web01.example.com",
    "inventory": 1,
    "variables": "ansible_host: 192.168.1.10\nansible_user: ubuntu"
  }'
```

### Dynamic Inventory from AWS

```bash
# Create AWS credential first
curl -k -X POST https://awx.example.com/api/v2/credentials/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS Production",
    "credential_type": 1,
    "organization": 1,
    "inputs": {
      "access_key": "AKIAIOSFODNN7EXAMPLE",
      "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
  }'

# Create inventory source for AWS
curl -k -X POST https://awx.example.com/api/v2/inventory_sources/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS EC2",
    "inventory": 1,
    "source": "ec2",
    "credential": 2,
    "source_vars": "regions:\n  - us-east-1\n  - us-west-2",
    "update_on_launch": true
  }'
```

## Creating Job Templates

Job templates define how playbooks are executed.

```bash
# Create job template
curl -k -X POST https://awx.example.com/api/v2/job_templates/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deploy Web Application",
    "description": "Deploy latest web application to production",
    "job_type": "run",
    "inventory": 1,
    "project": 1,
    "playbook": "deploy-webapp.yml",
    "credential": 1,
    "ask_variables_on_launch": true,
    "extra_vars": "app_version: latest",
    "verbosity": 1
  }'
```

### Survey for User Input

Surveys allow users to provide input when launching jobs:

```bash
# Add survey to job template
curl -k -X PATCH https://awx.example.com/api/v2/job_templates/1/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "survey_enabled": true,
    "survey_spec": {
      "name": "Deployment Survey",
      "description": "Parameters for deployment",
      "spec": [
        {
          "question_name": "Application Version",
          "question_description": "Version to deploy",
          "variable": "app_version",
          "type": "text",
          "required": true,
          "default": "latest"
        },
        {
          "question_name": "Environment",
          "question_description": "Target environment",
          "variable": "target_env",
          "type": "multiplechoice",
          "choices": ["development", "staging", "production"],
          "required": true,
          "default": "staging"
        }
      ]
    }
  }'
```

## Workflow Templates

Workflows chain multiple job templates together.

```mermaid
flowchart LR
    subgraph Workflow["Deployment Workflow"]
        A[Backup Database] -->|Success| B[Deploy Application]
        A -->|Failure| E[Send Alert]
        B -->|Success| C[Run Tests]
        B -->|Failure| D[Rollback]
        C -->|Success| F[Send Success Notification]
        C -->|Failure| D
        D --> E
    end
```

### Create Workflow Template

```bash
# Create workflow template
curl -k -X POST https://awx.example.com/api/v2/workflow_job_templates/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Full Deployment Pipeline",
    "description": "Complete deployment workflow with backup and tests",
    "organization": 1,
    "inventory": 1,
    "survey_enabled": true
  }'
```

### Add Workflow Nodes

```bash
# Add first node (backup)
curl -k -X POST https://awx.example.com/api/v2/workflow_job_template_nodes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_job_template": 1,
    "unified_job_template": 1,
    "identifier": "backup"
  }'

# Add deploy node (runs after successful backup)
curl -k -X POST https://awx.example.com/api/v2/workflow_job_template_nodes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_job_template": 1,
    "unified_job_template": 2,
    "identifier": "deploy"
  }'

# Link nodes (backup success leads to deploy)
curl -k -X POST https://awx.example.com/api/v2/workflow_job_template_nodes/1/success_nodes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 2}'
```

## Scheduling Jobs

Schedule jobs to run automatically.

```bash
# Create schedule for nightly backup
curl -k -X POST https://awx.example.com/api/v2/schedules/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nightly Backup",
    "unified_job_template": 1,
    "rrule": "DTSTART:20240101T020000Z RRULE:FREQ=DAILY;INTERVAL=1",
    "enabled": true
  }'
```

Common schedule patterns:

```
# Every day at 2 AM UTC
DTSTART:20240101T020000Z RRULE:FREQ=DAILY;INTERVAL=1

# Every Monday at 9 AM UTC
DTSTART:20240101T090000Z RRULE:FREQ=WEEKLY;BYDAY=MO

# Every hour
DTSTART:20240101T000000Z RRULE:FREQ=HOURLY;INTERVAL=1

# First day of every month at midnight
DTSTART:20240101T000000Z RRULE:FREQ=MONTHLY;BYMONTHDAY=1
```

## Notifications

Configure notifications for job status updates.

### Slack Notification

```bash
# Create Slack notification template
curl -k -X POST https://awx.example.com/api/v2/notification_templates/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack DevOps Channel",
    "organization": 1,
    "notification_type": "slack",
    "notification_configuration": {
      "channels": ["#devops-alerts"],
      "token": "xoxb-your-slack-token"
    }
  }'
```

### Email Notification

```bash
# Create email notification template
curl -k -X POST https://awx.example.com/api/v2/notification_templates/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Alerts",
    "organization": 1,
    "notification_type": "email",
    "notification_configuration": {
      "host": "smtp.example.com",
      "port": 587,
      "username": "alerts@example.com",
      "password": "smtp-password",
      "use_tls": true,
      "sender": "awx@example.com",
      "recipients": ["devops@example.com"]
    }
  }'
```

### Attach Notification to Job Template

```bash
# Attach notification on failure
curl -k -X POST https://awx.example.com/api/v2/job_templates/1/notification_templates_error/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'

# Attach notification on success
curl -k -X POST https://awx.example.com/api/v2/job_templates/1/notification_templates_success/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

## LDAP/Active Directory Integration

Configure LDAP for user authentication.

```yaml
# AWX settings for LDAP
# Configure via Settings > Authentication > LDAP

AUTH_LDAP_SERVER_URI: "ldaps://ldap.example.com:636"
AUTH_LDAP_BIND_DN: "CN=AWX Service,OU=Service Accounts,DC=example,DC=com"
AUTH_LDAP_BIND_PASSWORD: "service-account-password"
AUTH_LDAP_USER_SEARCH:
  - "OU=Users,DC=example,DC=com"
  - "SCOPE_SUBTREE"
  - "(sAMAccountName=%(user)s)"
AUTH_LDAP_GROUP_SEARCH:
  - "OU=Groups,DC=example,DC=com"
  - "SCOPE_SUBTREE"
  - "(objectClass=group)"
AUTH_LDAP_USER_ATTR_MAP:
  first_name: "givenName"
  last_name: "sn"
  email: "mail"
AUTH_LDAP_USER_FLAGS_BY_GROUP:
  is_superuser:
    - "CN=AWX Admins,OU=Groups,DC=example,DC=com"
AUTH_LDAP_ORGANIZATION_MAP:
  "DevOps Team":
    admins:
      - "CN=DevOps Leads,OU=Groups,DC=example,DC=com"
    users:
      - "CN=DevOps Team,OU=Groups,DC=example,DC=com"
```

## Best Practices

### Credential Management

```mermaid
flowchart TD
    subgraph External["External Secret Stores"]
        Vault[HashiCorp Vault]
        AWS[AWS Secrets Manager]
        Azure[Azure Key Vault]
    end

    subgraph AWX["AWX Credential Management"]
        Cred[Credentials]
        Custom[Custom Credential Types]
        Lookup[Credential Lookup Plugin]
    end

    Vault --> Lookup
    AWS --> Lookup
    Azure --> Lookup
    Lookup --> Cred
    Cred --> Custom
```

### Use Custom Credential Types

```bash
# Create custom credential type for application secrets
curl -k -X POST https://awx.example.com/api/v2/credential_types/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Application Secrets",
    "kind": "cloud",
    "inputs": {
      "fields": [
        {"id": "api_key", "type": "string", "label": "API Key", "secret": true},
        {"id": "api_secret", "type": "string", "label": "API Secret", "secret": true}
      ]
    },
    "injectors": {
      "extra_vars": {
        "app_api_key": "{{ api_key }}",
        "app_api_secret": "{{ api_secret }}"
      }
    }
  }'
```

### Backup AWX Configuration

```bash
# Export AWX configuration using awx-manage (run inside AWX container)
kubectl exec -it deployment/awx-task -n awx -- awx-manage dumpdata \
  --natural-foreign \
  --natural-primary \
  -e contenttypes \
  -e auth.permission \
  > awx-backup.json
```

### Monitor AWX Health

```yaml
# Kubernetes liveness and readiness probes are configured by operator
# Additional monitoring via API

# Check instance health
curl -k https://awx.example.com/api/v2/ping/

# Check job queue
curl -k https://awx.example.com/api/v2/dashboard/ \
  -H "Authorization: Bearer $TOKEN"
```

---

AWX and Ansible Tower provide the enterprise features needed to scale Ansible automation across teams. Start with a basic Kubernetes deployment, then progressively add organizations, projects, and job templates. Use workflows to chain complex operations, schedules for routine tasks, and notifications to keep teams informed. Integrate with LDAP for user management and external secret stores for credential security.
