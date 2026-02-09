# How to Audit Secret Access Events in Kubernetes Audit Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Audit Logs

Description: Learn how to configure Kubernetes audit logging to track Secret access events, detect unauthorized access attempts, and maintain compliance with security policies.

---

Secrets contain your most sensitive data, but without audit logging, you have no visibility into who accessed them or when. When a security incident occurs, you can't determine which secrets were compromised or trace the source of unauthorized access. This creates blind spots in your security posture.

Kubernetes audit logging captures all API server requests, including Secret access. By configuring audit policies, you can track every read, modify, and delete operation on Secrets. This provides the accountability and forensics needed for security investigations and compliance requirements.

In this guide, you'll learn how to enable Kubernetes audit logging, configure policies specific to Secrets, analyze audit events, and set up alerts for suspicious access patterns.

## Understanding Kubernetes Audit Logging

Kubernetes audit logs record API server requests in four stages:

- **RequestReceived**: Initial request received
- **ResponseStarted**: Response headers sent
- **ResponseComplete**: Full response sent
- **Panic**: Panic occurred during request processing

Audit logs capture:
- Who made the request (user, ServiceAccount, or system component)
- What resource was accessed (Secret, ConfigMap, Pod, etc.)
- When the request occurred (timestamp)
- What action was performed (get, list, create, update, delete)
- Whether it succeeded or failed
- Request and response details (optional)

## Enabling Audit Logging

Audit logging requires configuring the kube-apiserver. Methods vary by cluster type.

### For kubeadm Clusters

Create audit policy:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log Secret access at Metadata level
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Don't log system requests
- level: None
  users:
  - system:kube-controller-manager
  - system:kube-scheduler
  - system:serviceaccount:kube-system:generic-garbage-collector

# Log everything else at Metadata level
- level: Metadata
  omitStages:
  - RequestReceived
```

Update kube-apiserver manifest:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: k8s.gcr.io/kube-apiserver:v1.28.0
    command:
    - kube-apiserver
    # Add audit flags
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    volumeMounts:
    # Mount audit policy
    - name: audit-policy
      mountPath: /etc/kubernetes/audit-policy.yaml
      readOnly: true
    # Mount log directory
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

### For Managed Kubernetes (AKS, EKS, GKE)

Enable through cloud provider:

```bash
# GKE
gcloud container clusters update my-cluster \
  --enable-cloud-logging \
  --logging=SYSTEM,WORKLOAD,API

# EKS
eksctl utils update-cluster-logging \
  --cluster=my-cluster \
  --enable-types=all

# AKS
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-azure-monitor-metrics
```

## Detailed Secret Audit Policy

Create a comprehensive audit policy for Secrets:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
- RequestReceived
rules:
# Log Secret access with full request/response for creates and updates
- level: RequestResponse
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["create", "update", "patch"]
  namespaces: ["production", "staging"]

# Log Secret reads at Metadata level (don't log secret values)
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list", "watch"]
  namespaces: ["production", "staging"]

# Log Secret deletions with metadata
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["delete", "deletecollection"]
  namespaces: ["production", "staging"]

# Don't log Secret access from system components
- level: None
  resources:
  - group: ""
    resources: ["secrets"]
  users:
  - system:kube-controller-manager
  - system:kube-scheduler
  userGroups:
  - system:nodes
  - system:serviceaccounts:kube-system

# Log all other resources at Metadata level
- level: Metadata
```

## Understanding Audit Log Format

Audit log entry for Secret access:

```json
{
  "kind": "Event",
  "apiVersion": "audit.k8s.io/v1",
  "level": "Metadata",
  "auditID": "abc123-def456-ghi789",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/production/secrets/database-credentials",
  "verb": "get",
  "user": {
    "username": "system:serviceaccount:production:web-app-sa",
    "uid": "abc-123-def-456",
    "groups": [
      "system:serviceaccounts",
      "system:serviceaccounts:production",
      "system:authenticated"
    ]
  },
  "sourceIPs": [
    "10.0.1.5"
  ],
  "userAgent": "kubelet/v1.28.0",
  "objectRef": {
    "resource": "secrets",
    "namespace": "production",
    "name": "database-credentials",
    "apiVersion": "v1"
  },
  "responseStatus": {
    "metadata": {},
    "code": 200
  },
  "requestReceivedTimestamp": "2026-02-09T10:30:00.123456Z",
  "stageTimestamp": "2026-02-09T10:30:00.234567Z",
  "annotations": {
    "authorization.k8s.io/decision": "allow",
    "authorization.k8s.io/reason": "RBAC: allowed by RoleBinding"
  }
}
```

Key fields:
- `user.username`: Who accessed the Secret
- `verb`: What action (get, list, create, update, delete)
- `objectRef.name`: Which Secret was accessed
- `responseStatus.code`: Whether it succeeded (200) or failed (403, 404)
- `sourceIPs`: Where the request came from
- `annotations`: Authorization decision details

## Querying Audit Logs

Search for specific Secret access:

```bash
# Find all access to a specific Secret
grep '"name":"database-credentials"' /var/log/kubernetes/audit.log | jq .

# Find all Secret access by a ServiceAccount
grep '"username":"system:serviceaccount:production:web-app-sa"' /var/log/kubernetes/audit.log | \
  grep '"resource":"secrets"' | jq .

# Find failed Secret access attempts
grep '"resource":"secrets"' /var/log/kubernetes/audit.log | \
  grep -v '"code":200' | jq .

# Find Secret deletions
grep '"resource":"secrets"' /var/log/kubernetes/audit.log | \
  grep '"verb":"delete"' | jq .

# Count Secret accesses by user
grep '"resource":"secrets"' /var/log/kubernetes/audit.log | \
  jq -r '.user.username' | sort | uniq -c | sort -rn
```

## Analyzing with Elasticsearch and Kibana

Send audit logs to Elasticsearch for analysis:

```yaml
# fluentd-audit-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-audit-config
  namespace: kube-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/kubernetes/audit.log
      pos_file /var/log/audit.log.pos
      tag kubernetes.audit
      <parse>
        @type json
        time_key requestReceivedTimestamp
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.audit>
      @type record_transformer
      <record>
        cluster_name "#{ENV['CLUSTER_NAME']}"
      </record>
    </filter>

    <match kubernetes.audit>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix k8s-audit
      include_tag_key true
      type_name audit
    </match>
```

Kibana queries for Secret access:

```
# All Secret access
objectRef.resource: "secrets"

# Failed Secret access
objectRef.resource: "secrets" AND NOT responseStatus.code: 200

# Secret access by specific user
objectRef.resource: "secrets" AND user.username: "system:serviceaccount:production:web-app-sa"

# Secret modifications
objectRef.resource: "secrets" AND verb: ("create" OR "update" OR "patch" OR "delete")

# Unusual Secret access (from unexpected IPs)
objectRef.resource: "secrets" AND NOT sourceIPs: ("10.0.1.*" OR "10.0.2.*")
```

## Alerting on Suspicious Secret Access

Create Prometheus alerts from audit logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  secret-access-alerts.yml: |
    groups:
    - name: secret-access
      interval: 60s
      rules:
      # Alert on failed Secret access attempts
      - alert: FailedSecretAccess
        expr: |
          sum(rate(apiserver_audit_event_total{
            objectRef_resource="secrets",
            responseStatus_code!="200"
          }[5m])) > 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Failed Secret access detected"
          description: "{{ $value }} failed Secret access attempts per second"

      # Alert on Secret deletions
      - alert: SecretDeleted
        expr: |
          sum(rate(apiserver_audit_event_total{
            objectRef_resource="secrets",
            verb="delete"
          }[5m])) > 0
        labels:
          severity: critical
        annotations:
          summary: "Secret deleted"
          description: "A Secret was deleted in namespace {{ $labels.objectRef_namespace }}"

      # Alert on unusual Secret access volume
      - alert: UnusualSecretAccessVolume
        expr: |
          sum(rate(apiserver_audit_event_total{
            objectRef_resource="secrets",
            verb="get"
          }[5m])) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Unusual Secret access volume"
          description: "High volume of Secret reads: {{ $value }} per second"

      # Alert on Secret access from unknown ServiceAccounts
      - alert: UnknownServiceAccountSecretAccess
        expr: |
          apiserver_audit_event_total{
            objectRef_resource="secrets",
            user_username!~"system:serviceaccount:(production|staging):.*"
          } > 0
        labels:
          severity: critical
        annotations:
          summary: "Secret accessed by unknown ServiceAccount"
          description: "User {{ $labels.user_username }} accessed Secrets"
```

## Creating Audit Reports

Generate daily Secret access reports:

```bash
#!/bin/bash
# secret-access-report.sh

AUDIT_LOG="/var/log/kubernetes/audit.log"
REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="/tmp/secret-access-report-${REPORT_DATE}.html"

cat > $REPORT_FILE <<EOF
<html>
<head><title>Secret Access Report - ${REPORT_DATE}</title></head>
<body>
<h1>Kubernetes Secret Access Report</h1>
<h2>Date: ${REPORT_DATE}</h2>

<h3>Secret Access Summary</h3>
<table border="1">
<tr><th>User</th><th>Accesses</th></tr>
EOF

# Count accesses by user
grep '"resource":"secrets"' $AUDIT_LOG | \
  grep "$(date +%Y-%m-%d)" | \
  jq -r '.user.username' | \
  sort | uniq -c | sort -rn | \
  while read count user; do
    echo "<tr><td>$user</td><td>$count</td></tr>" >> $REPORT_FILE
  done

cat >> $REPORT_FILE <<EOF
</table>

<h3>Failed Access Attempts</h3>
<table border="1">
<tr><th>Time</th><th>User</th><th>Secret</th><th>Status</th></tr>
EOF

# Failed access attempts
grep '"resource":"secrets"' $AUDIT_LOG | \
  grep "$(date +%Y-%m-%d)" | \
  grep -v '"code":200' | \
  jq -r '[.requestReceivedTimestamp, .user.username, .objectRef.name, .responseStatus.code] | @tsv' | \
  while IFS=$'\t' read time user secret code; do
    echo "<tr><td>$time</td><td>$user</td><td>$secret</td><td>$code</td></tr>" >> $REPORT_FILE
  done

cat >> $REPORT_FILE <<EOF
</table>
</body>
</html>
EOF

echo "Report generated: $REPORT_FILE"
```

Schedule with CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-access-report
  namespace: kube-system
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: audit-reporter
          containers:
          - name: reporter
            image: alpine:latest
            command: ["/bin/sh", "/scripts/secret-access-report.sh"]
            volumeMounts:
            - name: audit-logs
              mountPath: /var/log/kubernetes
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: audit-logs
            hostPath:
              path: /var/log/kubernetes
          - name: scripts
            configMap:
              name: report-scripts
          restartPolicy: OnFailure
```

## Best Practices

1. **Enable audit logging in production**: Always audit Secret access in production environments.

2. **Use Metadata level for reads**: Don't log Secret values in audit logs for get/list operations.

3. **Use RequestResponse for modifications**: Log full details for create/update/delete operations.

4. **Retain logs appropriately**: Keep audit logs for compliance requirements (typically 90-365 days).

5. **Ship logs off-cluster**: Send audit logs to centralized logging for durability.

6. **Alert on failures**: Monitor failed Secret access attempts as potential security incidents.

7. **Review logs regularly**: Perform periodic access reviews to identify anomalies.

8. **Protect audit logs**: Ensure audit logs themselves are secured and tamper-proof.

Kubernetes audit logging provides comprehensive visibility into Secret access patterns. By configuring appropriate audit policies, analyzing logs systematically, and alerting on suspicious activity, you can detect unauthorized access, investigate security incidents, and maintain compliance with organizational security policies.
