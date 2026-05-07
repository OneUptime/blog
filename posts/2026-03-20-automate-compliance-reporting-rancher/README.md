# How to Automate Compliance Reporting in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Compliance, Reporting, CIS, SOC2, Kubernetes, Automation

Description: Automate compliance reporting in Rancher for SOC 2, PCI-DSS, and HIPAA using CIS benchmark scans, RBAC audits, vulnerability reports, and automated report generation for auditors and security teams.

## Introduction

Compliance reporting in Kubernetes environments is time-consuming when done manually. Security teams spend weeks before audits gathering evidence: CIS benchmark results, access control lists, audit logs, vulnerability scan reports, and network policy configurations. Automating this evidence collection and report generation reduces audit preparation time from weeks to minutes.

## Step 1: CIS Benchmark Automated Reports

```yaml
# Schedule a monthly Rancher compliance scan. Leaving scanProfileName
# unset lets the operator choose the default profile for the cluster.
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: monthly-compliance-scan
spec:
  scheduledScanConfig:
    cronSchedule: "0 2 1 * *"    # First of every month
    retentionCount: 12
```

## Step 2: RBAC Compliance Report

```python
# rbac_compliance_report.py
import subprocess
import json
from datetime import datetime, timezone

def generate_rbac_report(cluster_contexts: list) -> dict:
    report = {
        'generated': datetime.now(timezone.utc).isoformat(),
        'clusters': {}
    }

    for ctx in cluster_contexts:
        cluster_data = {
            'cluster_admin_bindings': [],
            'privileged_pods': [],
            'service_accounts_with_cluster_roles': []
        }

        # Find cluster-admin bindings
        result = subprocess.run([
            'kubectl', '--context', ctx,
            'get', 'clusterrolebindings',
            '-o', 'json'
        ], capture_output=True, text=True, check=True)

        bindings = json.loads(result.stdout)
        for binding in bindings['items']:
            if binding['roleRef']['name'] == 'cluster-admin':
                if not binding['metadata']['name'].startswith('system:'):
                    cluster_data['cluster_admin_bindings'].append({
                        'name': binding['metadata']['name'],
                        'subjects': binding.get('subjects', [])
                    })
            for subject in binding.get('subjects', []):
                if subject.get('kind') == 'ServiceAccount':
                    cluster_data['service_accounts_with_cluster_roles'].append({
                        'binding_kind': 'ClusterRoleBinding',
                        'binding': binding['metadata']['name'],
                        'namespace': subject.get('namespace'),
                        'name': subject.get('name'),
                        'cluster_role': binding['roleRef']['name']
                    })

        # Find namespaced RoleBindings that reference ClusterRoles
        result = subprocess.run([
            'kubectl', '--context', ctx,
            'get', 'rolebindings', '-A',
            '-o', 'json'
        ], capture_output=True, text=True, check=True)

        bindings = json.loads(result.stdout)
        for binding in bindings['items']:
            if binding['roleRef'].get('kind') != 'ClusterRole':
                continue
            for subject in binding.get('subjects', []):
                if subject.get('kind') == 'ServiceAccount':
                    cluster_data['service_accounts_with_cluster_roles'].append({
                        'binding_kind': 'RoleBinding',
                        'binding': binding['metadata']['name'],
                        'namespace': subject.get('namespace', binding['metadata']['namespace']),
                        'name': subject.get('name'),
                        'cluster_role': binding['roleRef']['name']
                    })

        # Find privileged pods
        result = subprocess.run([
            'kubectl', '--context', ctx,
            'get', 'pods', '-A',
            '-o', 'json'
        ], capture_output=True, text=True, check=True)

        pods = json.loads(result.stdout)
        for pod in pods['items']:
            containers = (
                pod['spec'].get('initContainers', []) +
                pod['spec'].get('containers', []) +
                pod['spec'].get('ephemeralContainers', [])
            )
            for container in containers:
                if container.get('securityContext', {}).get('privileged'):
                    cluster_data['privileged_pods'].append({
                        'namespace': pod['metadata']['namespace'],
                        'pod': pod['metadata']['name'],
                        'container': container['name']
                    })

        report['clusters'][ctx] = cluster_data

    return report
```

## Step 3: Vulnerability Compliance Summary

```yaml
# CronJob to generate weekly vulnerability compliance report
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vuln-compliance-report
  namespace: trivy-system
spec:
  schedule: "0 7 * * 1"    # Monday mornings
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-report-sa
          containers:
            - name: reporter
              image: myregistry/compliance-reporter:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Aggregate vulnerability data from Trivy Operator
                  kubectl get vulnerabilityreports -A -o json | \
                    python3 /scripts/generate_vuln_report.py \
                    --format pdf \
                    --output /tmp/vuln-report-$(date +%Y%m%d).pdf

                  # Upload to compliance storage
                  aws s3 cp /tmp/vuln-report-$(date +%Y%m%d).pdf \
                    s3://compliance-reports/vulnerabilities/

                  # Send notification
                  curl -X POST "$SLACK_WEBHOOK" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\": \"Weekly vulnerability compliance report generated: $(date)\"}"
          restartPolicy: OnFailure
```

## Step 4: Audit Log Report

```python
# audit_log_analysis.py - Analyze K8s audit logs for compliance
import json

def analyze_audit_logs(log_file: str) -> dict:
    """Extract compliance-relevant events from audit log"""
    findings = {
        'pod_exec': [],
        'secret_access': [],
        'rbac_changes': [],
        'failed_auth': [],
        'admin_activity': []
    }

    with open(log_file, encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue

            entry = json.loads(line)
            user = entry.get('user', {}).get('username', 'unknown')
            groups = entry.get('user', {}).get('groups', [])
            object_ref = entry.get('objectRef', {})

            # Track exec into pods
            if (entry.get('verb') == 'create' and
                object_ref.get('subresource') == 'exec'):
                findings['pod_exec'].append({
                    'timestamp': entry['requestReceivedTimestamp'],
                    'user': user,
                    'namespace': object_ref.get('namespace'),
                    'pod': object_ref.get('name')
                })

            # Track secret access
            if (object_ref.get('resource') == 'secrets' and
                entry.get('verb') in ['get', 'list']):
                findings['secret_access'].append({
                    'timestamp': entry['requestReceivedTimestamp'],
                    'user': user,
                    'namespace': object_ref.get('namespace'),
                    'secret': object_ref.get('name')
                })

            # Track RBAC changes
            if object_ref.get('apiGroup') == 'rbac.authorization.k8s.io':
                if entry.get('verb') in ['create', 'update', 'patch', 'delete']:
                    findings['rbac_changes'].append({
                        'timestamp': entry['requestReceivedTimestamp'],
                        'user': user,
                        'action': f"{entry['verb']} {object_ref['resource']}/{object_ref.get('name')}"
                    })

            # Track failed authentication attempts
            if entry.get('responseStatus', {}).get('code') == 401:
                findings['failed_auth'].append({
                    'timestamp': entry['requestReceivedTimestamp'],
                    'user': user,
                    'request': entry.get('requestURI')
                })

            # Track activity by cluster-admin users
            if user == 'system:admin' or 'system:masters' in groups:
                findings['admin_activity'].append({
                    'timestamp': entry['requestReceivedTimestamp'],
                    'user': user,
                    'verb': entry.get('verb'),
                    'request': entry.get('requestURI')
                })

    return findings
```

## Step 5: Automated Evidence Collection

```bash
#!/bin/bash
# collect_audit_evidence.sh - Gather all compliance evidence

EVIDENCE_DIR="/tmp/audit-evidence-$(date +%Y%m%d)"
mkdir -p "$EVIDENCE_DIR"

echo "Collecting compliance evidence..."

# 1. Cluster configuration
kubectl cluster-info dump --all-namespaces \
  --output-directory="$EVIDENCE_DIR/cluster-info"

# 2. RBAC configuration
kubectl get clusterrolebindings -o json > "$EVIDENCE_DIR/clusterrolebindings.json"
kubectl get rolebindings -A -o json > "$EVIDENCE_DIR/rolebindings.json"

# 3. Network policies
kubectl get networkpolicies -A -o json > "$EVIDENCE_DIR/networkpolicies.json"

# 4. Pod security configuration (including Pod Security Admission labels)
kubectl get namespaces -o json > "$EVIDENCE_DIR/namespaces.json"

# 5. Secret encryption evidence (self-managed control planes)
kubectl -n kube-system get pods -l component=kube-apiserver -o json \
  > "$EVIDENCE_DIR/kube-apiserver-pods.json"
printf '%s\n' \
  "Verify --encryption-provider-config in kube-apiserver command or args as described in the Kubernetes encryption-at-rest documentation." \
  > "$EVIDENCE_DIR/encryption-at-rest-check.txt"

# 6. Vulnerability reports
kubectl get vulnerabilityreports -A -o json > "$EVIDENCE_DIR/vulnerability-reports.json"

# 7. Compliance scan results
kubectl get clusterscanreports.compliance.cattle.io -o json \
  > "$EVIDENCE_DIR/compliance-scan-reports.json"

# Package evidence
tar czf "audit-evidence-$(date +%Y%m%d).tar.gz" \
  -C /tmp "$(basename "$EVIDENCE_DIR")"
aws s3 cp "audit-evidence-$(date +%Y%m%d).tar.gz" s3://audit-evidence/

echo "Evidence collected: audit-evidence-$(date +%Y%m%d).tar.gz"
```

## Step 6: Executive Compliance Dashboard

```yaml
# Grafana dashboard panels for executive reporting
# Using data from Trivy Operator + CIS Benchmark

panels:
  - title: "Overall Compliance Score"
    type: stat
    targets:
      - expr: |
          (sum(compliance_scan_num_tests_pass{scan_name!="manual"}) /
           sum(compliance_scan_num_tests_total{scan_name!="manual"})) * 100

  - title: "Critical Vulnerabilities Trend"
    type: timeseries
    targets:
      - expr: sum(trivy_image_vulnerabilities{severity="Critical"})

  - title: "Clusters Passing CIS Benchmark"
    type: gauge
    targets:
      - expr: |
          count(max by (cluster_name) (
            compliance_scan_num_tests_fail{scan_name!="manual"} == 0
          ))
```

## Compliance Framework Coverage

| Framework | Automated Controls |
|---|---|
| SOC 2 | Access logs, change management, vuln scans |
| PCI-DSS | Network policies, encryption, access control |
| HIPAA | Audit logs, access control, encryption at rest |
| ISO 27001 | RBAC review, patch management, monitoring |

## Conclusion

Automating compliance reporting in Rancher transforms audit preparation from a multi-week manual process into an on-demand click. Schedule CIS benchmark scans monthly, generate RBAC reports weekly, and run vulnerability summaries weekly. When auditors arrive, run the evidence collection script to package all required artifacts. The Grafana compliance dashboard provides continuous visibility for security teams, while automated reports deliver consistent, timestamped evidence that satisfies external auditors.
