# Creating the Calico StagedNetworkPolicy Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policy

Description: Learn how to define and apply a Calico StagedNetworkPolicy resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The StagedNetworkPolicy resource is one of these building blocks, and understanding how to create it properly is essential for any Kubernetes operator running Calico.

This guide walks you through defining a StagedNetworkPolicy manifest, understanding each field, and applying it to your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to create this resource.

By the end of this post you will have a working StagedNetworkPolicy resource applied to your cluster, with a clear understanding of what each field controls and how to verify that the resource is active.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges
- Calico's `projectcalico.org/v3` API available through the Calico API server or native v3 CRDs

## Understanding the StagedNetworkPolicy Resource

The StagedNetworkPolicy resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- Rule `action`: Set to `Allow`, `Deny`, `Log`, or `Pass` to preview how matching traffic would be handled.
- `order`: Evaluation priority. Lower numbers are processed first.
- `selector`: Matches endpoints within the namespace.

StagedNetworkPolicy is the namespace-scoped equivalent of StagedGlobalNetworkPolicy. It previews policy behavior without enforcing traffic changes.

## Creating the StagedNetworkPolicy Manifest

Create a file named `stagednetworkpolicy.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: staged-restrict-db
  namespace: production
spec:
  order: 100
  selector: app == 'database'
  types:
    - Ingress
    - Egress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'backend'
      destination:
        ports:
          - 5432
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
```

Adjust the values to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl`:

```bash
kubectl apply -f stagednetworkpolicy.yaml
```

You can also ask the API server to validate the manifest without creating the resource:

```bash
kubectl apply --dry-run=server -f stagednetworkpolicy.yaml
```

Server-side dry runs check the resource against the API server schema and admission checks before you apply it.

## Verification

Confirm that the resource was created successfully:

```bash
# List StagedNetworkPolicy resources
kubectl get stagednetworkpolicy.projectcalico.org -n production -o wide

# Describe the specific resource for full details
kubectl describe stagednetworkpolicy.projectcalico.org staged-restrict-db -n production
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `StagedNetworkPolicy`.
- Check that the Calico API server is running: `kubectl get pods -n calico-system`.

**Validation errors:**
- Use `kubectl apply --dry-run=server -f stagednetworkpolicy.yaml` before applying to get validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Check that the Calico API server or native v3 CRDs are available for `projectcalico.org/v3` resources.
- Check Felix and Typha logs for error messages.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels on Kubernetes workloads enable you to build flexible configurations that apply differently across your cluster. For example, you can label pods so they match the selectors used by this policy:

```bash
# Label pods for targeted policy selection
kubectl label pod db-0 app=database -n production --overwrite
kubectl label pod backend-0 app=backend -n production --overwrite

# Verify labels are applied
kubectl get pods -n production --show-labels
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

You have created a Calico StagedNetworkPolicy resource, applied it to your cluster, and verified it is active. This resource is a foundational piece of your Calico configuration. Keep your manifests in version control and validate changes with a server-side dry run before applying to production clusters.
