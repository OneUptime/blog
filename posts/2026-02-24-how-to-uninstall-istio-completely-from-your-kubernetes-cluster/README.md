# How to Uninstall Istio Completely from Your Kubernetes Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Uninstall, Kubernetes, Cleanup, Service Mesh

Description: A thorough guide to completely removing Istio from your Kubernetes cluster including all CRDs, webhooks, sidecars, and leftover resources.

---

Uninstalling Istio seems like it should be simple, but it is surprisingly easy to leave behind orphaned resources that cause problems later. Leftover CRDs, stale webhook configurations, or forgotten sidecar containers can interfere with future installations or other tools. This guide walks through a complete removal process.

## Before You Start

Before removing Istio, think about the impact on running workloads:

- Pods with sidecars will keep running, but the sidecar will lose its control plane connection
- mTLS between services will stop working once sidecars cannot reach istiod
- Traffic routing rules (VirtualService, DestinationRule) will stop being applied
- Ingress gateways will go down

Plan a maintenance window or gradually remove sidecars from workloads first.

## Step 1: Remove Sidecar Injection Labels

Stop new pods from getting sidecars:

```bash
# List all namespaces with injection enabled
kubectl get namespaces -l istio-injection=enabled

# Remove the label from each namespace
kubectl label namespace my-app istio-injection-

# Also check for revision labels
kubectl get namespaces -l istio.io/rev

# Remove revision labels
kubectl label namespace my-app istio.io/rev-
```

## Step 2: Restart Workloads to Remove Sidecars

After removing injection labels, restart deployments so pods come up without sidecars:

```bash
# Restart all deployments in a namespace
kubectl rollout restart deployment -n my-app

# Wait for rollout to complete
kubectl rollout status deployment -n my-app --timeout=300s
```

Verify sidecars are gone:

```bash
kubectl get pods -n my-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}'
```

You should only see your application container names, no `istio-proxy`.

Repeat for every namespace that had injection enabled.

## Step 3: Uninstall Istio Using istioctl

If you installed with `istioctl`:

```bash
# Uninstall everything
istioctl uninstall --purge -y
```

The `--purge` flag removes everything, including the `istio-system` namespace resources. Without `--purge`, some resources like the `IstioOperator` custom resource might be left behind.

If you used a specific revision:

```bash
istioctl uninstall --revision stable -y
istioctl uninstall --revision canary -y
```

## Step 4: Uninstall Using Helm

If you installed with Helm, remove charts in reverse order:

```bash
# Remove gateways first
helm uninstall istio-ingress -n istio-ingress
helm uninstall istio-egress -n istio-egress

# Remove istiod
helm uninstall istiod -n istio-system

# Remove CNI if installed
helm uninstall istio-cni -n istio-system

# Remove base (CRDs)
helm uninstall istio-base -n istio-system
```

Check for any remaining Helm releases:

```bash
helm list -A | grep istio
```

## Step 5: Remove Istio CRDs

The `istio-base` Helm chart installs CRDs, but Helm does not delete CRDs on uninstall (by design). Remove them manually:

```bash
kubectl get crds | grep 'istio.io' | awk '{print $1}' | xargs kubectl delete crd
```

Or be more explicit:

```bash
kubectl delete crd \
  authorizationpolicies.security.istio.io \
  destinationrules.networking.istio.io \
  envoyfilters.networking.istio.io \
  gateways.networking.istio.io \
  istiooperators.install.istio.io \
  peerauthentications.security.istio.io \
  proxyconfigs.networking.istio.io \
  requestauthentications.security.istio.io \
  serviceentries.networking.istio.io \
  sidecars.networking.istio.io \
  telemetries.telemetry.istio.io \
  virtualservices.networking.istio.io \
  wasmplugins.extensions.istio.io \
  workloadentries.networking.istio.io \
  workloadgroups.networking.istio.io
```

Note: Deleting CRDs will also delete all instances of those custom resources across the cluster. Make sure you have backups if you need them.

## Step 6: Remove Webhook Configurations

Check for leftover webhooks:

```bash
kubectl get mutatingwebhookconfiguration | grep istio
kubectl get validatingwebhookconfiguration | grep istio
```

Remove them:

```bash
kubectl delete mutatingwebhookconfiguration istio-sidecar-injector
kubectl delete mutatingwebhookconfiguration istio-revision-tag-default
kubectl delete validatingwebhookconfiguration istio-validator-istio-system
kubectl delete validatingwebhookconfiguration istiod-default-validator
```

This step is critical. Leftover mutating webhooks will cause pod creation to fail if they try to reach a non-existent istiod.

## Step 7: Remove Namespaces

```bash
kubectl delete namespace istio-system
kubectl delete namespace istio-ingress
kubectl delete namespace istio-egress
```

If a namespace gets stuck in `Terminating` state, it is usually because a finalizer is waiting for a resource that no longer exists. Check:

```bash
kubectl get namespace istio-system -o json | jq '.status'
```

Force delete if needed:

```bash
kubectl get namespace istio-system -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/istio-system/finalize" -f -
```

## Step 8: Clean Up Cluster-Wide Resources

Istio creates some cluster-scoped resources. Check for leftovers:

```bash
# ClusterRoles
kubectl get clusterroles | grep istio
kubectl delete clusterroles -l app=istio-reader -l app=istiod

# ClusterRoleBindings
kubectl get clusterrolebindings | grep istio
kubectl delete clusterrolebindings -l app=istio-reader -l app=istiod

# Check for stale service accounts in other namespaces
kubectl get serviceaccounts -A | grep istio
```

Clean up:

```bash
kubectl get clusterroles | grep istio | awk '{print $1}' | xargs kubectl delete clusterrole
kubectl get clusterrolebindings | grep istio | awk '{print $1}' | xargs kubectl delete clusterrolebinding
```

## Step 9: Remove Istio Labels and Annotations

Clean up labels that Istio adds to resources:

```bash
# Remove istio labels from namespaces
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  kubectl label namespace $ns istio-injection- 2>/dev/null
  kubectl label namespace $ns istio.io/rev- 2>/dev/null
done
```

## Step 10: Verify Complete Removal

Run a final check to make sure everything is gone:

```bash
echo "=== Istio CRDs ==="
kubectl get crds | grep istio.io

echo ""
echo "=== Istio Namespaces ==="
kubectl get ns | grep istio

echo ""
echo "=== Istio Webhooks ==="
kubectl get mutatingwebhookconfiguration | grep istio
kubectl get validatingwebhookconfiguration | grep istio

echo ""
echo "=== Istio ClusterRoles ==="
kubectl get clusterroles | grep istio

echo ""
echo "=== Istio ClusterRoleBindings ==="
kubectl get clusterrolebindings | grep istio

echo ""
echo "=== Pods with istio-proxy ==="
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep istio-proxy
```

If everything comes back empty, Istio is fully removed.

## Removing CNI Plugin Files

If you used the Istio CNI plugin, its binary and config might still be on the nodes:

```bash
# Check for CNI files on a node
kubectl debug node/<node-name> -it --image=busybox -- ls /host/opt/cni/bin/ | grep istio
kubectl debug node/<node-name> -it --image=busybox -- cat /host/etc/cni/net.d/10-calico.conflist | grep istio
```

The CNI DaemonSet should clean up after itself when deleted, but verify to be sure.

## What If You Need to Reinstall?

After a complete removal, you can reinstall Istio cleanly:

```bash
# Verify nothing is left
istioctl verify-install 2>&1 | head -5

# Fresh install
istioctl install --set profile=default -y
```

A clean slate avoids conflicts with previous installations.

## Wrapping Up

The key to a clean Istio removal is being thorough. The `istioctl uninstall --purge` command handles most of it, but CRDs, webhooks, and cluster-scoped RBAC resources need manual cleanup. Always verify the removal with a final check before considering the job done. Leftover webhooks are the most dangerous remnant because they can break pod scheduling across the entire cluster.
