# Creating the Calico IPAMConfiguration Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM

Description: Learn how to define and apply a Calico IPAMConfiguration resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The IPAMConfiguration resource is one of these building blocks, and understanding how to create it properly is essential for any Kubernetes operator running Calico.

This guide walks you through defining a IPAMConfiguration manifest, understanding each field, and applying it to your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to create this resource.

By the end of this post you will have a working IPAMConfiguration resource applied to your cluster, with a clear understanding of what each field controls and how to verify that the resource is active.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges
- `calicoctl` installed (optional but recommended for validation)

## Understanding the IPAMConfiguration Resource

The IPAMConfiguration resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `strictAffinity`: When true, Calico does not allow borrowing IP addresses from blocks affined to other nodes.
- `maxBlocksPerHost`: Limits the number of CIDR blocks that can be affined to a single node.

> **Note:** There can only be one IPAMConfiguration resource, and it must be named `default`.

## Creating the IPAMConfiguration Manifest

Create a file named `ipamconfiguration.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: false
  maxBlocksPerHost: 4
```

The `strictAffinity` value shown is the default. The `maxBlocksPerHost` value shown is a common example; Calico's default is `20`. Adjust the values to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl`:

```bash
kubectl apply -f ipamconfiguration.yaml
```

Alternatively, use `calicoctl`, which provides validation and defaulting for Calico resources:

```bash
# Apply with calicoctl for enhanced validation

calicoctl apply -f ipamconfiguration.yaml
```

`calicoctl` provides validation and defaulting for Calico API resources. In newer Calico installations, the Calico API server or native v3 CRDs provide server-side validation when you use `kubectl`.

## Verification

Confirm that the resource was created successfully:

```bash
# List IPAMConfiguration resources
kubectl get ipamconfiguration.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe ipamconfiguration.projectcalico.org default

# Verify with calicoctl
calicoctl get ipamconfiguration -o yaml
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `IPAMConfiguration`.
- If you are using `kubectl` with the aggregated API server, check that it is available: `kubectl get tigerastatus apiserver`.
- If you are using native v3 CRDs, confirm the API resource exists: `kubectl api-resources | grep ipamconfigurations`.

**Validation errors:**
- Use `calicoctl apply` instead of `kubectl apply` to get detailed validation messages.
- Ensure field values match the types expected by the API (for example, booleans for `strictAffinity` and integers for `maxBlocksPerHost`).

**Calico components not picking up the resource:**
- Restart the calico-node pods: `kubectl rollout restart daemonset calico-node -n calico-system`.
- Check Felix and Typha logs for error messages.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels on Calico resources enable you to build flexible configurations that apply differently across your cluster. The IPAMConfiguration resource itself is global, but other resources such as IPPools can use node selectors. For example, you can label nodes before referencing those labels from an IPPool:

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

When using GitOps tools like Flux or Argo CD, ensure the Calico API resources are available before the custom resources are applied. Set appropriate sync waves or dependencies to prevent ordering issues.

Resource Naming Conventions

Adopt a consistent naming convention for other Calico resources. The IPAMConfiguration resource is a singleton and must be named `default`, but resources such as IPPools should use descriptive names:

- Use descriptive names that indicate the resource's purpose (e.g., `production-pod-pool` instead of `pool-1`)
- Include environment or cluster identifiers for multi-cluster setups
- Avoid special characters; use lowercase letters, numbers, and hyphens only

Following these conventions makes it easier to manage resources at scale and reduces the risk of accidental modifications to the wrong resource.


## Understanding the Root Cause

Before diving into the fix commands, it is worth understanding why this error occurs at a deeper level. Calico's architecture relies on several components working together: Felix for dataplane programming, the IPAM plugin for IP address management, and the CNI plugin for pod network setup. When any of these components encounters an inconsistency, errors propagate through the system.

The most reliable way to prevent recurring issues is to understand the interaction between these components. Felix watches for changes in the Calico datastore and programs the Linux kernel accordingly. If the datastore contains stale or conflicting data, Felix may program incorrect rules, leading to connectivity failures.

Similarly, the IPAM plugin allocates IP addresses based on the IPPool and BlockAffinity resources. If these resources are inconsistent with the actual state of pods in the cluster, you get IP conflicts or allocation failures.

Understanding this architecture helps you identify the correct fix more quickly and avoid applying changes that address symptoms rather than causes.

## Recovery Validation Checklist

After applying any fix, systematically verify each layer of the Calico stack:

```bash
# Layer 1: Calico system pods
kubectl get pods -n calico-system -o wide

# Layer 2: IPAM usage
calicoctl ipam show

# Layer 3: Calico node and BGP status (run on a Calico node)
sudo calicoctl node status

# Layer 4: Cluster DNS and service connectivity
kubectl run fix-test --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default.svc

# Layer 5: Application-level connectivity
kubectl get endpoints -A | grep "<none>" | head -10
```

Each layer depends on the previous one. If Layer 1 fails, do not proceed to testing Layer 2. Fix each layer in order to avoid chasing phantom issues caused by a lower-layer failure.

## Conclusion

You have created a Calico IPAMConfiguration resource, applied it to your cluster, and verified it is active. This resource is a foundational piece of your Calico configuration. Keep your manifests in version control and validate changes with `calicoctl` before applying to production clusters.
