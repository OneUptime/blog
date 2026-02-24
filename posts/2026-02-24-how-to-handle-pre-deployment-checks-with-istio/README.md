# How to Handle Pre-Deployment Checks with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pre-Deployment, Kubernetes, Validation, Service Mesh

Description: How to implement pre-deployment checks using Istio configuration validation, mesh health verification, and readiness gates before rolling out changes.

---

Pre-deployment checks catch problems before they reach production. With Istio in the mix, there's a whole set of mesh-related validations you should run before deploying new services or updating existing ones. These checks cover everything from Istio configuration correctness to mesh health to resource availability.

Running these checks as part of your deployment pipeline prevents issues like misconfigured VirtualServices, broken mTLS, or resource exhaustion that would be much harder to fix after deployment.

## Validating Istio Configuration

Before deploying, validate that your Istio manifests are correct. `istioctl analyze` catches common misconfigurations:

```bash
istioctl analyze -n default --all-namespaces
```

This checks for things like:
- VirtualServices referencing non-existent DestinationRules
- Services without matching workloads
- Conflicting port definitions
- Missing sidecar injection labels

You can also validate specific files before applying them:

```bash
istioctl analyze -f my-virtualservice.yaml -f my-destinationrule.yaml
```

Run this as a pre-deploy step in your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Validate Istio config
  run: |
    istioctl analyze -f manifests/istio/ --output-threshold Error
    if [ $? -ne 0 ]; then
      echo "Istio configuration validation failed"
      exit 1
    fi
```

## Checking Mesh Health

Before deploying, make sure the mesh itself is healthy. A deployment into an unhealthy mesh is asking for trouble.

### Check istiod Status

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl get deploy -n istio-system istiod -o jsonpath='{.status.readyReplicas}'
```

### Check Proxy Sync Status

```bash
istioctl proxy-status
```

Look for any proxies in `STALE` state. If proxies are out of sync with the control plane, new configuration might not propagate correctly:

```bash
# Script to check for stale proxies
STALE_COUNT=$(istioctl proxy-status | grep -c STALE || true)
if [ "$STALE_COUNT" -gt 0 ]; then
    echo "WARNING: $STALE_COUNT proxies are in STALE state"
    istioctl proxy-status | grep STALE
    exit 1
fi
echo "All proxies in sync"
```

### Check Certificate Health

Verify that mTLS certificates are valid and not close to expiration:

```bash
# For sidecar mode
istioctl proxy-config secret -n default deployment/my-app | grep -i "not after"

# For ambient mode
istioctl ztunnel-config certificates | grep -v "VALID"
```

## Resource Pre-Checks

Make sure the cluster has enough resources for the deployment:

```bash
#!/bin/bash
NAMESPACE="default"
MIN_CPU="500m"
MIN_MEMORY="512Mi"

# Check available resources across nodes
echo "Node resource availability:"
kubectl top nodes

# Check if the namespace has resource quotas
QUOTA=$(kubectl get resourcequota -n $NAMESPACE -o json 2>/dev/null)
if [ -n "$QUOTA" ]; then
    echo "Resource quota status:"
    kubectl describe resourcequota -n $NAMESPACE
fi

# Check existing pod count vs limits
POD_COUNT=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running -o json | python3 -c "import sys,json; print(len(json.load(sys.stdin)['items']))")
echo "Running pods in ${NAMESPACE}: ${POD_COUNT}"
```

## Validating VirtualService and DestinationRule Consistency

Check that your VirtualService references match existing DestinationRules:

```bash
#!/bin/bash
NAMESPACE="default"

# Get all subsets referenced in VirtualServices
VS_SUBSETS=$(kubectl get virtualservice -n $NAMESPACE -o jsonpath='{range .items[*]}{range .spec.http[*]}{range .route[*]}{.destination.host}:{.destination.subset}{"\n"}{end}{end}{end}' 2>/dev/null)

# Get all subsets defined in DestinationRules
DR_SUBSETS=$(kubectl get destinationrule -n $NAMESPACE -o jsonpath='{range .items[*]}{range .spec.subsets[*]}{.name}{"\n"}{end}{end}' 2>/dev/null)

echo "VirtualService references:"
echo "$VS_SUBSETS"
echo ""
echo "DestinationRule subsets:"
echo "$DR_SUBSETS"

# Check for mismatches
echo "$VS_SUBSETS" | while read line; do
    SUBSET=$(echo "$line" | cut -d: -f2)
    if [ -n "$SUBSET" ] && ! echo "$DR_SUBSETS" | grep -q "^${SUBSET}$"; then
        echo "ERROR: Subset '$SUBSET' referenced in VirtualService but not found in any DestinationRule"
        exit 1
    fi
done
```

## Pre-Deployment Gateway Checks

If your deployment involves ingress traffic, verify gateway configuration:

```bash
# Check gateway pods are healthy
kubectl get pods -n istio-system -l istio=ingressgateway

# Verify gateway listeners
istioctl proxy-config listener -n istio-system deployment/istio-ingressgateway

# Check for port conflicts
kubectl get gateway --all-namespaces -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.servers[*]}{.port.number} {end}{"\n"}{end}'
```

## Checking Authorization Policy Impact

Before deploying new authorization policies, dry-run them to understand their impact:

```bash
# List current policies
kubectl get authorizationpolicies -n default -o wide

# Analyze the new policy
istioctl analyze -f new-auth-policy.yaml

# Check if there are conflicting policies
kubectl get authorizationpolicies -n default -o jsonpath='{range .items[*]}{.metadata.name}: action={.spec.action}{"\n"}{end}'
```

If you have both ALLOW and DENY policies, make sure the new policy doesn't accidentally block legitimate traffic. A common mistake is deploying an ALLOW policy without including all necessary source identities.

## Pre-Deployment Connectivity Check

Verify that the new version can reach its dependencies before switching traffic:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-deploy-connectivity
  namespace: default
spec:
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: connectivity-check
    spec:
      restartPolicy: Never
      containers:
      - name: check
        image: curlimages/curl:latest
        command: ["/bin/sh"]
        args:
        - -c
        - |
          set -e
          echo "Checking connectivity to dependencies..."

          # Check database
          nc -zv postgres.database.svc.cluster.local 5432
          echo "Database: OK"

          # Check Redis
          nc -zv redis.cache.svc.cluster.local 6379
          echo "Redis: OK"

          # Check external API
          curl -sf -o /dev/null https://api.external-service.com/health
          echo "External API: OK"

          echo "All connectivity checks passed"
```

## Building a Pre-Deployment Pipeline Stage

Put all the checks together in a single pipeline stage:

```bash
#!/bin/bash
set -e

echo "=== Pre-Deployment Checks ==="

echo "1. Validating Istio configuration..."
istioctl analyze -f manifests/istio/ --output-threshold Error
echo "   PASSED"

echo "2. Checking mesh health..."
STALE=$(istioctl proxy-status 2>/dev/null | grep -c STALE || true)
if [ "$STALE" -gt 0 ]; then
    echo "   FAILED: $STALE stale proxies detected"
    exit 1
fi
echo "   PASSED"

echo "3. Checking istiod health..."
ISTIOD_READY=$(kubectl get deploy -n istio-system istiod -o jsonpath='{.status.readyReplicas}')
if [ "$ISTIOD_READY" -lt 1 ]; then
    echo "   FAILED: istiod not ready"
    exit 1
fi
echo "   PASSED"

echo "4. Checking ingress gateway..."
GW_READY=$(kubectl get deploy -n istio-system istio-ingressgateway -o jsonpath='{.status.readyReplicas}')
if [ "$GW_READY" -lt 1 ]; then
    echo "   FAILED: ingress gateway not ready"
    exit 1
fi
echo "   PASSED"

echo "5. Checking current error rate..."
PROM_URL="http://prometheus.monitoring.svc.cluster.local:9090"
ERROR_RATE=$(curl -s "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=sum(rate(istio_requests_total{namespace=\"default\",response_code=~\"5.*\"}[5m]))/sum(rate(istio_requests_total{namespace=\"default\"}[5m]))" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'][0]['value'][1] if d['data']['result'] else '0')")
if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
    echo "   FAILED: Current error rate ${ERROR_RATE} is above 5%. Fix existing issues before deploying."
    exit 1
fi
echo "   PASSED (current error rate: ${ERROR_RATE})"

echo ""
echo "=== All pre-deployment checks passed ==="
```

## Using Admission Webhooks

Istio includes a validating webhook that automatically rejects invalid configurations. Make sure it's enabled:

```bash
kubectl get validatingwebhookconfiguration | grep istio
```

You should see `istio-validator-istio-system` (or similar). This webhook catches syntax errors and basic semantic issues in Istio resources at apply time.

Pre-deployment checks take a few minutes but can save hours of debugging. Make them a required gate in your CI/CD pipeline, and your production mesh will stay healthy through every deployment cycle.
