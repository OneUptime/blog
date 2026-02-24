# How to Troubleshoot Istio Upgrade Problems

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Upgrade, Troubleshooting, Kubernetes, Service Mesh

Description: Diagnose and fix common problems that occur during Istio upgrades including version skew issues, CRD conflicts, sidecar mismatches, and control plane failures.

---

Upgrading Istio is one of those tasks that should be routine but somehow always manages to surprise you. The upgrade itself might go smoothly, and then an hour later you start seeing weird errors because some sidecars are running the old version while the control plane is on the new version. Or the upgrade hangs because a CRD schema change conflicts with existing resources.

This guide covers the most common Istio upgrade problems and how to get past them.

## Pre-Upgrade Checks

Before you start troubleshooting upgrade failures, here is what you should have checked before upgrading:

```bash
# Check current version
istioctl version

# Check if the upgrade path is supported (only 1 minor version jump)
# For example, 1.19 -> 1.20 is supported, 1.18 -> 1.20 is not

# Run pre-upgrade checks
istioctl x precheck

# Analyze existing configuration for compatibility
istioctl analyze --all-namespaces
```

The `istioctl x precheck` command checks for common issues that would cause an upgrade to fail. If it reports problems, fix them before proceeding.

## Control Plane Upgrade Failures

If the new istiod fails to start after upgrading:

```bash
# Check istiod pod status
kubectl get pods -n istio-system -l app=istiod

# Check the logs of the failing pod
kubectl logs -n istio-system deployment/istiod

# If the pod is in CrashLoopBackOff, check previous logs
kubectl logs -n istio-system deployment/istiod --previous
```

Common control plane failures:

**1. CRD version conflict**: New Istio versions often update CRDs. If the CRD update fails, istiod might not start:

```bash
# Check CRD status
kubectl get crds | grep istio

# Check if CRDs have been updated
kubectl get crd virtualservices.networking.istio.io -o jsonpath='{.spec.versions[*].name}'
```

If CRDs were not updated, apply them manually:

```bash
# For Helm-based installation
helm upgrade istio-base istio/base -n istio-system

# For istioctl installation
istioctl install --set profile=default
```

**2. Webhook configuration mismatch**: The validating and mutating webhooks might reference the old version:

```bash
# Check webhook configurations
kubectl get mutatingwebhookconfiguration -o name | grep istio
kubectl get validatingwebhookconfiguration -o name | grep istio

# Check what service/endpoint they point to
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o jsonpath='{.webhooks[0].clientConfig}'
```

**3. Resource quota exceeded**: The new istiod might request more resources:

```bash
# Check if resource quotas are blocking the new pod
kubectl describe pod -n istio-system -l app=istiod | grep -A 5 "Events"
```

## Version Skew Problems

The most common post-upgrade issue is version skew between the control plane and data plane (sidecars). Istio supports a version difference of up to one minor version, but mixing versions can still cause problems.

Check for version mismatches:

```bash
# See all proxy versions in the mesh
istioctl proxy-status

# Find pods running old sidecar versions
istioctl proxy-status | grep -v $(istioctl version --short 2>/dev/null | head -1)
```

Fix version skew by restarting deployments to pick up the new sidecar:

```bash
# Restart all deployments in a namespace
kubectl rollout restart deployment -n production

# Or restart specific deployments
kubectl rollout restart deployment orders-service -n production
```

For large clusters, roll this out gradually:

```bash
#!/bin/bash

NAMESPACES=("staging" "production-canary" "production")
NEW_VERSION=$(istioctl version --short 2>/dev/null | head -1)

for ns in "${NAMESPACES[@]}"; do
  echo "Restarting deployments in $ns"
  DEPLOYMENTS=$(kubectl get deployments -n "$ns" -o name)

  for deploy in $DEPLOYMENTS; do
    kubectl rollout restart "$deploy" -n "$ns"
    kubectl rollout status "$deploy" -n "$ns" --timeout=300s

    # Check that the new sidecar version is running
    POD=$(kubectl get pods -n "$ns" -l "$(kubectl get "$deploy" -n "$ns" -o jsonpath='{.spec.selector.matchLabels}' | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')" -o name | head -1)

    PROXY_VERSION=$(istioctl proxy-status | grep "$(echo $POD | sed 's/pod\///')" | awk '{print $NF}')
    echo "  $deploy: proxy version $PROXY_VERSION"
  done

  echo "Waiting 5 minutes before next namespace..."
  sleep 300
done
```

## Canary Upgrade Problems

If you are using revision-based canary upgrades and running into issues:

```bash
# Check both control plane versions
kubectl get pods -n istio-system -l app=istiod

# Check which revision each namespace is using
kubectl get namespaces -L istio.io/rev -L istio-injection
```

Common canary upgrade issues:

**1. Namespace label conflict**: A namespace has both `istio-injection=enabled` and `istio.io/rev=<revision>`:

```bash
# Remove the old label
kubectl label namespace production istio-injection-

# Set the new revision label
kubectl label namespace production istio.io/rev=1-20
```

**2. Traffic between old and new sidecars fails**: If mTLS certificates are not compatible between revisions, cross-version communication can break. Check the trust domain:

```bash
# Check trust domain on old and new control planes
kubectl get configmap istio -n istio-system -o yaml | grep trustDomain
kubectl get configmap istio-1-20 -n istio-system -o yaml | grep trustDomain
```

Both revisions must share the same root CA. If they do not, you need to set up a shared root CA before upgrading.

## Helm Upgrade Problems

If you use Helm for Istio installation:

```bash
# Check Helm release status
helm list -n istio-system

# Check if the upgrade is in a failed state
helm history istiod -n istio-system
```

If a Helm upgrade is stuck in a failed state:

```bash
# Roll back to the previous version
helm rollback istiod -n istio-system

# If rollback also fails, check for stuck resources
kubectl get jobs -n istio-system
kubectl delete jobs --all -n istio-system
```

After a failed upgrade, Helm secrets might be in a bad state:

```bash
# List Helm secrets
kubectl get secrets -n istio-system -l owner=helm

# If there is a pending-upgrade secret, delete it
kubectl delete secret -n istio-system -l owner=helm,status=pending-upgrade
```

## Gateway Upgrade Issues

If you are using the Istio Gateway (the deployment, not the Gateway resource), it might need separate attention during upgrades:

```bash
# Check gateway pod status
kubectl get pods -n istio-system -l app=istio-ingressgateway

# Check if the gateway is running the correct version
kubectl describe pod -n istio-system -l app=istio-ingressgateway | grep Image
```

If the gateway is not picking up the new version:

```bash
# Restart the gateway
kubectl rollout restart deployment istio-ingressgateway -n istio-system
kubectl rollout status deployment istio-ingressgateway -n istio-system
```

## Post-Upgrade Validation

After completing the upgrade, run a thorough validation:

```bash
# Check all components are running
kubectl get pods -n istio-system

# Verify version consistency
istioctl version

# Run the analyzer
istioctl analyze --all-namespaces

# Check proxy sync status
istioctl proxy-status

# Verify mTLS is working
istioctl authn tls-check <pod-name> -n production

# Test a known service-to-service call
kubectl exec <pod-name> -n production -- curl -v http://other-service:8080/health
```

## Rolling Back a Failed Upgrade

If the upgrade is causing production issues and you need to roll back:

```bash
# For istioctl installations
istioctl install --set profile=default --set tag=<previous-version>

# For Helm installations
helm rollback istiod -n istio-system
helm rollback istio-base -n istio-system

# Restart sidecars to pick up the old version
kubectl rollout restart deployment -n production
```

For revision-based upgrades, rollback is simpler:

```bash
# Switch namespaces back to the old revision
kubectl label namespace production istio.io/rev=<old-revision> --overwrite

# Restart pods to get old sidecars
kubectl rollout restart deployment -n production

# Remove the new revision
istioctl uninstall --revision <new-revision>
```

## Summary

Istio upgrade problems usually fall into three categories: control plane startup failures (check CRDs, webhooks, and resource quotas), version skew issues (restart deployments to update sidecars), and canary upgrade conflicts (watch for duplicate labels and trust domain mismatches). Always run `istioctl x precheck` before upgrading, use revision-based canary upgrades for production environments, and have a tested rollback plan ready. Upgrading one minor version at a time is the safest approach.
