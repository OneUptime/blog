# How to Audit Istio RBAC Policy Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Auditing, Kubernetes, Compliance

Description: How to track and audit changes to Istio RBAC policies and configurations for compliance, security reviews, and incident investigations.

---

When something goes wrong in an Istio mesh, one of the first questions is "who changed what and when?" If an authorization policy was modified and traffic started getting blocked, you need to trace that change back to its source. Without proper auditing, you are left guessing, and guessing during an outage is not a great experience.

Auditing Istio RBAC policy changes involves two layers: tracking who creates and modifies Istio custom resources (using Kubernetes audit logs), and tracking the content of those changes (using git-based workflows and resource versioning).

## Enabling Kubernetes Audit Logging

Kubernetes audit logs record every API request, including who made it, what they changed, and when. Configure an audit policy that captures Istio resource changes:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all changes to Istio networking resources
  - level: RequestResponse
    resources:
      - group: networking.istio.io
        resources:
          - virtualservices
          - destinationrules
          - gateways
          - serviceentries
          - sidecars
          - envoyfilters
    verbs:
      - create
      - update
      - patch
      - delete
  # Log all changes to Istio security resources
  - level: RequestResponse
    resources:
      - group: security.istio.io
        resources:
          - authorizationpolicies
          - peerauthentications
          - requestauthentications
    verbs:
      - create
      - update
      - patch
      - delete
  # Log all changes to Istio telemetry resources
  - level: RequestResponse
    resources:
      - group: telemetry.istio.io
        resources:
          - telemetries
    verbs:
      - create
      - update
      - patch
      - delete
  # Log read access at a lower level
  - level: Metadata
    resources:
      - group: networking.istio.io
      - group: security.istio.io
      - group: telemetry.istio.io
    verbs:
      - get
      - list
      - watch
```

For managed Kubernetes services, enable audit logging through the cloud provider:

```bash
# GKE
gcloud container clusters update my-cluster \
  --enable-master-authorized-networks \
  --logging=SYSTEM,WORKLOAD,API_SERVER

# EKS - audit logging is enabled through the EKS console or API
aws eks update-cluster-config \
  --name my-cluster \
  --logging '{"clusterLogging":[{"types":["audit"],"enabled":true}]}'
```

## Querying Audit Logs

Once audit logging is enabled, you can query for specific changes:

```bash
# For clusters with audit logs shipped to a log aggregator
# Look for AuthorizationPolicy changes in the last 24 hours

# If using Elasticsearch
curl -s "http://elasticsearch:9200/audit-*/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"objectRef.resource": "authorizationpolicies"}},
        {"terms": {"verb": ["create", "update", "patch", "delete"]}},
        {"range": {"requestReceivedTimestamp": {"gte": "now-24h"}}}
      ]
    }
  },
  "sort": [{"requestReceivedTimestamp": "desc"}],
  "size": 50
}'
```

## Tracking Changes with Resource Versions

Every Kubernetes resource has a `resourceVersion` field that changes on every update. Use this to detect when resources change:

```bash
# Snapshot current Istio resource versions
kubectl get virtualservices,destinationrules,authorizationpolicies \
  --all-namespaces -o json | \
  jq '.items[] | {
    kind: .kind,
    namespace: .metadata.namespace,
    name: .metadata.name,
    resourceVersion: .metadata.resourceVersion,
    lastModified: .metadata.managedFields[-1].time
  }'
```

## Setting Up a Change Watch

Create a lightweight service that watches for Istio resource changes and logs them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-audit-watcher
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: istio-audit-watcher
  template:
    metadata:
      labels:
        app: istio-audit-watcher
    spec:
      serviceAccountName: istio-audit-watcher
      containers:
        - name: watcher
          image: bitnami/kubectl:latest
          command:
            - /bin/bash
            - -c
            - |
              echo "Starting Istio resource watcher..."
              kubectl get virtualservices,destinationrules,authorizationpolicies,peerauthentications,gateways,serviceentries --all-namespaces --watch -o json | while read -r line; do
                KIND=$(echo "$line" | jq -r '.kind // empty')
                NAME=$(echo "$line" | jq -r '.metadata.name // empty')
                NS=$(echo "$line" | jq -r '.metadata.namespace // empty')
                RV=$(echo "$line" | jq -r '.metadata.resourceVersion // empty')
                if [ -n "$KIND" ] && [ -n "$NAME" ]; then
                  echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"kind\":\"$KIND\",\"name\":\"$NAME\",\"namespace\":\"$NS\",\"resourceVersion\":\"$RV\"}"
                fi
              done
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: istio-audit-watcher
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-audit-watcher
subjects:
  - kind: ServiceAccount
    name: istio-audit-watcher
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: istio-readonly
  apiGroup: rbac.authorization.k8s.io
```

## Using Git-Based Workflows for Audit Trails

The best audit trail comes from requiring all Istio configuration changes to go through Git. This gives you:

- Who made the change (git author)
- When it was made (commit timestamp)
- What changed (git diff)
- Why it changed (commit message and PR description)

Enforce this with a policy that prevents direct `kubectl apply`:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requiremanagedby
spec:
  crd:
    spec:
      names:
        kind: RequireManagedBy
      validation:
        openAPIV3Schema:
          type: object
          properties:
            managedBy:
              type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requiremanagedby

        violation[{"msg": msg}] {
          input.review.object.apiVersion == "networking.istio.io/v1"
          not input.review.object.metadata.labels["app.kubernetes.io/managed-by"]
          msg := "Istio resources must have a app.kubernetes.io/managed-by label"
        }

        violation[{"msg": msg}] {
          input.review.object.apiVersion == "security.istio.io/v1"
          not input.review.object.metadata.labels["app.kubernetes.io/managed-by"]
          msg := "Istio resources must have a app.kubernetes.io/managed-by label"
        }
```

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireManagedBy
metadata:
  name: istio-resources-managed
spec:
  match:
    kinds:
      - apiGroups: ["networking.istio.io", "security.istio.io"]
        kinds: ["*"]
    excludedNamespaces: ["istio-system"]
  parameters:
    managedBy: "argocd"
```

## Generating Audit Reports

Create a script that generates a regular audit report of Istio configuration changes:

```bash
#!/bin/bash
DAYS=${1:-7}
OUTPUT="istio-audit-report-$(date +%Y%m%d).txt"

echo "Istio Configuration Audit Report" > $OUTPUT
echo "Period: Last $DAYS days" >> $OUTPUT
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $OUTPUT
echo "========================================" >> $OUTPUT

for RESOURCE in virtualservices destinationrules authorizationpolicies peerauthentications gateways serviceentries; do
  echo "" >> $OUTPUT
  echo "## $RESOURCE" >> $OUTPUT

  kubectl get $RESOURCE --all-namespaces -o json | \
    jq -r ".items[] | select(.metadata.managedFields[-1].time > (now - ($DAYS * 86400) | todate)) | \"\(.metadata.namespace)/\(.metadata.name) - Last modified: \(.metadata.managedFields[-1].time) by \(.metadata.managedFields[-1].manager)\"" >> $OUTPUT
done

echo "" >> $OUTPUT
echo "Total resources:" >> $OUTPUT
for GROUP in networking.istio.io security.istio.io telemetry.istio.io; do
  COUNT=$(kubectl get --raw "/apis/$GROUP/v1" 2>/dev/null | jq '.resources | length')
  echo "  $GROUP: $COUNT resource types" >> $OUTPUT
done

echo "Report saved to $OUTPUT"
```

## Alerting on Suspicious Changes

Set up alerts for changes that might indicate unauthorized modifications:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-audit-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-audit
      rules:
        - alert: IstioSecurityPolicyChanged
          expr: |
            increase(apiserver_request_total{
              resource="authorizationpolicies",
              verb=~"create|update|patch|delete",
              group="security.istio.io"
            }[5m]) > 0
          for: 0m
          labels:
            severity: info
          annotations:
            summary: "Istio AuthorizationPolicy was modified"
        - alert: IstioEnvoyFilterChanged
          expr: |
            increase(apiserver_request_total{
              resource="envoyfilters",
              verb=~"create|update|patch|delete",
              group="networking.istio.io"
            }[5m]) > 0
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "Istio EnvoyFilter was modified - review immediately"
```

## Compliance Considerations

For compliance frameworks like SOC 2 or PCI-DSS, you need to demonstrate:

1. **Who** has access to modify security configurations (RBAC bindings)
2. **What** changes were made (audit logs)
3. **When** changes occurred (timestamps)
4. **Approval** process (PR reviews in git)

Generate a compliance summary:

```bash
# List all users/groups with write access to Istio security resources
kubectl get clusterrolebindings,rolebindings --all-namespaces -o json | \
  jq '.items[] | select(.roleRef.name | test("istio")) |
  {binding: .metadata.name, namespace: .metadata.namespace, subjects: .subjects, role: .roleRef.name}'
```

Auditing is not exciting work, but it is the kind of thing that saves you during security reviews and incident post-mortems. Invest in it early, and you will thank yourself later when someone asks "who changed that authorization policy at 3 AM last Tuesday?"
