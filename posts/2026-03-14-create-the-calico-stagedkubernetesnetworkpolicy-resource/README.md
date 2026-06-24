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

## Understanding the StagedKubernetesNetworkPolicy Resource

The StagedKubernetesNetworkPolicy resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `podSelector`: Matches pods in the policy namespace by Kubernetes labels.
- `policyTypes`: Specifies whether the policy applies to ingress traffic, egress traffic, or both.
- `ingress`/`egress`: Kubernetes NetworkPolicy rule lists with `from`/`to` peers and ports.

It mirrors the structure of Kubernetes NetworkPolicy but uses the Calico API group and kind to add staging capability.

## Creating the StagedKubernetesNetworkPolicy Manifest

Create a file named `stagedkubernetesnetworkpolicy.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: staged-restrict-frontend
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: gateway
      ports:
        - protocol: TCP
          port: 8080
```

Each field is intentionally set to a sensible default. Adjust the values to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl`:

```bash
kubectl apply -f stagedkubernetesnetworkpolicy.yaml
```

You can also run a server-side dry run first:

```bash
# Validate with the Kubernetes API server before applying
kubectl apply --dry-run=server -f stagedkubernetesnetworkpolicy.yaml
```

For StagedKubernetesNetworkPolicy resources, `kubectl` validates the manifest against the installed Kubernetes CRD schema before submitting it.

## Verification

Confirm that the resource was created successfully:

```bash
# List StagedKubernetesNetworkPolicy resources
kubectl get stagedkubernetesnetworkpolicy.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe stagedkubernetesnetworkpolicy.projectcalico.org staged-restrict-frontend -n default
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `StagedKubernetesNetworkPolicy`.
- Check that the CRD is installed: `kubectl get crd stagedkubernetesnetworkpolicies.projectcalico.org`.

**Validation errors:**
- Use `kubectl apply --dry-run=server -f stagedkubernetesnetworkpolicy.yaml` to get server-side validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Confirm that the affected pods have labels matching the policy's `podSelector` and peer selectors.
- Check Felix and Typha logs for error messages.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels enable you to build flexible policies that apply differently across your cluster. For example, you can use pod and namespace labels to control which workloads are selected by a staged Kubernetes network policy:

```bash
# Label pods for targeted policy selection
kubectl label pod frontend-1 app=frontend -n default
kubectl label pod gateway-1 app=gateway -n default

# Verify labels are applied
kubectl get pods -n default --show-labels
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

You have created a Calico StagedKubernetesNetworkPolicy resource, applied it to your cluster, and verified it is active. This resource is a foundational piece of your Calico configuration. Keep your manifests in version control and validate changes with `kubectl apply --dry-run=server` before applying to production clusters.
