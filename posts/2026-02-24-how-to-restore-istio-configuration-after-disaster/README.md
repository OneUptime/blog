# How to Restore Istio Configuration After Disaster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Disaster Recovery, Kubernetes, Backups, Restoration

Description: A detailed walkthrough of restoring Istio mesh configuration from backups after a cluster failure, including the correct order of operations and common pitfalls.

---

Nobody wants to deal with a disaster recovery scenario, but when it happens, the last thing you want is to be figuring out the restoration process under pressure. Having a tested, documented procedure for restoring Istio configuration can turn a multi-hour outage into a 30-minute recovery.

The restoration process isn't just "kubectl apply everything." The order matters, dependencies matter, and there are some gotchas that will trip you up if you're not prepared.

## Before You Start

Make sure these prerequisites are in place:

1. A working Kubernetes cluster (new or repaired)
2. Istio installed at the same version as your backup
3. Access to your Istio configuration backups
4. kubectl configured to talk to the target cluster

Check that the Istio CRDs are registered:

```bash
kubectl get crd | grep istio
```

You should see entries like:

```text
destinationrules.networking.istio.io
envoyfilters.networking.istio.io
gateways.networking.istio.io
peerauthentications.security.istio.io
...
```

If the CRDs aren't there, install Istio first.

## Step 1: Install Istio

If you're restoring to a fresh cluster, you need Istio installed before you can apply any configuration. Use the same IstioOperator configuration you had before:

```bash
# If you backed up your IstioOperator resource
istioctl install -f backup/istiooperator.yaml

# Or if using Helm
helm install istio-base istio/base -n istio-system --create-namespace
helm install istiod istio/istiod -n istio-system --values backup/helm-values.yaml
```

Wait for Istiod to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s
```

## Step 2: Restore Certificates (If Using Custom CA)

If you were using custom CA certificates, restore them before anything else. The certificates need to be in place before Istiod starts issuing workload certificates:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=backup/ca-cert.pem \
  --from-file=backup/ca-key.pem \
  --from-file=backup/root-cert.pem \
  --from-file=backup/cert-chain.pem
```

Then restart Istiod to pick up the certificates:

```bash
kubectl rollout restart deployment/istiod -n istio-system
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s
```

## Step 3: Restore Namespace Labels

Before restoring workloads, make sure the namespace labels are correct. These control sidecar injection:

```bash
# Re-label namespaces for injection
kubectl label namespace default istio-injection=enabled --overwrite
kubectl label namespace my-app istio-injection=enabled --overwrite
```

Or if you backed up the namespace manifests:

```bash
# Be selective - don't apply system namespace changes
kubectl apply -f backup/namespaces.yaml
```

## Step 4: Restore Configuration in Order

The order of restoration matters because some resources reference others. Here's the correct sequence:

**First, apply PeerAuthentication and RequestAuthentication:**

```bash
kubectl apply -f backup/peerauthentications.yaml
kubectl apply -f backup/requestauthentications.yaml
```

These define the authentication mode for the mesh. Applying them early prevents any mTLS conflicts when services start communicating.

**Second, apply ServiceEntries:**

```bash
kubectl apply -f backup/serviceentries.yaml
```

ServiceEntries define external services. Other resources like VirtualServices and DestinationRules might reference them.

**Third, apply DestinationRules:**

```bash
kubectl apply -f backup/destinationrules.yaml
```

DestinationRules define traffic policies and subsets that VirtualServices reference.

**Fourth, apply Gateways:**

```bash
kubectl apply -f backup/gateways.yaml
```

**Fifth, apply VirtualServices:**

```bash
kubectl apply -f backup/virtualservices.yaml
```

VirtualServices often reference Gateways and DestinationRule subsets, so those need to exist first.

**Sixth, apply remaining resources:**

```bash
kubectl apply -f backup/authorizationpolicies.yaml
kubectl apply -f backup/sidecars.yaml
kubectl apply -f backup/envoyfilters.yaml
kubectl apply -f backup/telemetry.yaml
```

## Step 5: Handle Resource Conflicts

If you're restoring to a cluster that already has some Istio configuration, you might hit conflicts. The `--force` flag can help, but use it carefully:

```bash
# Apply with server-side apply to handle conflicts
kubectl apply -f backup/virtualservices.yaml --server-side --force-conflicts
```

For individual resources that conflict:

```bash
# Delete and recreate
kubectl delete virtualservice my-vs -n my-namespace
kubectl apply -f backup/virtualservices/my-namespace_my-vs.yaml
```

## Handling Individual Resource Backups

If your backups are per-resource files (from a Git-based backup), apply them directory by directory:

```bash
for dir in peerauthentications requestauthentications serviceentries destinationrules gateways virtualservices authorizationpolicies sidecars envoyfilters telemetry; do
  if [ -d "backup/$dir" ]; then
    echo "Restoring $dir..."
    kubectl apply -f "backup/$dir/"
  fi
done
```

## Restoring with Velero

If you used Velero for backups, restoration is straightforward:

```bash
# List available backups
velero backup get

# Restore from a specific backup
velero restore create --from-backup istio-backup-20260224

# Check restore status
velero restore describe istio-backup-20260224
```

To restore only Istio resources (not everything in the backup):

```bash
velero restore create --from-backup full-cluster-backup \
  --include-resources virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,peerauthentications,requestauthentications,authorizationpolicies,telemetry
```

## Verifying the Restoration

After applying everything, verify that the restoration was successful:

```bash
# Count resources
echo "Restored resources:"
for resource in virtualservices destinationrules gateways serviceentries peerauthentications authorizationpolicies envoyfilters; do
  count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
  echo "  $resource: $count"
done

# Check for any resources in error state
istioctl analyze --all-namespaces

# Verify proxy sync
istioctl proxy-status
```

The `istioctl analyze` command is particularly important. It will catch configuration errors like VirtualServices referencing non-existent Gateways, or DestinationRules with undefined subsets.

## Post-Restoration Steps

After the configuration is restored, you'll likely need to restart workloads to pick up the restored configuration:

```bash
# Restart all deployments in affected namespaces
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "Restarting deployments in $ns..."
  kubectl rollout restart deployment -n "$ns"
done
```

Then verify traffic is flowing correctly:

```bash
# Check that sidecars are injected
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'

# Test connectivity
kubectl exec deploy/sleep -n default -- curl -s http://httpbin.default:8080/get
```

## Common Pitfalls

A few things that commonly trip people up during restoration:

**Version mismatch**: If you restore Istio v1.20 configuration to a cluster running v1.22, some fields might have changed or been deprecated. Always try to match versions.

**Missing CRDs**: If a CRD doesn't exist in the target cluster, kubectl apply will silently fail. Always verify CRDs are installed first.

**Resource version conflicts**: Backups may include `resourceVersion` fields that conflict. Make sure your cleanup script removes these before restoration.

**Ordering issues**: Applying a VirtualService that references a Gateway that doesn't exist yet will succeed (Kubernetes doesn't validate cross-resource references), but the configuration won't work until the Gateway is created.

The best disaster recovery is one you've practiced. Run through this process in a test environment before you ever need it for real. That practice run will expose any issues with your backup format, ordering, or automation scripts.
