# Creating the Calico BlockAffinity Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes

Description: Learn how to define and apply a Calico BlockAffinity resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The BlockAffinity resource is one of these building blocks, and understanding how it is created and managed by Calico is essential for any Kubernetes operator running Calico.

This guide walks you through reviewing a BlockAffinity manifest, understanding each field, and verifying it in your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to inspect this resource.

By the end of this post you will know how to find active BlockAffinity resources in your cluster, with a clear understanding of what each field controls and how to verify that the resource is active.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges
- `calicoctl` installed (optional but recommended for IPAM diagnostics)

## Understanding the BlockAffinity Resource

The BlockAffinity resource uses the Calico API group `projectcalico.org/v3`. Before reviewing an existing resource, understand the key fields:

- `cidr`: The IP block (CIDR) that is affined to the node.
- `node`: The name of the Kubernetes node that owns this IP block.
- `state`: The current state of the affinity. Values: `confirmed`, `pending`, `pendingDeletion`.

> **Note:** BlockAffinity resources are managed automatically by Calico IPAM. They are intended for get, list, and watch operations, not manual create, update, or delete workflows.

## Reviewing the BlockAffinity Manifest

An existing BlockAffinity resource exported from a cluster may look like this:

```yaml
apiVersion: projectcalico.org/v3
kind: BlockAffinity
metadata:
  name: node1-10-244-0-0-24
spec:
  cidr: 10.244.0.0/24
  node: node1
  state: confirmed
```

The values are cluster state, not sensible defaults. Treat them as data produced by Calico IPAM, and do not edit them as a normal configuration workflow.

## Exporting the Resource

List existing BlockAffinity resources using `kubectl`:

```bash
kubectl get blockaffinities.projectcalico.org -o wide
```

Alternatively, use `calicoctl` to export the same Calico resource:

```bash
# Export BlockAffinity resources for inspection
calicoctl get blockaffinity -o yaml
```

Do not use `kubectl apply` or `calicoctl apply` to create BlockAffinity resources manually. Calico IPAM creates and updates these resources as pod IP blocks are assigned to nodes.

## Verification

Confirm that the resource exists and matches the expected node and CIDR:

```bash
# List BlockAffinity resources
kubectl get blockaffinities.projectcalico.org -o wide

# Describe a specific resource for full details
kubectl describe blockaffinities.projectcalico.org node1-10-244-0-0-24

# Verify with calicoctl
calicoctl get blockaffinity -o yaml
```

Check the Calico component logs for any warnings or errors related to IPAM:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing:**
- Do not apply BlockAffinity resources manually. Create a pod workload that requires an IP address and let Calico IPAM allocate blocks.
- Verify that the Calico API is available with `kubectl api-resources | grep projectcalico.org`.

**Validation errors:**
- Use `kubectl get` or `calicoctl get` to inspect generated resources instead of applying edited manifests.
- Ensure field values in exported output match the types expected by the API (strings, booleans, valid CIDRs).

**Calico components not picking up the resource:**
- Avoid editing BlockAffinity resources directly; run `calicoctl ipam check` to identify IPAM consistency issues.
- Check Felix and Typha logs for error messages.


## Advanced Configuration Options

Beyond the basic inspection workflow shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels on nodes and Calico resources enable you to build flexible configurations that apply differently across your cluster. Node labels do not directly assign BlockAffinity resources, but they are useful for related Kubernetes and Calico workflows:

```bash
# Label nodes for targeted configuration
kubectl label node worker-1 calico-config=high-performance
kubectl label node worker-2 calico-config=standard

# Verify labels are applied
kubectl get nodes --show-labels | grep calico-config
```

### Version Control and GitOps Integration

Store your Calico configuration manifests alongside your application configurations in Git. This enables change tracking, peer review, and automated deployment:

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

When using GitOps tools like Flux or Argo CD, ensure your Calico CRDs are applied before custom resources that you own, such as IPPool and FelixConfiguration resources. BlockAffinity resources should be treated as Calico-managed runtime state rather than GitOps-managed configuration.

Resource Naming Conventions

Adopt a consistent naming convention for Calico resources that you manage directly:

- Use descriptive names that indicate the resource's purpose (e.g., `production-pod-pool` instead of `pool-1`)
- Include environment or cluster identifiers for multi-cluster setups
- Avoid special characters; use lowercase letters, numbers, and hyphens only

Following these conventions makes it easier to manage configuration resources at scale and reduces the risk of accidental modifications to the wrong resource.


## Understanding the Root Cause

Before diving into diagnostic commands, it is worth understanding why BlockAffinity issues occur at a deeper level. Calico's architecture relies on several components working together: Felix for dataplane programming, the IPAM plugin for IP address management, and the CNI plugin for pod network setup. When any of these components encounters an inconsistency, errors propagate through the system.

The most reliable way to prevent recurring issues is to understand the interaction between these components. Felix watches for changes in the Calico datastore and programs the Linux kernel accordingly. If the datastore contains stale or conflicting data, Felix may program incorrect rules, leading to connectivity failures.

Similarly, the IPAM plugin allocates IP addresses based on the IPPool and BlockAffinity resources. If these resources are inconsistent with the actual state of pods in the cluster, you get IP conflicts or allocation failures.

Understanding this architecture helps you identify the correct fix more quickly and avoid applying changes that address symptoms rather than causes.

## Recovery Validation Checklist

After applying any supported fix, systematically verify each layer of the Calico stack:

```bash
# Layer 1: Calico system pods
kubectl get pods -n calico-system -o wide

# Layer 2: IPAM consistency
calicoctl ipam check

# Layer 3: Node-to-node connectivity
calicoctl node status

# Layer 4: DNS and service connectivity
kubectl run fix-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default.svc

# Layer 5: Application-level connectivity
kubectl get endpoints -A | grep "<none>" | head -10
```

Each layer depends on the previous one. If Layer 1 fails, do not proceed to testing Layer 2. Fix each layer in order to avoid chasing phantom issues caused by a lower-layer failure.

## Conclusion

You have inspected a Calico BlockAffinity resource and verified it is active. This resource is a foundational piece of Calico IPAM runtime state. Keep user-managed Calico configuration manifests in version control, and use `kubectl get`, `calicoctl get`, and `calicoctl ipam check` to validate BlockAffinity state before troubleshooting production clusters.
