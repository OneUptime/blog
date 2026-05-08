# Creating the Calico FelixConfiguration Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Felix

Description: Learn how to define and apply a Calico FelixConfiguration resource to your Kubernetes cluster using kubectl and calicoctl.

---

## Introduction

Calico uses custom Kubernetes resources to configure networking and security in your cluster. The FelixConfiguration resource is one of these building blocks, and understanding how to create it properly is essential for any Kubernetes operator running Calico.

This guide walks you through defining a FelixConfiguration manifest, understanding each field, and applying it to your cluster. Whether you are setting up a new cluster or extending an existing Calico deployment, you will learn the correct way to create this resource.

By the end of this post you will have a working FelixConfiguration resource applied to your cluster, with a clear understanding of what each field controls and how to verify that the resource is active.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Calico installed (v3.26 or later recommended)
- `kubectl` configured with cluster-admin privileges
- `calicoctl` installed (optional but recommended for validation)

## Understanding the FelixConfiguration Resource

The FelixConfiguration resource uses the Calico API group `projectcalico.org/v3`. Before writing the manifest, review the key fields:

- `logSeverityScreen`: Log level for Felix. Valid values: Debug, Info, Warning, Error, Fatal.
- `reportingInterval`: Interval at which Felix reports its status.
- `ipipEnabled`: Override whether Felix configures an IP-in-IP tunnel interface. In most Kubernetes deployments, configure IPIP encapsulation on IP pools with `ipipMode`.
- `bpfEnabled`: Enable eBPF dataplane mode.
- `wireguardEnabled`: Enable WireGuard encryption for pod-to-pod traffic.
- `healthEnabled` / `healthPort`: Enable the Felix health endpoint and configure its port.
- `prometheusMetricsEnabled` / `prometheusMetricsPort`: Expose Prometheus metrics from Felix.

## Creating the FelixConfiguration Manifest

Create a file named `felixconfiguration.yaml` with the following content:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  reportingInterval: 30s
  bpfEnabled: false
  wireguardEnabled: false
  healthEnabled: true
  healthPort: 9099
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
```

Each field is intentionally set to a common example value. Adjust the values to match your environment before applying.

## Applying the Resource

Apply the manifest using `kubectl`. This requires the Calico API server or native `projectcalico.org/v3` CRDs to be available in the cluster:

```bash
kubectl apply -f felixconfiguration.yaml
```

Alternatively, use `calicoctl`, which provides validation for Calico resources and can manage `projectcalico.org/v3` resources even when `kubectl` access to that API group is not enabled:

```bash
# Apply with calicoctl for enhanced validation

calicoctl apply -f felixconfiguration.yaml
```

`calicoctl` checks field values against the Calico API schema before submitting. When updating an existing resource with `calicoctl apply`, provide the complete intended spec because the resource specification is replaced.

## Verification

Confirm that the resource was created successfully:

```bash
# List FelixConfiguration resources
kubectl get felixconfiguration.projectcalico.org -o wide

# Describe the specific resource for full details
kubectl describe felixconfiguration.projectcalico.org default

# Verify with calicoctl
calicoctl get felixconfiguration -o yaml
```

Check the Calico component logs for any warnings or errors related to the new resource:

```bash
# Check calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

If your Calico installation runs `calico-node` in `kube-system`, use `-n kube-system` instead.

## Troubleshooting

**Resource not appearing after apply:**
- Verify the `apiVersion` is `projectcalico.org/v3` and the `kind` is exactly `FelixConfiguration`.
- If you are using `kubectl`, verify that the Calico API is available: `kubectl api-resources | grep projectcalico.org`.
- For API server based installs, check that the Calico API server is running: `kubectl get pods -n calico-apiserver`.

**Validation errors:**
- Use `calicoctl apply` instead of `kubectl apply` to get detailed validation messages.
- Ensure field values match the types expected by the API (strings, integers, valid CIDRs).

**Calico components not picking up the resource:**
- Restart the calico-node pods if needed: `kubectl rollout restart daemonset calico-node -n calico-system`.
- Check Felix and Typha logs for error messages.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Node-Specific Configuration

FelixConfiguration does not select nodes by label. To override Felix settings on one node, create a FelixConfiguration resource named `node.<nodename>`:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: node.worker-1
spec:
  logSeverityScreen: Debug
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

- For FelixConfiguration, use `default` for global settings and `node.<nodename>` for node-specific overrides
- Use descriptive names that indicate the resource's purpose (e.g., `production-pod-pool` instead of `pool-1`)
- Include environment or cluster identifiers for multi-cluster setups
- Avoid special characters; use lowercase letters, numbers, and hyphens only

Following these conventions makes it easier to manage resources at scale and reduces the risk of accidental modifications to the wrong resource.

## Conclusion

You have created a Calico FelixConfiguration resource, applied it to your cluster, and verified it is active. This resource is a foundational piece of your Calico configuration. Keep your manifests in version control and validate changes with `calicoctl` before applying to production clusters.
