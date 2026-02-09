# How to Implement Kubernetes RBAC Audit Reports for Periodic Compliance Reviews

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security, Compliance, Audit, Access Control

Description: Generate automated RBAC audit reports for Kubernetes clusters that identify excessive permissions, unused roles, and privilege escalation risks to support periodic compliance reviews and security audits.

---

Kubernetes RBAC configurations accumulate over time as teams add roles, bindings, and service accounts for various purposes. Without regular auditing, you end up with orphaned roles, excessive permissions, and privilege creep that violates the principle of least privilege. Manual RBAC audits don't scale and miss subtle permission issues.

Automated RBAC audit reports transform ad-hoc permission reviews into systematic compliance processes. Regular reports identify overly permissive roles, detect unused bindings, highlight privilege escalation risks, and track changes over time. These reports become essential artifacts for security audits and compliance reviews.

## Understanding RBAC Audit Requirements

RBAC audits answer several critical questions. Which service accounts have cluster-admin privileges? Which roles grant wildcard permissions on sensitive resources? Are there unused role bindings that should be cleaned up? Which users can create or modify RBAC objects themselves? How have permissions changed since the last audit?

Compliance frameworks like SOC2, ISO 27001, and PCI-DSS require periodic access reviews demonstrating that permissions follow least privilege. Audit reports provide documented evidence of these reviews.

## Building an RBAC Analysis Tool

Create a tool that analyzes RBAC configurations and generates audit reports:

```python
# rbac-audit.py
#!/usr/bin/env python3

import subprocess
import json
from datetime import datetime
from collections import defaultdict

def get_cluster_roles():
    """Get all ClusterRoles"""
    cmd = "kubectl get clusterroles -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    return json.loads(result.stdout)['items']

def get_roles(namespace=None):
    """Get Roles from namespace or all namespaces"""
    cmd = "kubectl get roles -A -o json" if not namespace else f"kubectl get roles -n {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    return json.loads(result.stdout)['items']

def get_cluster_role_bindings():
    """Get all ClusterRoleBindings"""
    cmd = "kubectl get clusterrolebindings -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    return json.loads(result.stdout)['items']

def get_role_bindings(namespace=None):
    """Get RoleBindings from namespace or all namespaces"""
    cmd = "kubectl get rolebindings -A -o json" if not namespace else f"kubectl get rolebindings -n {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    return json.loads(result.stdout)['items']

def has_wildcard_permissions(role):
    """Check if role has wildcard permissions"""
    wildcards = []
    for rule in role.get('rules', []):
        if '*' in rule.get('verbs', []):
            wildcards.append({
                'type': 'verb',
                'resources': rule.get('resources', []),
                'apiGroups': rule.get('apiGroups', [])
            })
        if '*' in rule.get('resources', []):
            wildcards.append({
                'type': 'resource',
                'verbs': rule.get('verbs', []),
                'apiGroups': rule.get('apiGroups', [])
            })
        if '*' in rule.get('apiGroups', []):
            wildcards.append({
                'type': 'apiGroup',
                'resources': rule.get('resources', []),
                'verbs': rule.get('verbs', [])
            })

    return wildcards

def can_escalate_privileges(role):
    """Check if role can modify RBAC objects"""
    dangerous_permissions = []
    for rule in role.get('rules', []):
        resources = rule.get('resources', [])
        verbs = rule.get('verbs', [])

        rbac_resources = ['roles', 'rolebindings', 'clusterroles', 'clusterrolebindings']

        if any(r in rbac_resources for r in resources):
            if any(v in ['create', 'update', 'patch', 'delete', '*'] for v in verbs):
                dangerous_permissions.append({
                    'resources': resources,
                    'verbs': verbs
                })

    return dangerous_permissions

def find_cluster_admin_access():
    """Find all subjects with cluster-admin access"""
    cluster_admins = []
    bindings = get_cluster_role_bindings()

    for binding in bindings:
        if binding['roleRef']['name'] == 'cluster-admin':
            for subject in binding.get('subjects', []):
                cluster_admins.append({
                    'binding': binding['metadata']['name'],
                    'subject_kind': subject['kind'],
                    'subject_name': subject['name'],
                    'namespace': subject.get('namespace', 'N/A')
                })

    return cluster_admins

def analyze_sensitive_permissions():
    """Analyze roles with access to sensitive resources"""
    sensitive = []
    sensitive_resources = ['secrets', 'configmaps', 'serviceaccounts']

    for role in get_cluster_roles() + get_roles():
        role_name = role['metadata']['name']
        namespace = role['metadata'].get('namespace', 'cluster-wide')

        for rule in role.get('rules', []):
            resources = rule.get('resources', [])
            verbs = rule.get('verbs', [])

            if any(r in sensitive_resources for r in resources):
                sensitive.append({
                    'role': role_name,
                    'namespace': namespace,
                    'resources': resources,
                    'verbs': verbs
                })

    return sensitive

def generate_audit_report():
    """Generate comprehensive RBAC audit report"""
    print("=" * 80)
    print("KUBERNETES RBAC AUDIT REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # Section 1: Cluster Admin Access
    print("\n1. CLUSTER-ADMIN ACCESS")
    print("-" * 80)
    cluster_admins = find_cluster_admin_access()
    if cluster_admins:
        for admin in cluster_admins:
            print(f"  • {admin['subject_kind']:15} {admin['subject_name']:30} (via {admin['binding']})")
    else:
        print("  No cluster-admin bindings found")

    # Section 2: Wildcard Permissions
    print("\n2. WILDCARD PERMISSIONS (HIGH RISK)")
    print("-" * 80)
    wildcard_count = 0
    for role in get_cluster_roles() + get_roles():
        role_name = role['metadata']['name']
        namespace = role['metadata'].get('namespace', 'cluster-wide')
        wildcards = has_wildcard_permissions(role)

        if wildcards:
            wildcard_count += 1
            print(f"  • Role: {role_name} (Namespace: {namespace})")
            for wc in wildcards:
                print(f"    - Wildcard {wc['type']}: {wc}")

    print(f"\n  Total roles with wildcards: {wildcard_count}")

    # Section 3: Privilege Escalation Risks
    print("\n3. PRIVILEGE ESCALATION RISKS")
    print("-" * 80)
    escalation_count = 0
    for role in get_cluster_roles() + get_roles():
        role_name = role['metadata']['name']
        namespace = role['metadata'].get('namespace', 'cluster-wide')
        dangerous = can_escalate_privileges(role)

        if dangerous:
            escalation_count += 1
            print(f"  • Role: {role_name} (Namespace: {namespace})")
            for perm in dangerous:
                print(f"    - Can modify: {perm['resources']} with verbs: {perm['verbs']}")

    print(f"\n  Total roles with escalation capability: {escalation_count}")

    # Section 4: Sensitive Resource Access
    print("\n4. SENSITIVE RESOURCE ACCESS")
    print("-" * 80)
    sensitive = analyze_sensitive_permissions()
    for item in sensitive[:20]:  # Top 20
        print(f"  • {item['role']:30} ({item['namespace']:15}) -> {item['resources']}")

    if len(sensitive) > 20:
        print(f"  ... and {len(sensitive) - 20} more")

    # Section 5: Summary Statistics
    print("\n5. SUMMARY STATISTICS")
    print("-" * 80)
    print(f"  Total ClusterRoles: {len(get_cluster_roles())}")
    print(f"  Total Roles: {len(get_roles())}")
    print(f"  Total ClusterRoleBindings: {len(get_cluster_role_bindings())}")
    print(f"  Total RoleBindings: {len(get_role_bindings())}")
    print(f"  Cluster-Admin Subjects: {len(cluster_admins)}")
    print(f"  High-Risk Roles (Wildcards): {wildcard_count}")
    print(f"  Escalation-Capable Roles: {escalation_count}")

    print("\n" + "=" * 80)
    print("END OF REPORT")
    print("=" * 80)

if __name__ == "__main__":
    generate_audit_report()
```

Run the audit tool:

```bash
chmod +x rbac-audit.py
./rbac-audit.py > rbac-audit-$(date +%Y-%m-%d).txt
```

## Detecting Unused Roles and Bindings

Identify roles and bindings that are never actually used:

```bash
# detect-unused-rbac.sh
#!/bin/bash

echo "Analyzing unused RBAC configurations..."

# Get all ServiceAccounts
echo "Checking for unused ServiceAccounts..."
kubectl get sa --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns sa; do
    # Check if ServiceAccount is used by any pod
    PODS=$(kubectl get pods -n $ns -o json | \
      jq -r --arg sa "$sa" '.items[] | select(.spec.serviceAccountName == $sa) | .metadata.name')

    if [ -z "$PODS" ]; then
      echo "  Unused ServiceAccount: $ns/$sa"
    fi
  done

# Check for unused RoleBindings
echo -e "\nChecking for unused RoleBindings..."
kubectl get rolebindings --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name) \(.subjects[].name // "none")"' | \
  while read ns binding subject; do
    if [ "$subject" != "none" ]; then
      # Check if subject exists
      SA_EXISTS=$(kubectl get sa -n $ns $subject 2>/dev/null)
      if [ -z "$SA_EXISTS" ]; then
        echo "  Orphaned RoleBinding: $ns/$binding (references non-existent $subject)"
      fi
    fi
  done

echo -e "\nUnused RBAC analysis complete"
```

Schedule this analysis:

```yaml
# unused-rbac-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: unused-rbac-detector
  namespace: security
spec:
  schedule: "0 3 * * 0"  # Weekly on Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rbac-auditor
          containers:
          - name: detector
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/detect-unused-rbac.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: rbac-audit-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Tracking RBAC Changes Over Time

Monitor RBAC modifications to detect suspicious changes:

```yaml
# rbac-change-auditing.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all RBAC changes at RequestResponse level
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # Log privilege escalation attempts
  - level: RequestResponse
    verbs: ["create", "update", "patch"]
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["clusterrolebindings"]
    omitStages:
      - RequestReceived
```

Create alerts for suspicious RBAC changes:

```yaml
# prometheus-rbac-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rbac-change-alerts
  namespace: monitoring
spec:
  groups:
  - name: rbac_security
    interval: 1m
    rules:
    - alert: ClusterAdminBindingCreated
      expr: |
        increase(apiserver_audit_event_total{
          verb=~"create|update",
          objectRef_resource="clusterrolebindings",
          objectRef_name="cluster-admin"
        }[5m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "New cluster-admin binding created"
        description: "A new cluster-admin binding was created"

    - alert: SuspiciousRBACModification
      expr: |
        rate(apiserver_audit_event_total{
          verb=~"create|update|delete",
          objectRef_resource=~"roles|rolebindings|clusterroles|clusterrolebindings"
        }[10m]) > 0.5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of RBAC modifications"
        description: "{{ $value }} RBAC changes per second"
```

## Generating Compliance-Ready Reports

Create formatted reports suitable for compliance auditors:

```python
# compliance-rbac-report.py
#!/usr/bin/env python3

import subprocess
import json
from datetime import datetime

def generate_compliance_report():
    """Generate compliance-focused RBAC report"""

    report = {
        'report_date': datetime.now().isoformat(),
        'cluster': subprocess.run(['kubectl', 'config', 'current-context'],
                                 capture_output=True, text=True).stdout.strip(),
        'findings': [],
        'recommendations': []
    }

    # Finding 1: Excessive Permissions
    result = subprocess.run(['kubectl', 'get', 'clusterroles', '-o', 'json'],
                           capture_output=True, text=True)
    roles = json.loads(result.stdout)['items']

    wildcard_roles = []
    for role in roles:
        for rule in role.get('rules', []):
            if '*' in rule.get('verbs', []) or '*' in rule.get('resources', []):
                wildcard_roles.append(role['metadata']['name'])
                break

    if wildcard_roles:
        report['findings'].append({
            'id': 'RBAC-001',
            'severity': 'High',
            'title': 'Roles with Wildcard Permissions',
            'description': f'{len(wildcard_roles)} roles grant wildcard permissions',
            'affected_roles': wildcard_roles,
            'compliance_impact': 'Violates least privilege principle (SOC2 CC6.1, ISO 27001 A.9.2.3)'
        })
        report['recommendations'].append({
            'finding_id': 'RBAC-001',
            'action': 'Review and restrict permissions to specific resources and verbs',
            'priority': 'High'
        })

    # Finding 2: Cluster-Admin Usage
    result = subprocess.run(['kubectl', 'get', 'clusterrolebindings', '-o', 'json'],
                           capture_output=True, text=True)
    bindings = json.loads(result.stdout)['items']

    admin_subjects = []
    for binding in bindings:
        if binding['roleRef']['name'] == 'cluster-admin':
            for subject in binding.get('subjects', []):
                admin_subjects.append(f"{subject['kind']}/{subject['name']}")

    if len(admin_subjects) > 3:
        report['findings'].append({
            'id': 'RBAC-002',
            'severity': 'Medium',
            'title': 'Excessive Cluster-Admin Access',
            'description': f'{len(admin_subjects)} subjects have cluster-admin privileges',
            'affected_subjects': admin_subjects,
            'compliance_impact': 'May violate segregation of duties requirements'
        })
        report['recommendations'].append({
            'finding_id': 'RBAC-002',
            'action': 'Reduce cluster-admin access to essential administrators only',
            'priority': 'Medium'
        })

    # Output report
    print(json.dumps(report, indent=2))

    # Also create markdown version
    with open(f'rbac-compliance-{datetime.now().strftime("%Y%m%d")}.md', 'w') as f:
        f.write(f"# RBAC Compliance Report\\n\\n")
        f.write(f"**Date:** {report['report_date']}\\n")
        f.write(f"**Cluster:** {report['cluster']}\\n\\n")

        f.write("## Findings\\n\\n")
        for finding in report['findings']:
            f.write(f"### {finding['id']}: {finding['title']}\\n")
            f.write(f"**Severity:** {finding['severity']}\\n\\n")
            f.write(f"{finding['description']}\\n\\n")
            f.write(f"**Compliance Impact:** {finding['compliance_impact']}\\n\\n")

        f.write("## Recommendations\\n\\n")
        for rec in report['recommendations']:
            f.write(f"- **{rec['finding_id']}** ({rec['priority']} priority): {rec['action']}\\n")

if __name__ == "__main__":
    generate_compliance_report()
```

Automated RBAC audit reports transform manual permission reviews into systematic processes that support compliance requirements and security best practices. Regular reporting identifies permission drift, detects excessive privileges, and provides documented evidence of access control reviews. Schedule these audits quarterly for compliance reviews and run ad-hoc reports before security audits.
