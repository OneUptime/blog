# How to Create Custom Automation Scripts for Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Automation, Script, API, Bash, Python, Kubernetes

Description: Create custom automation scripts for Rancher using the Rancher API, kubectl, and Python to automate repetitive tasks like namespace provisioning, resource cleanup, compliance checks, and reporting.

## Introduction

While Rancher provides built-in automation through Fleet, Terraform, and the UI, many organizations need custom scripts for organization-specific workflows: onboarding new teams, cleaning up stale resources, generating compliance reports, or integrating with internal tools. The Rancher API and kubectl provide all the hooks needed for powerful automation.

## Step 1: Rancher API Client Setup

```python
# rancher_client.py - Reusable Rancher API client

import requests
import json
import os

class RancherClient:
    def __init__(self, url: str, token: str):
        self.url = url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })
        self.session.verify = False  # Set True in production

    def get(self, path: str) -> dict:
        resp = self.session.get(f'{self.url}{path}')
        resp.raise_for_status()
        return resp.json()

    def post(self, path: str, data: dict) -> dict:
        resp = self.session.post(f'{self.url}{path}', json=data)
        resp.raise_for_status()
        return resp.json()

    def delete(self, path: str) -> None:
        resp = self.session.delete(f'{self.url}{path}')
        resp.raise_for_status()

# Initialize client
client = RancherClient(
    url=os.environ['RANCHER_URL'],
    token=os.environ['RANCHER_TOKEN']
)
```

## Step 2: Namespace Provisioning Script

```python
# provision_team.py - Onboard a new team with namespaces + RBAC

def provision_team(client, cluster_name: str, team_name: str, members: list):
    """Provision a new team with project, namespaces, quotas, and RBAC"""

    # Get cluster ID
    clusters = client.get('/v3/clusters')
    cluster = next(c for c in clusters['data'] if c['name'] == cluster_name)

    # Create project
    project = client.post('/v3/projects', {
        'name': f'{team_name}-project',
        'clusterId': cluster['id'],
        'resourceQuota': {
            'limit': {
                'limitsCpu': '20',
                'limitsMemory': '40Gi',
                'persistentVolumeClaims': '20'
            }
        }
    })

    print(f"Created project: {project['id']}")

    # Create namespaces within the project
    for env in ['production', 'staging']:
        ns_name = f'{team_name}-{env}'
        client.post(f'/v3/cluster/{cluster["id"]}/namespaces', {
            'name': ns_name,
            'projectId': project['id']
        })
        print(f"Created namespace: {ns_name}")

    # Assign team members
    for member_email in members:
        users = client.get(f'/v3/users?email={member_email}')
        if users['data']:
            user = users['data'][0]
            client.post('/v3/projectroletemplatebindings', {
                'projectId': project['id'],
                'roleTemplateId': 'project-member',
                'userId': user['id']
            })
            print(f"Added {member_email} to {team_name}")

# Usage
provision_team(client, 'production', 'payments-team', [
    'alice@company.com',
    'bob@company.com'
])
```

## Step 3: Stale Resource Cleanup Script

```bash
#!/bin/bash
# cleanup_stale_resources.sh
# Delete completed jobs older than 24h and pods in Failed phase across all namespaces

NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  # Delete completed jobs older than 24h
  kubectl get jobs -n "$ns" \
    -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.completionTime}{"\n"}{end}' | \
  while read -r job_name completion_time; do
    if [ -n "$completion_time" ]; then
      age_hours=$(( ($(date +%s) - $(date -d "$completion_time" +%s)) / 3600 ))
      if [ "$age_hours" -gt 24 ]; then
        kubectl delete job "$job_name" -n "$ns"
        echo "Deleted completed job: $job_name in $ns (age: ${age_hours}h)"
      fi
    fi
  done

  # Delete pods in Failed phase (note: CrashLoopBackOff pods stay in Running phase
  # and will not match this selector — handle those separately if needed)
  kubectl get pods -n "$ns" --field-selector=status.phase=Failed \
    -o jsonpath='{.items[*].metadata.name}' | \
  xargs -r kubectl delete pod -n "$ns"
done
```

## Step 4: Compliance Check Script

```python
# compliance_check.py - Check RBAC and security compliance

def check_cluster_compliance(client, cluster_id: str) -> dict:
    """Check cluster for common compliance issues"""
    issues = []

    # Check for cluster-admin bindings
    bindings = client.get(f'/k8s/clusters/{cluster_id}/apis/rbac.authorization.k8s.io/v1/clusterrolebindings')
    admin_bindings = [b for b in bindings['items']
                      if b['roleRef']['name'] == 'cluster-admin'
                      and not b['metadata']['name'].startswith('system:')]

    if admin_bindings:
        issues.append({
            'severity': 'HIGH',
            'check': 'cluster-admin-binding',
            'detail': f"Non-system cluster-admin bindings: {[b['metadata']['name'] for b in admin_bindings]}"
        })

    # Check for namespaces without network policies
    namespaces = client.get(f'/k8s/clusters/{cluster_id}/api/v1/namespaces')
    for ns in namespaces['items']:
        ns_name = ns['metadata']['name']
        if ns_name.startswith('kube-') or ns_name == 'cattle-system':
            continue

        netpols = client.get(f'/k8s/clusters/{cluster_id}/apis/networking.k8s.io/v1/namespaces/{ns_name}/networkpolicies')
        if not netpols['items']:
            issues.append({
                'severity': 'MEDIUM',
                'check': 'missing-network-policy',
                'detail': f"Namespace {ns_name} has no network policies"
            })

    return {'cluster': cluster_id, 'issues': issues, 'pass': len(issues) == 0}
```

## Step 5: Scheduled Reporting

```yaml
# CronJob for weekly compliance report
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-compliance-report
  namespace: cattle-system
spec:
  schedule: "0 8 * * 1"    # Monday at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-reporter
          containers:
            - name: reporter
              image: myregistry/rancher-compliance:1.0.0
              command:
                - python
                - /app/generate_report.py
                - --output-bucket=s3://compliance-reports/rancher/
                - --notify-slack=true
              env:
                - name: RANCHER_URL
                  valueFrom:
                    secretKeyRef:
                      name: rancher-api-secret
                      key: url
                - name: RANCHER_TOKEN
                  valueFrom:
                    secretKeyRef:
                      name: rancher-api-secret
                      key: token
          restartPolicy: OnFailure
```

## Conclusion

Custom automation scripts for Rancher leverage the Rancher REST API and kubectl to build organization-specific workflows. A reusable Python client library simplifies API interactions, while bash scripts handle simpler kubectl-based operations. Schedule automation as Kubernetes CronJobs to run without external cron infrastructure. Store scripts in version control, use Kubernetes Secrets for credentials, and run compliance checks on a schedule so issues are caught proactively rather than during audits.
