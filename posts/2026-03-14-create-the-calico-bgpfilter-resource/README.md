# Creating the Calico BGPFilter Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP

Description: Learn how to define and apply a Calico BGPFilter resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The BGPFilter resource is one of these building blocks, and understanding how to create it properly is essential for any Kubernetes operator running Calico.

This guide walks you through defining a BGPFilter manifest, understanding each field, and applying it to your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to create this resource.

By the end of this post you will have a working BGPFilter resource applied to your cluster, with a clear understanding of what each field controls and how to attach it to a BGP peer.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges and access to Calico `projectcalico.org/v3` APIs
- `calicoctl` installed (optional but recommended for validation)

## Understanding the BGPFilter Resource

The BGPFilter resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `exportV4`: Rules controlling which IPv4 routes are exported (advertised) to BGP peers. Evaluated in order; first match wins.
- `importV4`: Rules controlling which IPv4 routes are accepted from BGP peers.
- `action`: Either `Accept` or `Reject`.
- `matchOperator`: How to compare the route prefix against the cidr. Valid values: `In`, `NotIn`, `Equal`, `NotEqual`.
- `cidr`: The CIDR prefix to match against.

A BGPFilter is not used until its name is listed in the `filters` field of a corresponding `BGPPeer` resource.

## Creating the BGPFilter Manifest

Create a file named `bgpfilter.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: allow-specific-prefixes
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.244.0.0/16
    - action: Reject
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 192.168.0.0/16
    - action: Reject
```

The CIDRs are example values. Adjust them to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl`:

```bash
kubectl apply -f bgpfilter.yaml
```

You can also validate the manifest with `calicoctl` before applying it:

```bash
# Validate with calicoctl
calicoctl validate -f bgpfilter.yaml
```

Alternatively, apply the manifest with `calicoctl`:

```bash
# Apply with calicoctl
calicoctl apply -f bgpfilter.yaml
```

`calicoctl validate` checks the resource structure, syntax, and Calico-specific validation rules without applying changes to the cluster. In newer Calico installations, the Calico API server also performs validation for resources submitted with `kubectl`.

## Verification

Confirm that the resource was created successfully:

```bash
# List BGPFilter resources
kubectl get bgpfilters.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe bgpfilters.projectcalico.org allow-specific-prefixes

# Verify with calicoctl
calicoctl get bgpfilter allow-specific-prefixes -o yaml
```

To use the filter, reference it from a `BGPPeer` resource:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-filter
spec:
  peerIP: 192.0.2.10
  asNumber: 64567
  filters:
    - allow-specific-prefixes
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs; adjust the namespace if your installation uses kube-system
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `BGPFilter`.
- If you are using `kubectl`, check that the Calico API server or native v3 CRDs are available.

**Validation errors:**
- Use `calicoctl validate` before applying to get detailed validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Confirm the relevant `BGPPeer` includes the BGPFilter name in `spec.filters`.
- Check calico-node logs for error messages.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels and selectors on related Calico resources enable you to build flexible configurations that apply differently across your cluster. For example, `BGPPeer` resources can use node labels to control which nodes are affected by a peering configuration that references a BGPFilter:

```bash
# Label nodes for targeted configuration
kubectl label node worker-1 calico-config=high-performance
kubectl label node worker-2 calico-config=standard

# Verify labels are applied
kubectl get nodes --show-labels | grep calico-config
```

### Version Control and GitOps Integration

Store your Calico resource manifests alongside your application configurations in Git. This enables change tracking, peer review, and automated deployment:

```bash
# Example directory structure for Calico resources
# calico-resources/
#   base/
#     ippool.yaml
#     felixconfiguration.yaml
#   overlays/
#     production/
#       kustomization.yaml
#     staging/
#       kustomization.yaml
```

When using GitOps tools like Flux or Argo CD, ensure your Calico CRDs are applied before the custom resources. Set appropriate sync waves or dependencies to prevent ordering issues.

Resource Naming Conventions

Adopt a consistent naming convention for your Calico resources:

- Use descriptive names that indicate the resource's purpose (e.g., `production-pod-pool` instead of `pool-1`)
- Include environment or cluster identifiers for multi-cluster setups
- Avoid special characters; use lowercase letters, numbers, and hyphens only

Following these conventions makes it easier to manage resources at scale and reduces the risk of accidental modifications to the wrong resource.

## Conclusion

You have created a Calico BGPFilter resource, applied it to your cluster, and verified that it exists. Attach it to a BGPPeer to make it affect route import or export decisions. Keep your manifests in version control and validate changes with `calicoctl` before applying to production clusters.
