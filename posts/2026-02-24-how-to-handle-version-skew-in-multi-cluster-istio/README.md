# How to Handle Version Skew in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Version Management, Kubernetes, Upgrades

Description: Practical strategies for managing version skew between Istio control planes and data planes across multiple Kubernetes clusters.

---

Running Istio across multiple clusters means you will inevitably deal with version skew. Maybe you are upgrading cluster A to Istio 1.22 while cluster B still runs 1.21. Or perhaps your data plane proxies in one cluster are a version behind the control plane in another. Either way, version skew is something you need to plan for and manage carefully.

Istio has an official version skew policy, and understanding it is the difference between a smooth multi-cluster operation and mysterious failures that are incredibly hard to debug.

## Istio Version Compatibility Policy

Istio supports one minor version of skew between the control plane and data plane. That means if your control plane is running 1.22, your sidecar proxies can be running 1.21 or 1.22. Running 1.20 sidecars with a 1.22 control plane is not supported and may cause unpredictable behavior.

For multi-cluster setups, Istio also supports one version of skew between control planes in different clusters. So if cluster A runs Istio 1.22 and cluster B runs Istio 1.21, that is fine. But cluster A on 1.22 and cluster B on 1.20 is not supported.

Check your current versions across clusters:

```bash
# Control plane version in each cluster
istioctl version --context=cluster-a
istioctl version --context=cluster-b

# Data plane versions
istioctl proxy-status --context=cluster-a
istioctl proxy-status --context=cluster-b
```

## Planning a Rolling Upgrade

The recommended approach for upgrading Istio in a multi-cluster setup is a rolling upgrade: one cluster at a time, validating each step before moving to the next.

Here is the order you should follow:

1. Upgrade the control plane in cluster A
2. Verify cluster A is healthy
3. Upgrade the data plane in cluster A
4. Verify cross-cluster communication still works
5. Upgrade the control plane in cluster B
6. Verify cluster B is healthy
7. Upgrade the data plane in cluster B
8. Final verification

## Upgrading the Control Plane

Use canary upgrades for the control plane. This lets you run two versions of istiod side by side and gradually migrate workloads.

Install the canary control plane:

```bash
istioctl install --set revision=1-22 \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-a \
  --set values.global.network=network-a \
  --context=cluster-a
```

Verify both revisions are running:

```bash
kubectl get pods -n istio-system --context=cluster-a -l app=istiod
```

You should see pods for both the old and new revisions.

## Migrating Workloads to the New Revision

Once the new control plane is running, migrate workloads by updating the namespace label:

```bash
# Remove the old injection label
kubectl label namespace default istio-injection- --context=cluster-a

# Add the new revision label
kubectl label namespace default istio.io/rev=1-22 --context=cluster-a

# Restart workloads to pick up the new sidecar
kubectl rollout restart deployment -n default --context=cluster-a
```

Verify the new sidecars are connected to the new control plane:

```bash
istioctl proxy-status --context=cluster-a --revision=1-22
```

## Handling Version Skew During Upgrades

During the upgrade window, you will have version skew between clusters. Here are the things to watch out for.

**API Compatibility**

Different Istio versions may support different API versions. For example, one version might use `networking.istio.io/v1beta1` while the newer version prefers `networking.istio.io/v1`. During the skew period, use the API version supported by both clusters.

Check which API versions are available:

```bash
kubectl api-resources --api-group=networking.istio.io --context=cluster-a
kubectl api-resources --api-group=networking.istio.io --context=cluster-b
```

**xDS Protocol Compatibility**

The Istio control plane communicates with sidecars using the xDS protocol. Version skew can cause issues if the newer control plane sends configuration that older proxies do not understand.

Monitor for xDS sync errors:

```bash
kubectl logs -n istio-system deploy/istiod --context=cluster-a | grep -i "nack\|error\|rejected"
```

**mTLS Handshake Issues**

If the CA configuration or certificate format changes between versions, you might see mTLS failures during the skew period. Check for TLS errors:

```bash
istioctl proxy-config log deploy/my-app --level connection:debug --context=cluster-a
kubectl exec deploy/my-app -c istio-proxy --context=cluster-a -- \
  pilot-agent request GET stats | grep ssl.handshake
```

## Automated Version Checking

Create a simple script that checks for version skew across your clusters and alerts if it exceeds the supported range:

```bash
#!/bin/bash

CLUSTERS=("cluster-a" "cluster-b" "cluster-c")
VERSIONS=()

for cluster in "${CLUSTERS[@]}"; do
  version=$(istioctl version --context="$cluster" -o json 2>/dev/null | \
    jq -r '.meshVersion[0].Info.version // "unknown"')
  VERSIONS+=("$cluster:$version")
  echo "Cluster $cluster: Istio $version"
done

# Extract minor versions and check skew
echo ""
echo "Checking version skew..."

minor_versions=()
for entry in "${VERSIONS[@]}"; do
  cluster=$(echo "$entry" | cut -d: -f1)
  version=$(echo "$entry" | cut -d: -f2)
  minor=$(echo "$version" | cut -d. -f1-2)
  minor_versions+=("$minor")
done

unique_versions=($(echo "${minor_versions[@]}" | tr ' ' '\n' | sort -u))

if [ ${#unique_versions[@]} -le 2 ]; then
  echo "Version skew is within acceptable range"
else
  echo "WARNING: Version skew exceeds supported range!"
  echo "Unique versions found: ${unique_versions[*]}"
fi
```

## Dealing with Feature Gates

Different Istio versions have different feature gates, and some features might be alpha in one version and beta in another. During version skew, only use features that are stable in both versions.

Check available features for each version:

```bash
istioctl profile dump --context=cluster-a | grep -A 5 "features"
```

If you are using a feature that was recently promoted from alpha to beta, make sure both clusters support it before relying on it in cross-cluster configurations.

## Rollback Strategy

Always have a rollback plan. If something goes wrong during the upgrade, you need to be able to revert quickly.

For canary upgrades, rollback is straightforward:

```bash
# Move workloads back to the old revision
kubectl label namespace default istio.io/rev- --context=cluster-a
kubectl label namespace default istio-injection=enabled --context=cluster-a

# Restart workloads
kubectl rollout restart deployment -n default --context=cluster-a

# Remove the canary control plane
istioctl uninstall --revision=1-22 --context=cluster-a
```

For in-place upgrades, you would need to downgrade:

```bash
istioctl install --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-a \
  --set values.global.network=network-a \
  --set tag=1.21.0 \
  --context=cluster-a
```

## Monitoring During Version Skew

Set up dashboards and alerts specifically for the upgrade period:

```promql
# Track control plane version
pilot_info{cluster=~"cluster-.*"}

# Monitor proxy sync failures
pilot_proxy_convergence_time_bucket{cluster=~"cluster-.*"}

# Watch for increased error rates during upgrade
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (source_cluster, destination_cluster)
```

## Best Practices

- Never skip more than one minor version in an upgrade. If you are on 1.20, go to 1.21 first, then 1.22.
- Always upgrade the control plane before the data plane. The control plane is backward compatible with older proxies, but newer proxies may not work with older control planes.
- Test the upgrade process in a staging environment that mirrors your multi-cluster production setup.
- Keep upgrade windows short. The longer you run with version skew, the more likely you are to hit compatibility issues.
- Document which version each cluster is running and when the last upgrade happened. This information is surprisingly easy to lose track of.

Version skew in multi-cluster Istio is manageable as long as you stay within the supported skew range, upgrade one cluster at a time, and have proper monitoring and rollback procedures in place.
