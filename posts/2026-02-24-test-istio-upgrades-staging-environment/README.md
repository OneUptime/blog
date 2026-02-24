# How to Test Istio Upgrades in a Staging Environment First

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Staging, Testing, Upgrade

Description: A practical guide to setting up and using a staging environment to test Istio upgrades before rolling them out to production clusters.

---

Upgrading Istio directly in production without testing first is a gamble. Even minor version bumps can change default behaviors, deprecate features, or introduce bugs that interact with your specific configuration. A staging environment that mirrors your production Istio setup catches these issues before they become incidents.

The challenge is making your staging environment realistic enough that problems surface there instead of in production. Here is how to set that up and use it effectively.

## What Your Staging Environment Needs

A good staging environment for Istio testing should mirror production in these areas:

- **Same Istio version and configuration.** Same IstioOperator or Helm values.
- **Same Istio resources.** VirtualServices, DestinationRules, Gateways, AuthorizationPolicies - all of them.
- **Similar workload topology.** Services should call each other in the same patterns.
- **Similar traffic patterns.** Load testing that mimics real traffic volumes and patterns.

It does not need to match production in scale (fewer replicas are fine), but the configuration should be as close as possible.

## Setting Up the Staging Cluster

If you do not already have a staging cluster, create one that matches your production cluster's Kubernetes version:

```bash
# Example with GKE
gcloud container clusters create istio-staging \
  --cluster-version=1.28 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --region=us-central1
```

Install the same Istio version as production using the same method (istioctl, Helm, or operator):

```bash
# If production uses Helm
helm install istio-base istio/base -n istio-system --version 1.20.5
helm install istiod istio/istiod -n istio-system --version 1.20.5 -f production-istiod-values.yaml
helm install istio-ingressgateway istio/gateway -n istio-system --version 1.20.5 -f production-gateway-values.yaml
```

The key is using the exact same values files. Store them in version control so both environments draw from the same source of truth.

## Syncing Istio Configuration

Export all Istio custom resources from production:

```bash
# Run against the production cluster
kubectl get virtualservices --all-namespaces -o yaml > vs-export.yaml
kubectl get destinationrules --all-namespaces -o yaml > dr-export.yaml
kubectl get gateways --all-namespaces -o yaml > gw-export.yaml
kubectl get serviceentries --all-namespaces -o yaml > se-export.yaml
kubectl get authorizationpolicies --all-namespaces -o yaml > authz-export.yaml
kubectl get peerauthentications --all-namespaces -o yaml > pa-export.yaml
kubectl get envoyfilters --all-namespaces -o yaml > ef-export.yaml
```

Clean the exports (remove resource versions, UIDs, and other cluster-specific metadata) and apply them to staging:

```bash
# Strip cluster-specific fields and apply to staging
for f in vs-export.yaml dr-export.yaml gw-export.yaml se-export.yaml authz-export.yaml pa-export.yaml ef-export.yaml; do
  kubectl apply -f $f --context=staging-cluster
done
```

Automate this sync so it runs regularly, or manage Istio resources through GitOps so both clusters are automatically in sync.

## Deploying Test Workloads

Deploy the same services as production. They do not need to be the full application - mock services that respond correctly to health checks and produce similar traffic patterns are good enough.

A simple approach is using Istio's sample apps:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: test-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: docker.io/kennethreitz/httpbin
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: test-app
spec:
  selector:
    app: httpbin
  ports:
  - port: 80
    targetPort: 80
```

For more realistic testing, deploy your actual services with test data. The closer staging matches production, the more confidence the upgrade test gives you.

## Creating a Test Plan

Before running the upgrade in staging, document what you are going to check. A good test plan covers:

**Pre-upgrade baseline:**

```bash
# Record baseline metrics
istioctl version > baseline-version.txt
istioctl proxy-status > baseline-proxy-status.txt
istioctl analyze --all-namespaces > baseline-analysis.txt
```

**Core functionality tests:**

- mTLS between services is working
- VirtualService routing is correct
- Gateway ingress traffic flows
- Authorization policies are enforced
- Retry and timeout policies function

**Traffic tests:**

```bash
# Send test traffic and record success rate
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" http://staging-gateway/api/test
done | sort | uniq -c
```

**Performance baseline:**

```bash
# Record latency before upgrade
hey -n 1000 -c 10 http://staging-gateway/api/test
```

## Running the Upgrade in Staging

Now perform the upgrade in staging using the exact same procedure you plan to use in production:

```bash
# If using istioctl
export PATH=$PWD/istio-1.21.0/bin:$PATH
istioctl x precheck
istioctl upgrade -y
```

Or with Helm:

```bash
helm upgrade istio-base istio/base -n istio-system --version 1.21.0
helm upgrade istiod istio/istiod -n istio-system --version 1.21.0 -f production-istiod-values.yaml --wait
helm upgrade istio-ingressgateway istio/gateway -n istio-system --version 1.21.0 -f production-gateway-values.yaml --wait
```

Watch the upgrade:

```bash
kubectl rollout status deployment/istiod -n istio-system
```

Restart sidecar proxies:

```bash
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n $ns
done
```

## Post-Upgrade Validation in Staging

Run your complete test plan:

```bash
# Check for configuration issues
istioctl analyze --all-namespaces

# Compare proxy status with baseline
istioctl proxy-status

# Run the same traffic tests
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" http://staging-gateway/api/test
done | sort | uniq -c

# Compare latency
hey -n 1000 -c 10 http://staging-gateway/api/test
```

Look for:

- Any new warnings or errors from `istioctl analyze`
- Proxy sync issues
- Increased error rates
- Higher latency
- Certificate or TLS errors

If you are running Prometheus and Grafana in staging, check the Istio dashboards for anomalies.

## What to Do When Staging Tests Fail

If you find issues during staging testing, you have three options:

1. **Fix the issue.** Maybe a VirtualService needs updating for the new version. Fix it in staging, verify, then apply the same fix in production before upgrading.

2. **Report the bug.** If you found an Istio bug, report it upstream and wait for a patch release.

3. **Delay the upgrade.** If the issue is significant and the fix is not straightforward, postpone the production upgrade until there is a solution.

Document every issue you find and its resolution. This documentation becomes your production upgrade runbook.

## Automating Staging Tests

For teams doing regular upgrades, automate the staging test cycle:

```bash
#!/bin/bash
set -e

VERSION=$1
STAGING_CONTEXT="staging-cluster"

echo "Testing Istio upgrade to $VERSION in staging"

# Record baseline
kubectl --context=$STAGING_CONTEXT exec deploy/sleep -n test-app -- curl -s httpbin.test-app:80/status/200
istioctl --context=$STAGING_CONTEXT proxy-status > pre-upgrade-status.txt

# Perform upgrade
helm upgrade istio-base istio/base -n istio-system --version $VERSION --kube-context=$STAGING_CONTEXT
helm upgrade istiod istio/istiod -n istio-system --version $VERSION --kube-context=$STAGING_CONTEXT --wait
helm upgrade istio-ingressgateway istio/gateway -n istio-system --version $VERSION --kube-context=$STAGING_CONTEXT --wait

# Restart sidecars
for ns in $(kubectl --context=$STAGING_CONTEXT get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl --context=$STAGING_CONTEXT rollout restart deployment -n $ns
  kubectl --context=$STAGING_CONTEXT rollout status deployment -n $ns --timeout=300s
done

# Validate
istioctl --context=$STAGING_CONTEXT analyze --all-namespaces
istioctl --context=$STAGING_CONTEXT proxy-status > post-upgrade-status.txt

# Run traffic tests
PASS=0
FAIL=0
for i in $(seq 1 100); do
  CODE=$(kubectl --context=$STAGING_CONTEXT exec deploy/sleep -n test-app -- curl -s -o /dev/null -w "%{http_code}" httpbin.test-app:80/status/200)
  if [ "$CODE" = "200" ]; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
done

echo "Traffic test: $PASS passed, $FAIL failed"
if [ $FAIL -gt 5 ]; then
  echo "FAIL: Too many errors after upgrade"
  exit 1
fi

echo "Staging upgrade test passed!"
```

Integrate this into your CI/CD pipeline so staging tests run automatically when a new Istio version is available.

## Summary

Testing Istio upgrades in staging before production is the single most effective way to prevent upgrade-related incidents. Set up a staging environment that mirrors your production Istio configuration, run the exact same upgrade procedure you will use in production, and validate thoroughly. Automate the process so it becomes a routine part of your upgrade workflow rather than a special event. The time invested in staging tests pays back every single time you catch an issue before it reaches production.
