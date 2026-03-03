# How to Configure Admission Control Pod Security Policies in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Pod Security, Admission Control, Security

Description: A practical guide to configuring admission control and pod security policies in Talos Linux for hardened Kubernetes clusters.

---

Kubernetes clusters need guardrails. Without some form of admission control, any user or workload can request privileged containers, host networking, or root-level filesystem access. In traditional Linux distributions, you might install and configure an admission controller manually. Talos Linux takes a different approach - it gives you built-in configuration options for pod security admission right in the machine config.

This post walks through how admission control works in Talos Linux, how to configure Pod Security Standards (PSS) through the Talos machine configuration, and how to test that your policies are actually enforced.

## Background on Pod Security in Kubernetes

Kubernetes deprecated PodSecurityPolicy (PSP) in version 1.21 and removed it entirely in 1.25. The replacement is the Pod Security Admission (PSA) controller, which is built into the Kubernetes API server. PSA works by assigning one of three security levels to each namespace:

- **Privileged** - No restrictions at all. Use this for system-level namespaces like `kube-system`.
- **Baseline** - Prevents known privilege escalations. Blocks things like hostNetwork, hostPID, and privileged containers.
- **Restricted** - The tightest policy. Requires non-root containers, read-only root filesystems, and dropped capabilities.

Each level can be applied in three modes: `enforce` (reject violating pods), `audit` (allow but log violations), and `warn` (allow but send a warning to the user).

## Configuring Admission Control in Talos

In Talos Linux, you configure the API server admission plugins through the cluster configuration section of your machine config. Here is a basic example that sets the baseline level as the default enforcement across the cluster:

```yaml
# machine-config-patch.yaml
# Configure Pod Security Admission defaults
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: "baseline"
            enforce-version: "latest"
            audit: "restricted"
            audit-version: "latest"
            warn: "restricted"
            warn-version: "latest"
          exemptions:
            usernames: []
            runtimeClasses: []
            namespaces:
              - kube-system
```

This configuration does the following: it enforces the baseline level on all namespaces (except `kube-system`), audits against the restricted level, and warns against the restricted level. The `kube-system` namespace is exempted because system components often need elevated privileges.

## Applying the Configuration

You can apply this configuration when generating your Talos config or as a patch to an existing cluster. If you are generating a fresh config:

```bash
# Generate config with the admission control patch
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @machine-config-patch.yaml
```

If you already have a running cluster and want to apply this change:

```bash
# Apply the patch to a running control plane node
talosctl apply-config --nodes 192.168.1.100 \
  --patch @machine-config-patch.yaml
```

After applying, the API server will restart with the new admission configuration. You can verify this by checking the API server pod arguments:

```bash
# Check that the admission plugin is configured
kubectl get pod kube-apiserver-talos-cp-1 -n kube-system -o yaml | \
  grep -A 5 "admission-control"
```

## Per-Namespace Overrides

The cluster-wide defaults are just that - defaults. You can override the security level on a per-namespace basis using labels. For example, if you have a namespace where you need to run privileged workloads:

```bash
# Allow privileged pods in a specific namespace
kubectl label namespace monitoring \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=baseline
```

Conversely, if you want to lock down a namespace tighter than the cluster default:

```bash
# Apply restricted policy to a production namespace
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=v1.28 \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Testing Your Policies

The best way to verify that your admission control works is to try deploying a pod that violates the policy. Create a test namespace and attempt to run a privileged container:

```yaml
# test-privileged-pod.yaml
# This pod should be rejected by the baseline policy
apiVersion: v1
kind: Pod
metadata:
  name: test-privileged
  namespace: test-ns
spec:
  containers:
    - name: test
      image: busybox
      securityContext:
        privileged: true
      command: ["sleep", "3600"]
```

```bash
# Create a test namespace (will inherit cluster defaults)
kubectl create namespace test-ns

# Try to deploy the privileged pod
kubectl apply -f test-privileged-pod.yaml
# Expected output: Error from server (Forbidden): ...
```

If your policies are working correctly, the API server should reject this pod with an error message explaining which policy was violated.

## A More Complete Configuration

For production clusters, you will probably want a more detailed configuration. Here is an example that includes multiple admission plugins along with the pod security configuration:

```yaml
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: "baseline"
            enforce-version: "latest"
            audit: "restricted"
            audit-version: "latest"
            warn: "restricted"
            warn-version: "latest"
          exemptions:
            usernames: []
            runtimeClasses: []
            namespaces:
              - kube-system
              - cert-manager
              - metallb-system
```

Notice that we added `cert-manager` and `metallb-system` to the exemptions list. These system components often need capabilities that go beyond the baseline level, such as binding to host ports or running init containers with elevated privileges.

## Handling Upgrades

When you upgrade Talos Linux or Kubernetes, the admission control configuration travels with your machine config. There is nothing extra to migrate. However, you should always pin the `enforce-version` in production to avoid surprises. If a new Kubernetes version tightens what "baseline" means, your previously working pods might suddenly fail after an upgrade.

```yaml
# Pin the version for predictable behavior
defaults:
  enforce: "baseline"
  enforce-version: "v1.28"
```

After testing the new version, you can bump the version forward.

## Troubleshooting Common Issues

If pods are unexpectedly rejected, check the namespace labels first:

```bash
# See what security levels are applied to a namespace
kubectl get namespace my-namespace -o yaml | grep pod-security
```

If the cluster-wide defaults are too strict, you can temporarily switch the mode from `enforce` to `warn` while you fix the workloads:

```yaml
defaults:
  enforce: "privileged"
  warn: "baseline"
  audit: "baseline"
```

This lets everything through but gives you warnings and audit logs to identify which workloads need changes.

You can also check the Talos API server logs for admission-related errors:

```bash
# View API server logs for admission issues
talosctl logs kube-apiserver --nodes 192.168.1.100 | grep -i "admission"
```

## Wrapping Up

Pod security admission is one of those things you should configure early in your cluster lifecycle. Retrofitting strict policies onto a cluster that has been running without them is painful - you will find dozens of workloads that assume they can run as root or mount host paths.

Talos Linux makes this easier than most distributions because the configuration lives in a single, declarative machine config file. You define your admission control settings once, and they are applied consistently across all control plane nodes. No Helm charts to install, no webhook deployments to manage, and no external policy engines to maintain.

Start with baseline enforcement and restricted warnings. Fix the warnings over time, and then tighten the enforcement to restricted when your workloads are ready. Your cluster will be meaningfully more secure for the effort.
