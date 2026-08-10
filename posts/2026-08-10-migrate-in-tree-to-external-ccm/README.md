# How to Migrate from an In-Tree Cloud Provider to an External cloud-controller-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Migration, In-Tree Cloud Provider, Leader Migration, Upgrade

Description: Move cloud-specific Node, route, and Service controllers out of Kubernetes core without dual ownership or an uninitialized-Node outage.

---

Kubernetes removed its in-tree cloud provider integrations from core. Starting with Kubernetes v1.31, old provider names are no longer valid for the core `--cloud-provider` flag; clusters use an external provider-specific cloud-controller-manager (CCM) or no cloud integration.

This is a control-plane ownership migration, not an image swap. Node initialization, cloud lifecycle checks, routes, and `LoadBalancer` Services must move from cloud loops inside `kube-controller-manager` to the external component without leaving no owner—or two owners. Storage and private-registry credential integrations are separate migrations.

## Start with Provider-Specific Documentation

The Kubernetes migration mechanism is shared, but exact source versions, target versions, images, configuration formats, IAM policies, route behavior, and rollout order depend on the provider and cluster lifecycle tool. Before changing flags, record:

- current Kubernetes version and every `kube-apiserver` version in an HA control plane;
- effective `--cloud-provider`, `--cloud-config`, controller selection, CIDR, and route flags;
- provider CCM version matrix and supported migration path;
- Node ProviderIDs, topology labels, addresses, and uninitialized taints;
- every `LoadBalancer` Service, its annotations, class, external address, and backing provider resource;
- cloud routes and each Node's Pod CIDRs;
- persistent volumes and their in-tree or CSI drivers;
- image-pull credential integration;
- cloud IAM principal and policy; and
- how kubeadm, kOps, Cluster API, a distribution, or a managed service owns configuration.

```bash
kubectl version
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion,PROVIDER_ID:.spec.providerID
kubectl get service -A -o json | jq -r '.items[] |
  select(.spec.type=="LoadBalancer") |
  [.metadata.namespace, .metadata.name, (.status.loadBalancer // {})] | @json'
kubectl get pv -o custom-columns=NAME:.metadata.name,CSI:.spec.csi.driver,IN_TREE:.spec.awsElasticBlockStore.volumeID
```

The last in-tree example field is provider-specific and only illustrative. Inspect the full PV specs for the providers you actually use.

## Understand the Four Separate Extractions

External CCM replaces cloud logic that formerly lived in Kubernetes core. It does not replace:

1. **Storage:** install and validate the provider's CSI driver and any documented CSI migration behavior.
2. **Registry authentication:** use a kubelet credential-provider plugin or another supported image-pull credential method where needed.
3. **Control-plane-to-node tunneling:** use the cluster tool's supported networking or Konnectivity design.
4. **Specialized ingress/load balancing:** provider Ingress, Gateway, or Service controllers can remain separate and need explicit ownership.

A cluster can successfully initialize Nodes with the external CCM and still lose disk provisioning because CSI was not migrated. Test each subsystem independently.

## Why a Simple Overlap Is Unsafe

Running both the in-tree and external cloud controllers without coordination can let them reconcile the same Node, route, or load balancer. Disabling the old controllers first can create an availability gap. For a replicated control plane, Kubernetes provides **Controller Manager Leader Migration**: old and new controller managers coordinate selected cloud controllers through a shared Lease while old and new control-plane replicas coexist.

Leader Migration is for a controlled upgrade window. It is not a reason to keep both architectures permanently. The provider implementation must support it, and the exact configuration must follow that provider's documented source and target versions.

## Prepare a Reversible Canary

Use a non-production cluster that matches control-plane replication, CNI routing, node pools, IAM, and load-balancer annotations. Then define acceptance tests:

- a new Node gets a canonical ProviderID, addresses, topology labels, and loses the uninitialized taint;
- an existing Node remains stable and is not matched to the wrong instance;
- a test `LoadBalancer` Service creates, updates, and deletes its provider resource;
- routes converge if the cluster uses provider routes;
- stopping a test instance produces the provider-documented Node lifecycle behavior;
- CSI provision, attach, mount, expand, snapshot, and delete work as required;
- node scale-up and scale-down work with Cluster Autoscaler; and
- rollback leaves no duplicate or orphaned infrastructure.

Back up etcd and provider configuration, but also document how to roll back machine images, kubelet flags, CCM manifests, IAM, and control-plane replicas. An etcd restore cannot undo a load balancer or route already mutated in the provider API.

## A Safe High-Level Sequence

The following is a planning model; provider and cluster-tool instructions determine the executable order.

### 1. Reach a supported source patch

Upgrade within the current minor to the provider's supported patch, review deprecations, and ensure the external CCM release can communicate with the source/target API servers. Kubernetes version skew says CCM must not be newer than any API server it can reach and is normally the same minor, with one-minor-older skew allowed for live upgrades. A provider matrix can be stricter.

### 2. Prepare external dependencies

Install or stage CSI, credential plugins, provider configuration, certificates, RBAC, and cloud IAM. Pin immutable or exact image versions. Confirm the CCM Pod can schedule during bootstrap by tolerating `node.cloudprovider.kubernetes.io/uninitialized` and relevant control-plane taints.

### 3. Configure Leader Migration when required

For the supported N-to-N+1 HA procedure, create the provider-approved `LeaderMigrationConfiguration`. It assigns controllers such as route, service, and cloud-node-lifecycle to the correct component and uses a shared migration Lease. Configure `--enable-leader-migration` and the config path exactly as the Kubernetes and provider procedure describe.

Do not improvise controller names. A wrong name may not coordinate the controller you think it does.

### 4. Roll control-plane replicas in the documented order

During a Leader Migration upgrade, old replicas can run `kube-controller-manager` with in-tree cloud controllers while new replicas run the external CCM and a `kube-controller-manager` configured for external mode. The shared migration lock ensures a migrated controller is active in one manager, not both.

Kubernetes' generic guide explains an N to N+1 replicated-control-plane rollout. Use the provider tool to create or replace one control-plane replica at a time, observe the migration Lease, and stop on unexpected infrastructure changes.

### 5. Change kubelets to external mode safely

Roll worker pools according to the provider procedure. A kubelet using `--cloud-provider=external` creates the uninitialized taint and waits for CCM. Ensure the CCM is healthy before the first canary worker and keep capacity for workloads while Nodes drain and replace.

### 6. Prove all controllers before removing legacy state

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,PROVIDER_ID:.spec.providerID,TAINTS:.spec.taints
kubectl get leases -A | grep -iE 'cloud|migration'
kubectl get events -A --sort-by=.lastTimestamp | tail -100
kubectl get service -A -o json | jq -r '.items[] |
  select(.spec.type=="LoadBalancer") |
  [.metadata.namespace, .metadata.name, (.status.loadBalancer // {})] | @json'
```

Compare provider routes, target membership, health checks, audit logs, and API error rates. Exercise update and deletion, not just creation.

### 7. Finish and remove obsolete ownership

Once every control-plane and worker component uses the external design, remove legacy flags, feature gates, configs, credentials, RBAC, and controller selection only as directed. Leader Migration can be left enabled or disabled after migration according to the Kubernetes guide, but no old in-tree controller should remain as an accidental owner.

## Current-Version Reality

If the cluster is already at Kubernetes v1.31 or later, it cannot still run the removed in-tree provider code in unmodified core binaries. A configuration containing a historical provider name is a startup failure or evidence of a distribution-specific fork. Do not use the old overlap procedure blindly on a current cluster. Identify the actual binary and fork, then migrate from a supported source release with the vendor.

Kubernetes v1.29 allowed a temporary opt-back through feature gates for some remaining in-tree providers. That was a transition mechanism, not a supported path in v1.31+. The durable target is external CCM or no provider.

## Rollback Triggers

Pause or roll back through the tested provider procedure if:

- ProviderID or addresses change on existing Nodes;
- uninitialized taints accumulate;
- migration Lease ownership thrashes;
- both controller managers emit reconciliation for the same resource;
- cloud routes disappear or duplicate;
- `LoadBalancer` Services replace rather than adopt existing resources unexpectedly;
- API denials or throttling spike; or
- CSI or autoscaling acceptance tests fail.

Do not attempt rollback by merely changing flags on all replicas simultaneously. Restore one coordinated control-plane state and verify resource ownership before continuing.

## Official Documentation

- [Kubernetes: Completing the cloud provider migration](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [Kubernetes: v1.29 cloud provider integration changes](https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/)
- [Kubernetes: Migrate a replicated control plane to CCM](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes: Removed feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)
- [Kubernetes: CSI volumes](https://kubernetes.io/docs/concepts/storage/volumes/#csi)

## Conclusion

An in-tree-to-external CCM migration transfers live controller ownership. Inventory Node, route, Service, storage, credential, and autoscaler dependencies; use the provider's compatibility matrix; coordinate replicated control planes with Leader Migration where supported; and validate creation, update, deletion, and replacement. Kubernetes v1.31+ makes the destination unambiguous, but the safe path still depends on a provider-specific, reversible rollout.
