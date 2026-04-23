# How to Configure RKE2 Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Audit Logging, Security, Compliance, Rancher

Description: Learn how to configure comprehensive Kubernetes audit logging in RKE2 to track all API server activity for security monitoring and compliance requirements.

Kubernetes audit logging records all requests to the API server, providing a complete audit trail of who did what and when in your cluster. This is a critical security and compliance requirement for most regulated environments. RKE2 supports Kubernetes audit logging through API server configuration. This guide covers a complete audit logging setup.

## Prerequisites

- RKE2 server cluster running
- Sufficient disk space for audit logs
- Log aggregation system (optional but recommended: Elasticsearch, Loki)
- Root access to server nodes

## Understanding Kubernetes Audit Levels

Each audit event can be recorded at one of four levels:

- **None**: Don't log events matching this rule
- **Metadata**: Log request metadata only (user, timestamp, resource) - no request/response body
- **Request**: Log metadata + request body
- **RequestResponse**: Log metadata + request body + response body (most detailed, most storage)

## Step 1: Create an Audit Policy

```bash
# Create the audit policy directory

sudo mkdir -p /etc/rancher/rke2/

# Create a comprehensive audit policy
sudo tee /etc/rancher/rke2/audit-policy.yaml > /dev/null << 'EOF'
apiVersion: audit.k8s.io/v1
kind: Policy
# Omit the RequestReceived stage to reduce noise
omitStages:
  - "RequestReceived"

rules:
  # ---------------------------------------------------------
  # SECURITY-CRITICAL: Sensitive operations
  # ---------------------------------------------------------

  # Log secret changes at Metadata level to avoid exposing secret values
  - level: Metadata
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["secrets"]

  # Log secret reads at Metadata level (don't expose secret values)
  - level: Metadata
    verbs: ["get", "list", "watch"]
    resources:
    - group: ""
      resources: ["secrets"]

  # Log all RBAC changes
  - level: RequestResponse
    resources:
    - group: "rbac.authorization.k8s.io"
      resources:
      - "clusterroles"
      - "clusterrolebindings"
      - "roles"
      - "rolebindings"

  # Log authentication and authorization review/token operations without token contents
  - level: Metadata
    resources:
    - group: "authentication.k8s.io"
      resources: ["tokenreviews"]
    - group: "authorization.k8s.io"
      resources: ["subjectaccessreviews"]
    - group: ""
      resources: ["serviceaccounts/token"]

  # Log pod and workload controller operations
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["pods"]
    - group: "apps"
      resources: ["deployments", "daemonsets", "statefulsets"]

  # ---------------------------------------------------------
  # COMPLIANCE: Log at Request level
  # ---------------------------------------------------------

  # Log all ServiceAccount and ConfigMap changes
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources:
      - "serviceaccounts"
      - "configmaps"
      - "namespaces"
      - "persistentvolumes"
      - "persistentvolumeclaims"

  # Log admission and network policy changes
  - level: Request
    resources:
    - group: "admissionregistration.k8s.io"
      resources:
      - "mutatingwebhookconfigurations"
      - "validatingadmissionpolicies"
      - "validatingadmissionpolicybindings"
      - "validatingwebhookconfigurations"
    - group: "networking.k8s.io"
      resources: ["networkpolicies"]

  # ---------------------------------------------------------
  # SKIP: Don't log these (too noisy or not security-relevant)
  # ---------------------------------------------------------

  # Don't log kube-proxy service and endpoint watches
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
    resources:
    - group: ""
      resources: ["endpoints", "services", "services/status"]

  # Don't log node status updates
  - level: None
    userGroups: ["system:nodes"]
    verbs: ["update", "patch"]
    resources:
    - group: ""
      resources: ["nodes/status", "pods/status"]

  # Don't log controller manager and scheduler checks
  - level: None
    users:
    - "system:kube-controller-manager"
    - "system:kube-scheduler"
    verbs: ["list", "watch"]

  # Don't log common discovery and health non-resource requests
  - level: None
    userGroups: ["system:authenticated"]
    nonResourceURLs:
    - "/api*"
    - "/version"
    - "/healthz"
    - "/readyz"
    - "/livez"

  # ---------------------------------------------------------
  # AUDIT: Log at Metadata level
  # ---------------------------------------------------------

  # Log all node operations
  - level: Metadata
    resources:
    - group: ""
      resources: ["nodes", "nodes/status"]

  # Log service operations
  - level: Metadata
    resources:
    - group: ""
      resources: ["services", "endpoints"]

  # Default: Log everything else at Metadata level
  - level: Metadata
    omitStages:
    - RequestReceived
EOF
```

## Step 2: Configure RKE2 to Use the Audit Policy

```yaml
# /etc/rancher/rke2/config.yaml - Enable audit logging
kube-apiserver-arg:
  # Path to the audit policy file
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"

  # Path for audit log output
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"

  # Maximum number of days to retain audit log files
  - "audit-log-maxage=30"

  # Maximum number of audit log files to retain
  - "audit-log-maxbackup=10"

  # Maximum size in megabytes of an audit log file before rotation
  - "audit-log-maxsize=100"

  # Audit log format: legacy or json
  # Use json for better integration with log aggregation systems
  - "audit-log-format=json"
```

```bash
# Create the log directory
sudo mkdir -p /var/lib/rancher/rke2/server/logs
sudo chmod 750 /var/lib/rancher/rke2/server/logs

# Apply the configuration
sudo systemctl restart rke2-server

# Verify audit logging is active
sleep 30
sudo head -5 /var/lib/rancher/rke2/server/logs/audit.log | \
  python3 -c 'import json, sys; [print(json.dumps(json.loads(line), indent=2)) for line in sys.stdin if line.strip()]'
```

## Step 3: Forward Audit Logs to a Log Aggregator

### Forward to Loki with Grafana Alloy

```yaml
# alloy-config.yaml - Ship audit logs to Loki
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-audit-config
  namespace: monitoring
data:
  config.alloy: |
    loki.source.file "kubernetes_audit" {
      targets = [
        {
          __path__ = "/var/lib/rancher/rke2/server/logs/audit.log",
          job = "kubernetes-audit",
          cluster = "production",
        },
      ]

      forward_to = [loki.process.kubernetes_audit.receiver]

      file_match {
        enabled = true
      }
    }

    loki.process "kubernetes_audit" {
      forward_to = [loki.write.default.receiver]

      stage.json {
        expressions = {
          level = "level",
          user = "user.username",
          verb = "verb",
          resource = "objectRef.resource",
          namespace = "objectRef.namespace",
        }
      }

      stage.labels {
        values = {
          level = "",
          user = "",
          verb = "",
          resource = "",
        }
      }
    }

    loki.write "default" {
      endpoint {
        url = "http://loki:3100/loki/api/v1/push"
      }
    }
```

## Step 4: Query Audit Logs

```bash
# View recent audit log entries
sudo tail -f /var/lib/rancher/rke2/server/logs/audit.log | \
  python3 -c "
import json, sys
for line in sys.stdin:
    try:
        event = json.loads(line.strip())
        print(f\"{event.get('requestReceivedTimestamp', '')[:19]} \
| {event.get('user', {}).get('username', 'unknown')[:20]:20} \
| {event.get('verb', ''):<8} \
| {event.get('objectRef', {}).get('resource', ''):<20} \
| {event.get('objectRef', {}).get('namespace', ''):<20}\")
    except:
        pass
"

# Find all DELETE operations
sudo grep '"verb":"delete"' /var/lib/rancher/rke2/server/logs/audit.log | \
  python3 -c "
import json, sys
for line in sys.stdin:
    event = json.loads(line.strip())
    ref = event.get('objectRef', {})
    print(f\"{event['requestReceivedTimestamp'][:19]} DELETE {ref.get('namespace', '')}/{ref.get('resource', '')}/{ref.get('name', '')} by {event.get('user', {}).get('username', 'unknown')}\")
" | tail -20

# Find failed requests (4xx and 5xx)
sudo grep '"code":[45][0-9][0-9]' /var/lib/rancher/rke2/server/logs/audit.log | \
  python3 -c "
import json, sys
for line in sys.stdin:
    event = json.loads(line.strip())
    print(f\"{event.get('requestReceivedTimestamp', '')[:19]} \
CODE={event.get('responseStatus', {}).get('code')} \
{event.get('verb', '')} \
{event.get('objectRef', {}).get('resource', '')} \
by {event.get('user', {}).get('username', 'unknown')}\")
" | tail -20
```

## Conclusion

Comprehensive audit logging in RKE2 provides the visibility needed for security monitoring, compliance auditing, and incident response. By carefully crafting the audit policy to capture security-critical events at high detail while avoiding noise from routine operations, you balance completeness with storage costs. For production environments, always forward audit logs to a centralized log management system for long-term retention, correlation with other security events, and automated alerting on suspicious activity.
