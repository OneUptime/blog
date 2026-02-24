# How to Safely Downgrade Istio to a Previous Version

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Downgrade, Rollback

Description: Practical guide to safely downgrading Istio to a previous version when an upgrade causes issues, including data plane and control plane rollback steps.

---

Sometimes an Istio upgrade just does not work out. Maybe the new version introduced a bug that affects your traffic routing. Maybe a configuration change breaks mTLS between services. Maybe performance took a hit and you need to go back while you figure out the root cause. Whatever the reason, knowing how to downgrade Istio safely is a skill worth having before you actually need it.

Downgrading Istio is not as straightforward as upgrading. Istio does not officially support downgrades in the same way, and there are real pitfalls. But it is doable if you follow the right steps.

## The Risks of Downgrading

Before starting, understand what you are getting into:

- **CRD changes may not be backward compatible.** If the newer version added fields to a CRD, the older version might not understand resources that use those fields.
- **Configuration defaults may differ.** The newer version might have changed default values. Going back means those defaults change again.
- **Sidecar-control plane version skew.** During the downgrade, some proxies will be on the newer version talking to an older control plane.
- **Webhooks and validation.** The mutating and validating webhooks need to match the control plane version.

Istio guarantees compatibility between a control plane version N and data plane versions N and N-1. But a control plane at version N-1 talking to proxies at version N is not part of that guarantee. In practice, it usually works for patch versions, but minor version differences can cause problems.

## Step 1: Document the Current State

Before making any changes, capture everything about your current installation:

```bash
# Record current versions
istioctl version > version-before-downgrade.txt

# Export current configuration
kubectl get istiooperator -n istio-system -o yaml > current-operator.yaml

# Save all Istio resources
kubectl get virtualservices,destinationrules,gateways,serviceentries,envoyfilters --all-namespaces -o yaml > istio-resources.yaml

# Record proxy status
istioctl proxy-status > proxy-status-before.txt
```

## Step 2: Get the Old Version of istioctl

You need the istioctl binary that matches the version you are downgrading to:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.5 sh -
export PATH=$PWD/istio-1.20.5/bin:$PATH

# Verify
istioctl version --remote=false
```

## Step 3: Check Resource Compatibility

If you created any Istio resources using API fields that only exist in the newer version, those resources will cause problems after the downgrade. Check for newer API fields:

```bash
# Look for resources that might use new fields
kubectl get virtualservices --all-namespaces -o yaml | grep -v "apiVersion\|kind\|metadata\|spec\|name\|namespace"
```

If you find resources using fields that do not exist in the target version, you need to update or remove them before downgrading.

## Step 4: Downgrade Using istioctl

With the older version of istioctl, run the install command. This effectively overwrites the current installation:

```bash
istioctl install --set profile=default -y
```

If you had custom settings, apply them:

```bash
istioctl install -f your-old-istiooperator.yaml -y
```

Watch the rollout:

```bash
kubectl rollout status deployment/istiod -n istio-system
```

Verify the control plane is now running the old version:

```bash
istioctl version
```

## Step 4b: Downgrade Using Helm (If Helm-Based)

If you originally installed with Helm, use Helm for the downgrade:

```bash
helm upgrade istio-base istio/base -n istio-system --version 1.20.5
helm upgrade istiod istio/istiod -n istio-system --version 1.20.5 -f your-old-values.yaml --wait
helm upgrade istio-ingressgateway istio/gateway -n istio-system --version 1.20.5 --wait
```

Or if you want a quick rollback and the Helm history is intact:

```bash
helm history istiod -n istio-system
helm rollback istiod <revision-number> -n istio-system
```

## Step 5: Downgrade the Gateways

If the gateways were not covered by the previous step, restart them:

```bash
kubectl rollout restart deployment/istio-ingressgateway -n istio-system
```

Verify the gateway proxy version:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway -o jsonpath='{.items[*].spec.containers[?(@.name=="istio-proxy")].image}'
```

## Step 6: Downgrade Sidecar Proxies

Now you need to restart application workloads so they get sidecar proxies matching the old control plane version.

Prioritize critical workloads first:

```bash
# Restart critical services first
kubectl rollout restart deployment -n production-critical

# Then the rest
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n $ns
done
```

Monitor each restart:

```bash
kubectl rollout status deployment/<deployment-name> -n <namespace>
```

## Step 7: Validate the Downgrade

Run the full validation suite:

```bash
# Check for configuration issues
istioctl analyze --all-namespaces

# Verify all proxies are synced and on the correct version
istioctl proxy-status

# Check for errors in istiod logs
kubectl logs -n istio-system -l app=istiod --tail=200 | grep -i error

# Verify mTLS is working
istioctl authn tls-check <pod-name>.<namespace>
```

Test your applications. Make HTTP requests to your services and verify:

- Correct routing through VirtualServices
- mTLS connectivity between services
- Gateway ingress traffic
- Any custom Istio policies (authorization, rate limiting, etc.)

## Step 8: Clean Up CRDs (If Needed)

If the newer Istio version added CRDs that do not exist in the older version, those CRDs will linger in your cluster. They are usually harmless, but if you want a clean state:

```bash
# List all Istio CRDs
kubectl get crds | grep istio

# Compare with what should exist in your target version
# Only remove CRDs that were added by the newer version
```

Be very careful with CRD deletion. Deleting a CRD removes all instances of that resource type cluster-wide.

## What If the Downgrade Does Not Work?

If you are stuck between versions and nothing seems to work, the nuclear option is a full reinstall:

```bash
# Remove everything
istioctl uninstall --purge -y

# Remove the namespace
kubectl delete namespace istio-system

# Wait for cleanup
kubectl get all -n istio-system

# Reinstall the desired version
istioctl install --set profile=default -y
```

After a full reinstall, you will need to:

1. Re-apply all your Istio resources (VirtualServices, DestinationRules, etc.) from backup
2. Restart all workloads to get fresh sidecar injection
3. Re-verify everything

This is disruptive, so use it only as a last resort.

## Prevention Is Better Than Cure

The best way to handle a bad upgrade is to not get stuck in the first place:

- **Always test upgrades in staging first.** A staging cluster that mirrors production catches most issues.
- **Use canary upgrades in production.** Running two revisions lets you validate before committing.
- **Keep backups of your Istio configuration.** Store IstioOperator YAML and all custom resources in version control.
- **Monitor closely during and after upgrades.** Catch problems in the first few minutes, not the next day.
- **Read the release notes thoroughly.** Many upgrade issues are documented and have known workarounds.

## Summary

Downgrading Istio is possible but comes with risks around CRD compatibility and version skew. The process involves installing the old control plane version, then rolling the sidecar proxies back by restarting workloads. Always capture your configuration before attempting a downgrade, validate thoroughly afterward, and remember that prevention through staging tests and canary upgrades is always better than a production rollback.
