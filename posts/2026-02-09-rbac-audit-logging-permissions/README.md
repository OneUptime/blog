# How to Implement RBAC Audit Logging for Permission Changes and Access Attempts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Audit, Logging, Security

Description: Learn how to configure comprehensive audit logging for RBAC permission changes and access attempts, enabling security monitoring and compliance tracking in Kubernetes clusters.

---

RBAC changes directly impact cluster security. A misconfigured RoleBinding can grant excessive permissions. A deleted ClusterRole can break critical system components. Unauthorized access attempts might indicate an attack in progress. Audit logging captures these events, creating an immutable record of who did what and when.

Kubernetes audit logging records API server requests at configurable detail levels. For RBAC monitoring, you need to capture permission changes, failed authorization attempts, and successful access to sensitive resources. This data supports security investigations, compliance audits, and detecting privilege escalation attempts.

## Understanding Kubernetes Audit Levels

Kubernetes supports four audit levels:

**None**: No logging for matched requests.

**Metadata**: Log request metadata (user, timestamp, resource) but not request or response bodies.

**Request**: Log metadata and request body, but not response.

**RequestResponse**: Log metadata, request body, and response body. Most detailed but generates large volumes of data.

For RBAC auditing, use RequestResponse for permission changes and Metadata for access attempts.

## Configuring Audit Policy for RBAC Events

Create an audit policy that captures RBAC-relevant events:

```yaml
# rbac-audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all RBAC resource changes at RequestResponse level
- level: RequestResponse
  resources:
  - group: "rbac.authorization.k8s.io"
    resources:
      - roles
      - rolebindings
      - clusterroles
      - clusterrolebindings
  verbs: ["create", "update", "patch", "delete"]

# Log failed authorization attempts (403 responses)
- level: Metadata
  omitStages:
  - RequestReceived
  responseStatus:
    code: 403

# Log access to sensitive resources
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list", "watch"]

# Log ServiceAccount token creation
- level: RequestResponse
  resources:
  - group: ""
    resources: ["serviceaccounts/token"]
  verbs: ["create"]

# Log pod exec and portforward operations
- level: Metadata
  resources:
  - group: ""
    resources: ["pods/exec", "pods/portforward", "pods/attach"]
  verbs: ["create"]

# Default: log everything else at Metadata level
- level: Metadata
  omitStages:
  - RequestReceived
```

Save this policy and configure the API server to use it.

## Enabling Audit Logging on the API Server

For kubeadm clusters, edit `/etc/kubernetes/manifests/kube-apiserver.yaml`:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    # ... other flags

    volumeMounts:
    - name: audit-policy
      mountPath: /etc/kubernetes/audit-policy.yaml
      readOnly: true
    - name: audit-logs
      mountPath: /var/log/kubernetes
  volumes:
  - name: audit-policy
    hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
  - name: audit-logs
    hostPath:
      path: /var/log/kubernetes
      type: DirectoryOrCreate
```

Copy the audit policy file:

```bash
sudo cp rbac-audit-policy.yaml /etc/kubernetes/audit-policy.yaml
sudo systemctl restart kubelet
```

Verify audit logging is working:

```bash
sudo tail -f /var/log/kubernetes/audit.log
```

## Querying RBAC Permission Changes

Search audit logs for RBAC modifications:

```bash
# Find all RoleBinding creations
jq 'select(.objectRef.resource=="rolebindings" and .verb=="create")' \
  /var/log/kubernetes/audit.log

# Extract details
jq 'select(.objectRef.resource=="rolebindings" and .verb=="create") |
    {
      timestamp: .timestamp,
      user: .user.username,
      namespace: .objectRef.namespace,
      binding: .objectRef.name,
      subjects: .requestObject.subjects,
      role: .requestObject.roleRef
    }' /var/log/kubernetes/audit.log
```

Find ClusterRole modifications:

```bash
# Who is modifying ClusterRoles?
jq 'select(.objectRef.resource=="clusterroles" and
           .verb in ["update", "patch", "delete"]) |
    {user: .user.username, role: .objectRef.name, verb: .verb, time: .timestamp}' \
  /var/log/kubernetes/audit.log
```

## Detecting Failed Authorization Attempts

Failed authorization (403 responses) indicates users attempting unauthorized actions:

```bash
# Find all 403 responses
jq 'select(.responseStatus.code==403)' /var/log/kubernetes/audit.log

# Group by user
jq 'select(.responseStatus.code==403) |
    {user: .user.username, resource: .objectRef.resource, verb: .verb}' \
  /var/log/kubernetes/audit.log | \
  jq -s 'group_by(.user) | map({user: .[0].user, count: length})'
```

Frequent 403 responses from a single user might indicate:
- Misconfigured permissions (needs RBAC adjustment)
- Privilege escalation attempt (security concern)
- Automated tool with incorrect permissions (needs investigation)

## Monitoring Privilege Escalation Attempts

Detect attempts to create cluster-admin bindings:

```bash
# Find attempts to bind cluster-admin role
jq 'select(.objectRef.resource in ["rolebindings", "clusterrolebindings"] and
           .requestObject.roleRef.name=="cluster-admin")' \
  /var/log/kubernetes/audit.log
```

Find users creating bindings they should not:

```bash
# Users creating ClusterRoleBindings (should only be admins)
jq 'select(.objectRef.resource=="clusterrolebindings" and
           .verb=="create" and
           .user.username != "system:admin")' \
  /var/log/kubernetes/audit.log
```

## Tracking Secret Access

Monitor who accesses secrets:

```bash
# Find secret access events
jq 'select(.objectRef.resource=="secrets" and
           .verb in ["get", "list"])' \
  /var/log/kubernetes/audit.log

# Group by user and secret
jq 'select(.objectRef.resource=="secrets" and .verb=="get") |
    {user: .user.username, secret: .objectRef.name, namespace: .objectRef.namespace}' \
  /var/log/kubernetes/audit.log | \
  jq -s 'group_by(.user) | map({user: .[0].user, secrets: map(.secret) | unique})'
```

## Implementing Real-Time RBAC Alerts

Use audit sinks to send audit events to external systems in real-time:

```yaml
# audit-sink.yaml
apiVersion: auditregistration.k8s.io/v1alpha1
kind: AuditSink
metadata:
  name: rbac-alert-sink
spec:
  policy:
    level: RequestResponse
    stages:
    - ResponseComplete
  webhook:
    throttle:
      qps: 10
      burst: 15
    clientConfig:
      url: "https://alerting-system.company.com/audit"
      # or use service reference for in-cluster endpoint
```

Build a webhook receiver that processes audit events:

```python
# audit-webhook-receiver.py
from flask import Flask, request
import json

app = Flask(__name__)

ALERT_CONDITIONS = {
    'cluster_admin_binding': {
        'resource': 'clusterrolebindings',
        'roleRef': 'cluster-admin',
        'verb': 'create'
    },
    'clusterrole_deletion': {
        'resource': 'clusterroles',
        'verb': 'delete'
    }
}

@app.route('/audit', methods=['POST'])
def handle_audit():
    events = request.json.get('items', [])

    for event in events:
        check_alerts(event)

    return {'status': 'ok'}

def check_alerts(event):
    obj_ref = event.get('objectRef', {})
    verb = event.get('verb')
    user = event.get('user', {}).get('username')

    # Check for cluster-admin binding creation
    if (obj_ref.get('resource') == 'clusterrolebindings' and
        verb == 'create' and
        event.get('requestObject', {}).get('roleRef', {}).get('name') == 'cluster-admin'):

        send_alert(f"CRITICAL: User {user} created cluster-admin binding")

    # Check for ClusterRole deletion
    if obj_ref.get('resource') == 'clusterroles' and verb == 'delete':
        send_alert(f"WARNING: User {user} deleted ClusterRole {obj_ref.get('name')}")

def send_alert(message):
    # Integrate with Slack, PagerDuty, etc.
    print(f"ALERT: {message}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy the webhook receiver and apply the AuditSink.

## Building RBAC Audit Dashboards

Create Grafana dashboards using audit log data. First, ship audit logs to Loki:

```yaml
# promtail-config.yaml
scrape_configs:
- job_name: kubernetes-audit
  static_configs:
  - targets:
    - localhost
    labels:
      job: kubernetes-audit
      __path__: /var/log/kubernetes/audit.log

  pipeline_stages:
  - json:
      expressions:
        user: user.username
        verb: verb
        resource: objectRef.resource
        status_code: responseStatus.code
  - labels:
      user:
      verb:
      resource:
```

Query audit logs in Grafana:

```logql
# RBAC changes over time
{job="kubernetes-audit"} | json | resource=~"roles|rolebindings|clusterroles|clusterrolebindings"

# Failed authorization attempts
{job="kubernetes-audit"} | json | status_code="403"

# Secret access patterns
{job="kubernetes-audit"} | json | resource="secrets" | verb=~"get|list"
```

## Generating Compliance Reports

Create periodic reports of RBAC changes:

```bash
#!/bin/bash
# generate-rbac-report.sh

START_DATE=$1
END_DATE=$2

if [ -z "$START_DATE" ] || [ -z "$END_DATE" ]; then
  echo "Usage: $0 <start-date> <end-date>"
  echo "Example: $0 2026-02-01 2026-02-28"
  exit 1
fi

echo "RBAC Audit Report: $START_DATE to $END_DATE"
echo "========================================"

echo ""
echo "## RoleBinding Changes"
jq -r "select(.timestamp >= \"${START_DATE}\" and .timestamp <= \"${END_DATE}\" and
              .objectRef.resource==\"rolebindings\" and
              .verb in [\"create\", \"update\", \"delete\"]) |
       \"\\(.timestamp) | \\(.user.username) | \\(.verb) | \\(.objectRef.namespace)/\\(.objectRef.name)\"" \
  /var/log/kubernetes/audit.log | column -t -s '|'

echo ""
echo "## ClusterRoleBinding Changes"
jq -r "select(.timestamp >= \"${START_DATE}\" and .timestamp <= \"${END_DATE}\" and
              .objectRef.resource==\"clusterrolebindings\" and
              .verb in [\"create\", \"update\", \"delete\"]) |
       \"\\(.timestamp) | \\(.user.username) | \\(.verb) | \\(.objectRef.name)\"" \
  /var/log/kubernetes/audit.log | column -t -s '|'

echo ""
echo "## Failed Authorization Attempts"
jq -r "select(.timestamp >= \"${START_DATE}\" and .timestamp <= \"${END_DATE}\" and
              .responseStatus.code==403) |
       \"\\(.user.username) | \\(.verb) | \\(.objectRef.resource)\"" \
  /var/log/kubernetes/audit.log | sort | uniq -c | sort -rn

echo ""
echo "## Secret Access Summary"
jq -r "select(.timestamp >= \"${START_DATE}\" and .timestamp <= \"${END_DATE}\" and
              .objectRef.resource==\"secrets\" and .verb==\"get\") |
       \"\\(.user.username) | \\(.objectRef.namespace)/\\(.objectRef.name)\"" \
  /var/log/kubernetes/audit.log | sort | uniq -c | sort -rn
```

Run monthly:

```bash
./generate-rbac-report.sh 2026-02-01 2026-02-28 > rbac-report-2026-02.txt
```

## Retaining Audit Logs for Compliance

Many compliance frameworks require audit log retention:

- SOC 2: Minimum 1 year
- PCI DSS: Minimum 1 year, immediately available for 3 months
- HIPAA: Minimum 6 years

Configure log rotation and archival:

```bash
# /etc/logrotate.d/kubernetes-audit
/var/log/kubernetes/audit.log {
    daily
    rotate 365
    compress
    delaycompress
    notifempty
    missingok
    create 0600 root root
    postrotate
        # Ship to long-term storage
        aws s3 cp /var/log/kubernetes/audit.log.1.gz \
          s3://company-audit-logs/kubernetes/$(date +%Y/%m/%d)/
    endscript
}
```

## Protecting Audit Logs from Tampering

Audit logs must be immutable for compliance. Use:

**Write-Only Storage**: Configure audit backend to write to append-only storage.

**Separate Log Aggregation**: Ship logs to external system (Splunk, Elasticsearch) immediately.

**Log Signing**: Sign audit log entries cryptographically.

```bash
# Example: Sign audit logs with GPG
tail -f /var/log/kubernetes/audit.log | while read line; do
  echo "$line" | gpg --clearsign >> /secure/audit/audit-signed.log
done
```

RBAC audit logging transforms opaque permission systems into observable security controls. By capturing permission changes, failed access attempts, and sensitive resource access, you create an audit trail that supports security investigations, compliance requirements, and detecting attacks before they cause damage. Regular review of audit logs and automated alerting ensures RBAC configurations remain secure as clusters evolve.
