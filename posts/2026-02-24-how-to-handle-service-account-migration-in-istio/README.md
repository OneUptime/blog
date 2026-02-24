# How to Handle Service Account Migration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Accounts, Migration, Kubernetes, Security

Description: A guide to safely migrating Kubernetes service accounts in Istio without breaking mTLS, authorization policies, or traffic routing.

---

Migrating service accounts in an Istio mesh is one of those tasks that sounds simple but can break things in surprising ways if you are not careful. Since Istio ties workload identity to service accounts through SPIFFE URIs, changing a service account means changing the identity that authorization policies check against. If you swap a service account without updating the policies, traffic that was previously allowed starts getting denied.

There are several reasons you might need to migrate service accounts: consolidating from shared default accounts to dedicated per-service accounts, renaming for consistency, moving workloads between namespaces, or splitting a monolith into microservices. Whatever the reason, the approach is the same: do it gradually and verify at every step.

## Understanding the Impact of Changing Service Accounts

When you change a pod's service account, the following things change:

1. The SPIFFE identity changes from `spiffe://cluster.local/ns/<namespace>/sa/<old-sa>` to `spiffe://cluster.local/ns/<namespace>/sa/<new-sa>`
2. Any AuthorizationPolicy that references the old identity stops matching
3. The mTLS certificate gets reissued with the new identity
4. Any PeerAuthentication trust relationship changes

Check what policies reference the current service account:

```bash
kubectl get authorizationpolicy --all-namespaces -o json | \
  jq '.items[] | select(.spec.rules[].from[].source.principals[]? | contains("sa/old-service-account")) | .metadata.name'
```

## Step 1: Create the New Service Account

Start by creating the new service account alongside the old one:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
```

```bash
kubectl apply -f new-service-account.yaml
```

If the new service account needs specific RBAC permissions, set those up too:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: order-service
    namespace: production
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 2: Update Authorization Policies to Accept Both Identities

Before migrating any workloads, update all AuthorizationPolicies to accept both the old and new identities:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/default"
              - "cluster.local/ns/production/sa/order-service"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/payments"]
```

The key is adding the new principal (`order-service`) while keeping the old one (`default`). Both identities are accepted during the transition.

Find and update all affected policies:

```bash
#!/bin/bash
OLD_SA="default"
NEW_SA="order-service"
NAMESPACE="production"

# Find all policies that reference the old service account
for POLICY in $(kubectl get authorizationpolicy --all-namespaces -o json | \
  jq -r ".items[] | select(.spec.rules[]?.from[]?.source?.principals[]? | contains(\"sa/$OLD_SA\")) | \"\(.metadata.namespace)/\(.metadata.name)\""); do

  NS=$(echo $POLICY | cut -d/ -f1)
  NAME=$(echo $POLICY | cut -d/ -f2)
  echo "Policy $NS/$NAME references sa/$OLD_SA"
done
```

## Step 3: Migrate Workloads Gradually

Do not change all pods at once. Start with a canary deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-canary
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-service
      track: canary
  template:
    metadata:
      labels:
        app: order-service
        track: canary
    spec:
      serviceAccountName: order-service
      containers:
        - name: order-service
          image: myregistry/order-service:v1.2.0
          ports:
            - containerPort: 8080
```

After deploying the canary, verify it can communicate with other services:

```bash
# Check the new identity
kubectl exec -n production deploy/order-service-canary -c istio-proxy -- \
  curl -s localhost:15000/certs | head -20

# Test connectivity
kubectl exec -n production deploy/order-service-canary -c order-service -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/v1/health
```

If the canary works, gradually migrate the main deployment:

```bash
kubectl patch deployment order-service -n production \
  -p '{"spec":{"template":{"spec":{"serviceAccountName":"order-service"}}}}'
```

This triggers a rolling update, replacing pods one at a time with the new service account.

## Step 4: Verify the Migration

After all pods are using the new service account, verify everything is healthy:

```bash
# Check all pods are using the new service account
kubectl get pods -n production -l app=order-service -o json | \
  jq '.items[].spec.serviceAccountName'

# Verify the SPIFFE identity
istioctl proxy-config secret -n production deploy/order-service

# Check for any authorization policy denials
kubectl logs -n production deploy/order-service -c istio-proxy | grep "RBAC: access denied"
```

Monitor error rates for a period to make sure nothing is broken:

```bash
# Check if error rate has increased
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(istio_requests_total{destination_app='payment-service',response_code=~'403|503'}[5m]))" | \
  jq '.data.result[0].value[1]'
```

## Step 5: Clean Up Old References

Once you are confident the migration is successful, remove the old service account references from authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/order-service"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/payments"]
```

And if the old service account is no longer used by any workload, delete it:

```bash
# First verify nothing else uses it
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | select(.spec.serviceAccountName == "old-service-account") | .metadata.name'

# If no results, safe to delete
kubectl delete serviceaccount old-service-account -n production
```

## Handling Bulk Migration

If you are migrating many services at once (for example, from the default service account to dedicated accounts), automate the process:

```bash
#!/bin/bash
NAMESPACE="production"

for DEPLOY in $(kubectl get deploy -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
  CURRENT_SA=$(kubectl get deploy -n $NAMESPACE $DEPLOY \
    -o jsonpath='{.spec.template.spec.serviceAccountName}')

  if [ "$CURRENT_SA" = "default" ] || [ -z "$CURRENT_SA" ]; then
    echo "Migrating $DEPLOY from default to $DEPLOY"

    # Create the new service account
    kubectl create serviceaccount "$DEPLOY" -n $NAMESPACE 2>/dev/null || true

    # Update authorization policies (add new principal)
    # ... (custom logic based on your policies)

    # Patch the deployment
    kubectl patch deployment "$DEPLOY" -n $NAMESPACE \
      -p "{\"spec\":{\"template\":{\"spec\":{\"serviceAccountName\":\"$DEPLOY\"}}}}"

    # Wait for rollout
    kubectl rollout status deployment/"$DEPLOY" -n $NAMESPACE --timeout=300s

    echo "Migration complete for $DEPLOY"
  fi
done
```

## Rollback Plan

Always have a rollback plan. If the migration causes issues, switch back to the old service account:

```bash
kubectl patch deployment order-service -n production \
  -p '{"spec":{"template":{"spec":{"serviceAccountName":"default"}}}}'
```

Since you kept the old principals in the authorization policies during the transition, rolling back is immediate.

## Monitoring During Migration

Set up a dashboard or alert specifically for the migration period:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sa-migration-alerts
  namespace: monitoring
spec:
  groups:
    - name: sa-migration
      rules:
        - alert: AuthorizationDenialSpike
          expr: |
            sum(rate(istio_requests_total{response_code="403"}[5m])) by (destination_app)
            > 1.5 * sum(rate(istio_requests_total{response_code="403"}[5m] offset 1h)) by (destination_app)
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "403 responses spiked for {{ $labels.destination_app }} during SA migration"
```

Service account migration is a zero-downtime operation when done correctly. The key is the dual-identity transition period where both old and new service accounts are accepted by authorization policies. Do not skip this step. It is the safety net that lets you migrate gradually and roll back if something goes wrong.
