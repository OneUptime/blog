# Configure Unmanaged Pods with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Learn how to configure Cilium to handle unmanaged pods-those not yet part of Cilium's endpoint management-during migrations and in mixed CNI environments.

---

## Introduction

During a CNI migration or in environments where multiple CNIs coexist temporarily, some pods may be "unmanaged" by Cilium-they exist in the cluster but Cilium has not yet processed them as endpoints. This typically happens during rolling node upgrades, when pods predate a Cilium installation, or when running static pods that Cilium may not discover immediately.

Unmanaged pods present a security consideration: if Cilium is enforcing network policies, pods whose networking is not managed by Cilium are not covered by Cilium security policy enforcement. Understanding and controlling this behavior is critical for safe migrations and policy enforcement consistency.

This guide covers how Cilium handles unmanaged pods, how to configure the appropriate behavior, and how to migrate unmanaged pods into full Cilium management.

## Prerequisites

- Kubernetes cluster with Cilium v1.12+ installed
- `cilium` CLI installed
- `kubectl` access to the cluster
- Understanding of your cluster's current pod inventory

## Step 1: Identify Unmanaged Pods

Find pods that Cilium is not currently managing as endpoints.

```bash
# List all Cilium-managed pod endpoints
kubectl get ciliumendpoints --all-namespaces

# Compare with all running pods to find any not in the endpoint list
kubectl get pods -A -o wide

# Compare non-hostNetwork pod names with CiliumEndpoint names
kubectl get ciliumendpoints -A --no-headers | awk '{print $1 "/" $2}' | sort > cilium_pods.txt
kubectl get pods -A --field-selector spec.hostNetwork!=true \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{"/"}{.metadata.name}{"\n"}{end}' \
  | sort > all_pods.txt
comm -23 all_pods.txt cilium_pods.txt

# Check Cilium agent logs for unmanaged pod warnings
kubectl logs -n kube-system -l k8s-app=cilium | grep -i "unmanaged\|not managed"
```

## Step 2: Configure Cilium's Policy Mode During Migration

Set Cilium's policy enforcement mode for Cilium-managed endpoints while migration is in progress. This does not make unmanaged pods policy-enforced; unmanaged pods should still be restarted or rescheduled so that Cilium can manage their networking.

```bash
# Policy enforcement mode for Cilium-managed endpoints:
# "default" - endpoints start unrestricted until selected by policy
# "always"  - enforce policy for all managed endpoints, even without matching rules
# "never"   - disable policy enforcement cluster-wide
kubectl patch configmap cilium-config -n kube-system --type merge \
  --patch '{"data":{"enable-policy":"default"}}'

# Restart Cilium DaemonSet to pick up the change
kubectl rollout restart daemonset/cilium -n kube-system
```

## Step 3: Force Cilium to Regenerate Endpoints for Existing Pods

After installing Cilium on a cluster with existing pods, trigger endpoint regeneration.

```bash
# Restart pods on a node to force Cilium endpoint creation
# Method 1: Drain the node to reschedule all pods through the new CNI
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Method 2: For static pods, restart the kubelet to re-trigger CNI calls
sudo systemctl restart kubelet

# Method 3: Explicitly trigger endpoint regeneration for a specific pod
# Delete and recreate the pod (it will go through Cilium's CNI on startup)
kubectl delete pod <pod-name> -n <namespace>

# Verify the pod is now managed as a Cilium endpoint
kubectl get ciliumendpoint <pod-name> -n <namespace>
```

## Step 4: Validate All Pods Are Managed

After remediation, confirm that all pods are managed Cilium endpoints.

```bash
# Check that all non-hostNetwork pods have Cilium endpoints
# Get total pod count (excluding host-network pods)
TOTAL_PODS=$(kubectl get pods -A --field-selector spec.hostNetwork!=true \
  --no-headers | wc -l)

# Get Cilium-managed pod count. CiliumEndpoint output may also include
# cilium-health endpoints, so compare names rather than counting all CEPs.
kubectl get ciliumendpoints -A --no-headers | awk '{print $1 "/" $2}' | sort > cilium_pods.txt
kubectl get pods -A --field-selector spec.hostNetwork!=true \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{"/"}{.metadata.name}{"\n"}{end}' \
  | sort > all_pods.txt
CILIUM_ENDPOINTS=$(comm -12 all_pods.txt cilium_pods.txt | wc -l)

echo "Total pods: $TOTAL_PODS"
echo "Cilium managed: $CILIUM_ENDPOINTS"

# Check overall Cilium status
cilium status

# Verify network connectivity for a previously unmanaged pod
kubectl exec <previously-unmanaged-pod> -n <namespace> -- curl -s http://kubernetes.default.svc/healthz
```

## Best Practices

- Always perform CNI migrations using rolling node drains rather than in-place CNI replacement
- Monitor CiliumEndpoint objects during migrations to catch any pods that fail to register
- Use `enable-policy: default` during migrations to avoid disrupting traffic before all pods are managed
- After completing migration, consider switching `enable-policy` to `always` for consistent default policy enforcement on managed endpoints
- Set up a Prometheus alert when the number of Cilium endpoints is less than the expected pod count

## Conclusion

Handling unmanaged pods correctly is essential for safe Cilium deployments and migrations. By understanding how Cilium discovers and registers pods as endpoints, configuring the appropriate policy enforcement mode during transitions, and systematically triggering endpoint creation for existing pods, you ensure consistent networking and policy enforcement across your entire cluster. CiliumEndpoint objects are your primary tool for monitoring management coverage during any migration.
