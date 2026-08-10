# `--cloud-provider=external` vs a Provider Name: What Kubernetes Accepts Now

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Provider, Cloud Controller Manager, kubelet, Kubernetes 1.31, Migration

Description: Use the current Kubernetes cloud-provider flag correctly, distinguish core-component flags from provider CCM flags, and avoid leaving Nodes uninitialized during upgrades.

---

On Kubernetes v1.31 and later, core components accept only two meanings for `--cloud-provider`: an empty value for no cloud integration, or `external` for integration through a separate provider-specific cloud-controller-manager (CCM). Historical values such as `aws`, `azure`, `gce`, `openstack`, and `vsphere` belonged to in-tree provider code and are no longer valid in current Kubernetes core.

The important subtlety is that `external` is a signal to cloud-independent Kubernetes components. It is not necessarily the value passed to the provider's own CCM binary. That binary, chart, or configuration file follows the provider project's documentation.

## The Current Decision

| Cluster design | Core-component configuration |
| --- | --- |
| No cloud API integration | Leave `--cloud-provider` unset or empty |
| External provider CCM installed | Set `--cloud-provider=external` where the provider and Kubernetes documentation require it, especially kubelet and `kube-controller-manager` |
| Legacy in-tree provider name | Migrate; provider names are not accepted by Kubernetes v1.31+ core components |

Kubernetes v1.29 changed the default feature-gate behavior so built-in integrations were disabled unless operators explicitly opted back in. Kubernetes v1.31 completed the removal: the old provider implementations and opt-back path are gone. Treat advice that recommends a named in-tree provider on current core binaries as version-bound legacy documentation.

## Why `external` Changes Node Bootstrap

When a kubelet runs with external cloud-provider mode, it registers a Node that requires a second initialization by the CCM. The Node receives this scheduling taint:

```text
node.cloudprovider.kubernetes.io/uninitialized:NoSchedule
```

The provider CCM identifies the backing instance, sets cloud-derived data such as `.spec.providerID`, topology labels, and Node addresses, and removes the taint. If the CCM is absent, cannot become leader, lacks credentials, or cannot match the Node to an instance, the taint remains.

That makes a partial rollout dangerous. Do not switch every kubelet to `external` and plan to install the CCM later. Ensure the provider component, RBAC, credentials, scheduling tolerations, and API connectivity are ready as part of the same controlled change.

## Inspect Effective Configuration, Not Just a File

Cluster tools can render flags from several sources: systemd units, environment files, kubeadm configuration, static Pod manifests, machine configuration, or distribution-specific settings. Find the live process and the tool-owned source of truth.

```bash
# On a systemd-managed node
systemctl cat kubelet
ps -ef | grep '[k]ubelet'

# Inspect kube-controller-manager arguments in a kubeadm-style control plane
kubectl -n kube-system get pod -l component=kube-controller-manager \
  -o jsonpath='{range .items[*].spec.containers[*].command}{.}{"\n"}{end}'

# Inspect the resulting Node state
kubectl get nodes -o custom-columns=NAME:.metadata.name,PROVIDER_ID:.spec.providerID,TAINTS:.spec.taints
```

Command-line flags override values supplied through a kubelet configuration file. Edit the cluster manager's declarative configuration rather than hand-editing a generated unit that will be overwritten.

For managed Kubernetes, control-plane processes may be hidden and provider integration may be fully managed. Do not inject flags into worker nodes based on a self-managed-cluster guide; use the managed service's supported configuration.

## Do Not Pass `external` Blindly to the CCM

The external CCM is provider-specific. Depending on the project, the provider identity may be compiled into the binary, selected through a CCM-specific flag, chart value, or configuration file. Its accepted flags can differ from the generic Kubernetes component that an old example shows.

Use the image's own help output in a non-production environment, inspect the chart values and rendered manifest, and read the release documentation:

```bash
helm template ccm PROVIDER_REPOSITORY/PROVIDER_CHART \
  --namespace kube-system -f values.yaml > rendered-ccm.yaml

grep -n -- '--cloud-provider\|--cloud-config' rendered-ccm.yaml
```

Do not copy the Kubernetes documentation's historical `cloud-controller-manager` DaemonSet literally. That manifest is explicitly a guideline and contains placeholders and an old example image. A maintained provider chart should supply the image, RBAC, arguments, probes, leader-election settings, and tolerations appropriate to that provider and release.

## A Safe Migration Sequence

For a cluster still using an in-tree provider on an old Kubernetes release:

1. Read the provider's external CCM migration and compatibility documentation for the exact source and target minors.
2. Inventory other extracted integrations. Storage requires CSI, and private-registry authentication may require a kubelet credential-provider plugin; the CCM does not replace either one.
3. Back up cluster state and test rollback using a non-production cluster with the same topology.
4. Install the external CCM with correct RBAC, cloud identity, config, tolerations, and high-availability settings.
5. For a replicated control plane, use the documented controller-manager Leader Migration procedure where applicable so an in-tree and external controller cannot both reconcile the same resource.
6. Change the provider-managed core-component configuration to `external` in the documented order.
7. Prove new Node initialization, provider ID and topology, `LoadBalancer` Service reconciliation, routes if used, and Node deletion behavior.
8. Advance one Kubernetes minor at a time and remove obsolete in-tree configuration only when the provider procedure says it is safe.

Never “test” dual ownership by casually running the old provider controller and the new CCM together. Both can attempt to manage routes, load balancers, or lifecycle state. Leader Migration exists to coordinate a controlled HA transition, not as a permanent two-provider topology.

## Common Failure Patterns

### Unknown provider error at startup

If a current kubelet or `kube-controller-manager` rejects `--cloud-provider=aws` or another name, do not search for a hidden feature gate. In v1.31+, migrate to the external provider and use `external`, or leave the flag empty if no provider integration is intended.

### Every new Node is uninitialized

Confirm that the kubelet really should use external mode, then inspect CCM scheduling, leadership, logs, Kubernetes RBAC, cloud permissions, and instance matching. Do not remove the taint as the primary fix.

### Some Nodes initialize and others do not

Compare provider IDs, hostnames, zones, instance tags, credential reachability, and the kubelet's effective flags across node pools. Mixed generated configurations are common during rolling changes.

```bash
kubectl get nodes -o json | jq -r '.items[] | [
  .metadata.name,
  (.spec.providerID // ""),
  ([.spec.taints[]? | select(.key=="node.cloudprovider.kubernetes.io/uninitialized") | .key] | join(","))
] | @tsv'
```

### CCM runs but core cloud loops also appear active

Stop and check the migration procedure. Duplicate events, conflicting status updates, or infrastructure churn can mean two controller managers believe they own the same work, possibly because leader migration, controller selection, or flags differ between control-plane replicas.

## Official Documentation

- [Kubernetes: Removed feature gates and current `--cloud-provider` values](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: v1.29 cloud provider integration changes](https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/)
- [Kubernetes: Completing the cloud provider migration](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [Kubernetes: Migrate a replicated control plane to CCM](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Kubernetes: kubelet command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)

## Conclusion

For Kubernetes v1.31 and later, core components use no cloud provider or `external`; they do not accept historical provider names. Configure `external` only when a compatible external CCM is installed and ready to initialize Nodes. Configure the provider CCM itself according to its own versioned documentation, not by assuming its provider-selection flag has the same semantics. Verify live arguments and rollout behavior because a single mismatched node pool can leave new Nodes permanently tainted.
