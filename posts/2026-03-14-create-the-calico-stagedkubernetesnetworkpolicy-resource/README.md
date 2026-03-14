# Creating the Calico StagedKubernetesNetworkPolicy Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policy

Description: Learn how to define and apply a Calico StagedKubernetesNetworkPolicy resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The StagedKubernetesNetworkPolicy resource is one of these building blocks, and understanding how to create it properly is essential for any Kubernetes operator running Calico.

This guide walks you through defining a StagedKubernetesNetworkPolicy manifest, understanding each field, and applying it to your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to create this resource.

By the end of this post you will have a working StagedKubernetesNetworkPolicy resource applied to your cluster, with a clear understanding of what each field controls and how to verify that the resource is active.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges
- `calicoctl` installed (optional but recommended for validation)

## Understanding the StagedKubernetesNetworkPolicy Resource

The StagedKubernetesNetworkPolicy resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `stagedAction`: Set to `Log` to preview the policy without enforcement.
- `selector`: Matches pods by their Calico endpoint labels.
- `ingress`/`egress`: Rule lists with action, protocol, source/destination selectors, and ports.

Mirrors the structure of K8s NetworkPolicy but adds staging capability.

## Creating the StagedKubernetesNetworkPolicy Manifest

Create a file named `stagedkubernetesnetworkpolicy.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: staged-restrict-frontend
  namespace: default
spec:
  stagedAction: Log
  selector: app == 'frontend'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'gateway'
      destination:
        ports:
          - 8080
```

Each field is intentionally set to a sensible default. Adjust the values to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl`:

```bash
kubectl apply -f stagedkubernetesnetworkpolicy.yaml
```

Alternatively, use `calicoctl` which provides better validation for Calico resources:

```bash
# Apply with calicoctl for enhanced validation
calicoctl apply -f stagedkubernetesnetworkpolicy.yaml
```

`calicoctl` checks field values against the Calico API schema before submitting, which can catch errors that `kubectl` would miss.

## Verification

Confirm that the resource was created successfully:

```bash
# List StagedKubernetesNetworkPolicy resources
kubectl get stagedkubernetesnetworkpolicy.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe stagedkubernetesnetworkpolicy.projectcalico.org

# Verify with calicoctl
calicoctl get stagedkubernetesnetworkpolicy -o yaml
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `StagedKubernetesNetworkPolicy`.
- Check that the Calico API server is running: `kubectl get pods -n calico-system`.

**Validation errors:**
- Use `calicoctl apply` instead of `kubectl apply` to get detailed validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Restart the calico-node pods: `kubectl rollout restart daemonset calico-node -n calico-system`.
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

You have created a Calico StagedKubernetesNetworkPolicy resource, applied it to your cluster, and verified it is active. This resource is a foundational piece of your Calico configuration. Keep your manifests in version control and validate changes with `calicoctl` before applying to production clusters.
