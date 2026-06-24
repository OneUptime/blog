# Creating the Calico WorkloadEndpoint Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Endpoint

Description: Learn how to define and apply a Calico WorkloadEndpoint resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The WorkloadEndpoint resource is one of these building blocks, and understanding how it is structured is useful for any Kubernetes operator running Calico.

This guide walks you through a WorkloadEndpoint manifest, understanding each field, and the commands used to inspect or apply it when you have a custom use case. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn how this resource is represented.

By the end of this post you will have a clear understanding of what each field controls and how to verify existing WorkloadEndpoint resources in your cluster.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges
- `calicoctl` installed (optional but recommended for validation)

## Understanding the WorkloadEndpoint Resource

The WorkloadEndpoint resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `node`: The Kubernetes node where the workload runs.
- `orchestrator`: The orchestrator managing this endpoint (typically `k8s`).
- `pod`: The Kubernetes pod name for this endpoint.
- `containerID`: The CNI container ID for this endpoint.
- `endpoint`: The workload-side container interface name, such as `eth0`.
- `interfaceName`: The host-side veth interface name created by Calico.
- `ipNetworks`: The CIDRs assigned to this endpoint.
- `profiles`: Calico profiles applied to this endpoint.

> **Note:** WorkloadEndpoint resources are managed automatically by the Calico CNI plugin and other orchestrator-specific integrations. In Kubernetes, manual creation is generally not recommended for normal pods; use these manifests primarily for understanding, troubleshooting, or carefully controlled custom integrations.

## Creating the WorkloadEndpoint Manifest

Create a file named `workloadendpoint.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node1-k8s-nginx--pod-eth0
  namespace: default
  labels:
    app: nginx
    projectcalico.org/namespace: default
    projectcalico.org/orchestrator: k8s
spec:
  node: node1
  orchestrator: k8s
  containerID: 1337495556942031415926535
  pod: nginx-pod
  endpoint: eth0
  interfaceName: cali1234abcd
  mac: "ca:fe:00:00:00:01"
  ipNetworks:
    - 10.244.0.5/32
  profiles:
    - kns.default
    - ksa.default.default
```

Each field is an example placeholder. Adjust the values to match the actual node, pod, interface, IP address, and Calico profiles in your environment before applying anything.

## Applying the Resource

If your cluster exposes the Calico `projectcalico.org/v3` API through the Calico API server or native v3 CRDs, apply the manifest using `kubectl`:

```bash
kubectl apply -f workloadendpoint.yaml
```

Alternatively, use `calicoctl`, which provides validation and defaulting for Calico API resources when the Calico API server is not handling that server-side:

```bash
# Apply with calicoctl for enhanced validation

calicoctl apply -f workloadendpoint.yaml
```

`calicoctl` checks field values against the Calico API schema before submitting, which can catch errors that a cluster without Calico API server validation might miss.

## Verification

Confirm that the resource was created successfully:

```bash
# List WorkloadEndpoint resources
kubectl get workloadendpoint.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe workloadendpoint.projectcalico.org node1-k8s-nginx--pod-eth0

# Verify with calicoctl
calicoctl get workloadendpoint -o yaml
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

If your installation runs `calico-node` in another namespace, such as `kube-system`, use that namespace instead.

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `WorkloadEndpoint`.
- If using `kubectl`, check that the Calico API server or native v3 CRDs are available for `projectcalico.org/v3` resources.

**Validation errors:**
- Use `calicoctl apply` instead of `kubectl apply` to get detailed validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Verify that the values match a real workload endpoint before restarting components.
- Check Felix and Typha logs for error messages.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels on Calico resources enable you to build flexible configurations that apply differently across your cluster. For example, you can use node labels to control which nodes are affected by specific resources:

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

### Resource Naming Conventions

Adopt a consistent naming convention for your Calico resources:

- Use descriptive names that indicate the resource's purpose (e.g., `production-pod-pool` instead of `pool-1`)
- Include environment or cluster identifiers for multi-cluster setups
- Avoid special characters; use lowercase letters, numbers, and hyphens only

Following these conventions makes it easier to manage resources at scale and reduces the risk of accidental modifications to the wrong resource.

## Conclusion

You have reviewed a Calico WorkloadEndpoint resource, learned when applying one is appropriate, and verified how to inspect active endpoints. This resource is a foundational part of how Calico represents workload networking. Keep any custom manifests in version control and validate changes with `calicoctl` or the Calico API server before applying them to production clusters.
