# How to Audit Authorization Policy Changes in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Audit, Authorization, Security, Kubernetes

Description: How to set up comprehensive auditing for Istio authorization policy changes including Kubernetes audit logs, Git history, and runtime monitoring.

---

Knowing who changed what authorization policy and when is critical for security and compliance. If someone modifies an AuthorizationPolicy to allow access that shouldn't be allowed, you need to detect that, know who did it, and be able to revert it. Auditing covers the full lifecycle: creation, modification, deletion, and the actual enforcement of policies at runtime.

There are several layers of auditing you should set up. Kubernetes audit logs track who made changes to resources. Git history tracks who approved the change. Runtime logs show how policies are being enforced. Together, they give you complete visibility into your authorization posture.

## Kubernetes Audit Logging

Kubernetes audit logs capture every API request, including changes to Istio CRDs. Enable audit logging in your API server configuration:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all changes to Istio security resources
- level: RequestResponse
  resources:
  - group: "security.istio.io"
    resources: ["authorizationpolicies", "peerauthentications", "requestauthentications"]
  verbs: ["create", "update", "patch", "delete"]

# Log all changes to Istio networking resources
- level: RequestResponse
  resources:
  - group: "networking.istio.io"
    resources: ["virtualservices", "destinationrules", "gateways", "envoyfilters"]
  verbs: ["create", "update", "patch", "delete"]

# Log reads to authorization policies (for detecting reconnaissance)
- level: Metadata
  resources:
  - group: "security.istio.io"
    resources: ["authorizationpolicies"]
  verbs: ["get", "list", "watch"]
```

Configure the API server to use this policy. On managed Kubernetes services, this is typically done through the cloud provider's console or CLI. On self-managed clusters, add these flags to the API server:

```
--audit-policy-file=/etc/kubernetes/audit-policy.yaml
--audit-log-path=/var/log/kubernetes/audit.log
--audit-log-maxage=30
--audit-log-maxbackup=10
--audit-log-maxsize=100
```

## Shipping Audit Logs to a SIEM

Kubernetes audit logs sitting on disk aren't useful unless they're searchable. Ship them to your logging system:

For Elasticsearch/Fluentd:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/kubernetes/audit.log
      pos_file /var/log/fluentd-audit.pos
      tag kubernetes.audit
      <parse>
        @type json
        time_key requestReceivedTimestamp
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.audit>
      @type grep
      <regexp>
        key objectRef.apiGroup
        pattern /security\.istio\.io|networking\.istio\.io/
      </regexp>
    </filter>

    <match kubernetes.audit>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name istio-audit
      type_name _doc
    </match>
```

## Monitoring Policy Changes with a Kubernetes Controller

Build a lightweight controller that watches for AuthorizationPolicy changes and sends alerts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: policy-watcher
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: policy-watcher
  template:
    metadata:
      labels:
        app: policy-watcher
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: policy-watcher
      containers:
      - name: watcher
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          echo "Watching for AuthorizationPolicy changes..."
          kubectl get authorizationpolicies --all-namespaces --watch -o json | while read -r line; do
            TYPE=$(echo "$line" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type','UNKNOWN'))" 2>/dev/null)
            NAME=$(echo "$line" | python3 -c "import sys,json; obj=json.load(sys.stdin).get('object',{}); print(obj.get('metadata',{}).get('name','unknown'))" 2>/dev/null)
            NS=$(echo "$line" | python3 -c "import sys,json; obj=json.load(sys.stdin).get('object',{}); print(obj.get('metadata',{}).get('namespace','unknown'))" 2>/dev/null)

            if [ "$TYPE" = "ADDED" ] || [ "$TYPE" = "MODIFIED" ] || [ "$TYPE" = "DELETED" ]; then
              echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ${TYPE}: AuthorizationPolicy ${NS}/${NAME}"
              # Send to your alerting webhook
              curl -s -X POST "http://alertmanager.monitoring:9093/api/v1/alerts" \
                -H "Content-Type: application/json" \
                -d "[{\"labels\":{\"alertname\":\"IstioAuthPolicyChange\",\"type\":\"${TYPE}\",\"policy\":\"${NAME}\",\"namespace\":\"${NS}\"},\"annotations\":{\"summary\":\"Authorization policy ${TYPE}: ${NS}/${NAME}\"}}]" || true
            fi
          done
```

Create the RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: policy-watcher
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: policy-watcher
rules:
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: policy-watcher
subjects:
- kind: ServiceAccount
  name: policy-watcher
  namespace: istio-system
roleRef:
  kind: ClusterRole
  name: policy-watcher
  apiGroup: rbac.authorization.k8s.io
```

## Git-Based Audit Trail

If you manage Istio policies through GitOps, every change has a Git commit with an author, timestamp, and review history. This is the most reliable audit trail.

Set up a Flux notification for policy changes:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: istio-policy-changes
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: istio-policies
  inclusionList:
  - ".*AuthorizationPolicy.*"
```

## Runtime Authorization Decision Auditing

Beyond tracking policy changes, audit the actual authorization decisions that Envoy makes.

Enable RBAC debug logging to see every decision:

```bash
istioctl proxy-config log deployment/my-app -n backend --level rbac:debug
```

This produces log entries like:

```
enforced_by=shadow_engine action=ALLOW source=10.0.0.5 destination=my-app:8080 matched_policy=allow-frontend
```

For production, you probably don't want debug logging on all the time. Instead, configure access logging to include RBAC information:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-log-with-rbac
  namespace: backend
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code == 403"
```

This logs only denied requests, which is more practical than logging everything.

## Detecting Unauthorized Changes

Set up Prometheus alerts for suspicious patterns:

```yaml
groups:
- name: istio-policy-audit
  rules:
  # Alert on sudden increase in 403 responses (policy might have changed)
  - alert: SuddenAuthDenialIncrease
    expr: |
      (
        sum(rate(istio_requests_total{response_code="403"}[5m])) by (destination_workload, namespace)
        -
        sum(rate(istio_requests_total{response_code="403"}[5m] offset 1h)) by (destination_workload, namespace)
      ) > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Sudden increase in 403 denials for {{ $labels.destination_workload }}"

  # Alert when previously working routes start failing
  - alert: NewAuthDenials
    expr: |
      sum(rate(istio_requests_total{response_code="403"}[5m])) by (source_workload, destination_workload, namespace)
      > 0
      unless
      sum(rate(istio_requests_total{response_code="403"}[5m] offset 1h)) by (source_workload, destination_workload, namespace)
      > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "New authorization denials between {{ $labels.source_workload }} and {{ $labels.destination_workload }}"
```

## Policy Drift Detection

Detect when the actual policy in the cluster differs from what's in Git:

```bash
#!/bin/bash
# Compare Git policies with cluster policies
GIT_DIR="/path/to/git/repo/istio-policies"
NAMESPACE="backend"

for policy_file in $GIT_DIR/*.yaml; do
    POLICY_NAME=$(yq '.metadata.name' $policy_file)

    # Get the cluster version
    CLUSTER_SPEC=$(kubectl get authorizationpolicy $POLICY_NAME -n $NAMESPACE -o yaml 2>/dev/null | yq '.spec')
    GIT_SPEC=$(yq '.spec' $policy_file)

    if [ "$CLUSTER_SPEC" != "$GIT_SPEC" ]; then
        echo "DRIFT DETECTED: $POLICY_NAME in $NAMESPACE"
        diff <(echo "$GIT_SPEC") <(echo "$CLUSTER_SPEC")
    fi
done
```

## Compliance Reporting

Generate periodic reports of all authorization policies and their configurations:

```bash
#!/bin/bash
# Generate authorization policy audit report
echo "=== Istio Authorization Policy Audit Report ==="
echo "Generated: $(date -u)"
echo ""

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
    POLICIES=$(kubectl get authorizationpolicies -n $ns -o json 2>/dev/null)
    COUNT=$(echo "$POLICIES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('items',[])))" 2>/dev/null)

    if [ "$COUNT" -gt 0 ]; then
        echo "Namespace: $ns ($COUNT policies)"
        echo "$POLICIES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('items', []):
    name = item['metadata']['name']
    action = item['spec'].get('action', 'ALLOW')
    rules_count = len(item['spec'].get('rules', []))
    created = item['metadata']['creationTimestamp']
    print(f'  - {name}: action={action}, rules={rules_count}, created={created}')
"
        echo ""
    fi
done
```

Run this as a CronJob and store the reports for compliance:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: policy-audit-report
  namespace: istio-system
spec:
  schedule: "0 0 * * 1"  # Weekly on Monday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: policy-watcher
          restartPolicy: OnFailure
          containers:
          - name: audit
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/audit-report.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: audit-scripts
```

Auditing is an ongoing process, not a one-time setup. Put the infrastructure in place, set up alerts for changes, and regularly review the reports. When a security incident happens, you'll be glad you can answer "who changed what, when, and why" within minutes.
