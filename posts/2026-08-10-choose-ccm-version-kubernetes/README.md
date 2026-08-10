# How to Choose a cloud-controller-manager Version That Matches Your Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Version Skew, Upgrade, Compatibility, Release Management

Description: Select an external CCM from the provider's compatibility matrix, apply Kubernetes control-plane skew rules, and upgrade it in the safe order.

---

Choose a cloud-controller-manager (CCM) version from the provider project's compatibility matrix, not from a generic “latest” tag. External providers release independently from Kubernetes, so version numbering often—but not universally—tracks the Kubernetes minor. The provider can impose a stricter compatibility contract than Kubernetes' general component skew policy.

For current upstream Kubernetes, `cloud-controller-manager` must not be newer than any `kube-apiserver` instance it can reach. It is expected to match the API server minor and may be one minor older to permit live upgrades. That rule defines an outer bound; the provider's tested matrix chooses the actual supported release.

## Apply Compatibility Rules in the Right Order

Use this priority:

1. The managed Kubernetes service or cluster distribution's supported add-on version, if it owns CCM lifecycle.
2. The provider CCM's official version matrix and support policy.
3. The cluster lifecycle tool's compatibility and installation documentation.
4. Kubernetes' version skew policy.
5. The CCM release notes, security advisories, and image availability for your architecture.

Do not override a managed control-plane component because upstream has a newer tag. The service may patch or bundle the provider integration differently.

## Inventory Every API Server Version

In an HA upgrade, a CCM can reach an older API server through the control-plane load balancer. It cannot be newer than that oldest reachable server. On a kubeadm-style self-managed control plane, inspect the mirrored API server static Pods with:

```bash
kubectl get pods -n kube-system -l component=kube-apiserver \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[?(@.name=="kube-apiserver")].image}{"\n"}{end}'

kubectl version
```

`kubectl version` reports only the API server that handles that request, not every HA backend. Managed services and distributions that hide or label control-plane Pods differently require their own inventory mechanism.

Suppose API servers are temporarily v1.35 and v1.36. A CCM that can reach either must not be v1.36 because it would be newer than the v1.35 API server. Keep it at v1.35 until all reachable API servers are v1.36, then upgrade CCM. Kubernetes documents no required order among `kube-controller-manager`, `kube-scheduler`, and CCM after API servers are ready.

This does not guarantee a provider v1.35 CCM supports a v1.36 API server. Confirm the provider matrix and migration notes.

## Read the Provider Matrix Literally

Some providers publish matching releases such as CCM v1.36.x for Kubernetes v1.36.x. Others use v0.x numbering, separate component versions, or a chart version distinct from the image version. Record all of these:

```text
Kubernetes minor:
Provider CCM release:
Helm chart release:
Container image repository and digest:
Required cloud config API/version:
Supported CPU architectures:
Required RBAC/IAM revision:
Required companion node component:
CSI and credential-provider versions:
```

For example, the official vSphere cloud provider states that compatibility is guaranteed between a provider release and its corresponding Kubernetes version and publishes a minor-version matrix. That is a provider-specific contract, not proof that every CCM uses the same scheme.

Do not mistake a chart `appVersion` for the chart's own version. Render the chart and inspect the final image:

```bash
helm show chart PROVIDER_REPOSITORY/CCM_CHART --version CHART_VERSION
helm template ccm PROVIDER_REPOSITORY/CCM_CHART \
  --version CHART_VERSION -f values.yaml > rendered.yaml
grep -n 'image:' rendered.yaml
```

Pin an exact tag or, where your delivery tooling supports it, a verified digest. Avoid `latest`, a moving `master` build, or an unqualified registry mirror.

## Compatibility Includes More Than the Kubernetes API

A CCM can start and list Nodes yet still be incompatible. Review changes in:

- cloud-config schema and deprecated flags;
- provider SDK behavior and API versions;
- Node address and ProviderID canonicalization;
- topology label behavior;
- load-balancer annotations, finalizers, and adoption rules;
- route-controller defaults and CNI expectations;
- leader-election resource names and migration support;
- cloud IAM actions or role trust;
- Kubernetes RBAC rules and API subresources;
- probes, metrics, secure serving, and scrape configuration; and
- companion components such as a separate cloud-node-manager.

Storage compatibility belongs to the CSI driver. A matching CCM version does not imply the provider CSI release matches the Kubernetes minor.

## Use the Safe Upgrade Order

For a normal minor upgrade from N to N+1:

1. Bring forward any kubelet or kube-proxy instances already three minors behind the current API server, then upgrade current components to supported current-minor patches.
2. Review the provider's specific migration and release notes.
3. Upgrade all API servers the CCM can reach to N+1, following HA version-skew policy.
4. Upgrade CCM to the provider-supported release for Kubernetes N+1.
5. Upgrade or roll kubelets and other components in the documented order.

For an HA in-tree-to-external migration from a Kubernetes release that still contains the in-tree provider, use the provider procedure and Kubernetes Controller Manager Leader Migration where supported. That transition can intentionally coordinate a version-N `kube-controller-manager` running in-tree controllers with an external CCM built for Kubernetes N+1 through a shared Lease; do not replace it with an ordinary image rollout.

Never skip Kubernetes minor versions for the API server. A CCM matrix listing both endpoints does not make a skipped control-plane upgrade supported.

## Canary the Behaviors That Matter

Test a canary control plane or non-production cluster with production-like resources. At minimum verify:

```bash
# Image and arguments
kubectl get pod -n kube-system CCM_POD -o json | jq '{
  images: [.spec.containers[].image],
  commands: [.spec.containers[] | (.command // []) + (.args // [])]
}'

# Node initialization
kubectl get nodes -o custom-columns=NAME:.metadata.name,PROVIDER_ID:.spec.providerID,TAINTS:.spec.taints

# Leadership and recent errors; use the provider's Lease and container names
kubectl get lease -n kube-system CCM_LEASE \
  -o custom-columns=NAME:.metadata.name,HOLDER:.spec.holderIdentity,RENEWED:.spec.renewTime
kubectl logs -n kube-system CCM_LEADER_POD -c CCM_CONTAINER --since=30m
```

Create and remove one canary Node. Create, update, and delete one disposable `LoadBalancer` Service. If provider routes are enabled, compare routes before and after the canary Node. Check provider audit logs for unexpected replacement or deletion.

Version selection is not validated by a Running Pod alone. A leader can run while a disabled controller, unknown annotation, changed default, or IAM mismatch silently prevents convergence.

## Rollback Planning

Before rollout, determine whether the older CCM can read objects or cloud resources mutated by the newer release. Check finalizer, annotation, and load-balancer adoption changes. Preserve the old manifest and config, but do not assume an image rollback is safe after external resources have changed.

Stop the rollout on:

- repeated leader loss;
- new uninitialized Nodes;
- ProviderID or address changes on existing Nodes;
- cloud API denials or throttling spikes;
- route churn;
- unexpected load-balancer replacement; or
- reconciliation panics and incompatible config errors.

Use provider-supported rollback and verify ownership before restoring traffic.

## Current Upstream Context

As of Kubernetes v1.36 documentation, maintained upstream release branches are v1.36, v1.35, and v1.34. That window changes over time; do not hard-code it into long-lived automation. Query current Kubernetes support and provider release pages during every upgrade.

Kubernetes v1.31+ has no in-tree provider fallback. If a compatible CCM release is unavailable for a cluster that depends on that provider integration, the planned upgrade is blocked. Leaving a historical provider name on core components is not a supported bridge.

## Official Documentation

- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Migrate a replicated control plane to CCM](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Kubernetes: Completing the cloud provider migration](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [Official vSphere cloud provider compatibility matrix](https://github.com/kubernetes/cloud-provider-vsphere/blob/master/README.md#compatibility-with-kubernetes)
- [Kubernetes releases and support](https://kubernetes.io/releases/)

## Conclusion

The correct CCM version is the provider-tested release for your exact Kubernetes minor and installation method, constrained by Kubernetes skew rules. During HA upgrades, keep CCM no newer than the oldest API server it can reach. Pin and render the real image, review config and IAM changes, then validate Node, route, Service, leadership, and rollback behavior. “Latest” is a release stream, not a compatibility decision.
