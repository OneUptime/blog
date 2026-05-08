# Creating the Calico BGPConfiguration Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP

Description: Learn how to define and apply a Calico BGPConfiguration resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The BGPConfiguration resource is one of these building blocks, and understanding how to create it properly is essential for any Kubernetes operator running Calico.

This guide walks you through defining a BGPConfiguration manifest, understanding each field, and applying it to your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to create this resource.

By the end of this post you will have a working BGPConfiguration resource applied to your cluster, with a clear understanding of what each field controls and how to verify that the resource is active.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended), with the Calico API server installed if you plan to manage `projectcalico.org/v3` resources using `kubectl`
- `kubectl` configured with cluster-admin privileges
- `calicoctl` installed (optional but recommended for validation)

## Understanding the BGPConfiguration Resource

The BGPConfiguration resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `nodeToNodeMeshEnabled`: When true, Calico creates a full mesh of BGP peerings between all nodes. Disable this if you use dedicated BGP route reflectors.
- `asNumber`: The default Autonomous System number for all nodes. Must be a valid AS number, such as a private ASN (64512-65534 or 4200000000-4294967294) or a public ASN you own.
- `serviceClusterIPs`: List of CIDR blocks for Kubernetes ClusterIP services to advertise via BGP.
- `serviceExternalIPs`: List of CIDR blocks for external service IPs to advertise via BGP.
- `logSeverityScreen`: Log verbosity for BGP components. Valid values: Debug, Info, Warning, Error, Fatal.

## Creating the BGPConfiguration Manifest

Create a file named `bgpconfiguration.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
  serviceExternalIPs:
    - cidr: 192.168.100.0/24
```

The logging, mesh, and AS number values match common defaults. Adjust the service CIDR values to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl` when the Calico API server is installed:

```bash
kubectl apply -f bgpconfiguration.yaml
```

Alternatively, use `calicoctl`, especially on clusters where the Calico API server is not installed or when you want client-side validation and defaulting for Calico resources:

```bash
# Apply with calicoctl for enhanced validation

calicoctl apply -f bgpconfiguration.yaml
```

`calicoctl` checks field values against the Calico API schema before submitting. In newer Calico releases with the Calico API server installed, `kubectl` also receives server-side validation.

## Verification

Confirm that the resource was created successfully:

```bash
# List BGPConfiguration resources
kubectl get bgpconfiguration.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe bgpconfiguration.projectcalico.org default

# Verify with calicoctl
calicoctl get bgpconfiguration -o yaml
```

Check the Calico component logs for any warnings or errors related to the new resource. Adjust the namespace if your installation runs Calico in `kube-system` instead of `calico-system`:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `BGPConfiguration`.
- If using `kubectl`, check that the Calico API server is running: `kubectl get pods -n calico-apiserver`.

**Validation errors:**
- Use `calicoctl apply` instead of `kubectl apply` to get detailed validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Check the calico-node, Felix, and Typha logs for error messages.
- Restart calico-node pods only after confirming the configuration is not being picked up, and do it during a maintenance window: `kubectl rollout restart daemonset calico-node -n calico-system`.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Node labels are useful with Calico resources that support selectors, such as `BGPPeer` and `IPPool`. They do not change which nodes use the global `default` BGPConfiguration; node-specific BGPConfiguration overrides use the name `node.<nodename>` and only support a subset of fields. For example, you can label nodes for later use in selector-based resources:

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

You have created a Calico BGPConfiguration resource, applied it to your cluster, and verified it is active. This resource is a foundational piece of your Calico configuration. Keep your manifests in version control and validate changes with `calicoctl` before applying to production clusters.
