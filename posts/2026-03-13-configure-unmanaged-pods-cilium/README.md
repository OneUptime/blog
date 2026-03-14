# Configure Unmanaged Pods with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, kubernetes, unmanaged-pods, networking, cni, migration

Description: Learn how to configure Cilium to handle unmanaged pods—those not yet part of Cilium's endpoint management—during migrations and in mixed CNI environments.

---

## Introduction

During a CNI migration or in environments where multiple CNIs coexist temporarily, some pods may be "unmanaged" by Cilium—they exist in the cluster but Cilium has not yet processed them as endpoints. This typically happens during rolling node upgrades, when pods predate a Cilium installation, or when running static pods that Cilium may not discover immediately.

Unmanaged pods present a security consideration: if Cilium is enforcing network policies, unmanaged pods may either be completely isolated (denied all traffic) or allowed through without policy enforcement, depending on the cluster configuration. Understanding and controlling this behavior is critical for safe migrations and policy enforcement consistency.

This guide covers how Cilium handles unmanaged pods, how to configure the appropriate behavior, and how to migrate unmanaged pods into full Cilium management.

## Prerequisites

- Kubernetes cluster with Cilium v1.12+ installed
- `cilium` CLI installed
- `kubectl` access to the cluster
- Understanding of your cluster's current pod inventory

## Step 1: Identify Unmanaged Pods

Find pods that Cilium is not currently managing as endpoints.

```bash
# List all pods and their Cilium endpoint status
cilium endpoint list

# Compare with all running pods to find any not in the endpoint list
kubectl get pods -A -o wide

# Check for pods on a specific node that aren't in Cilium's endpoint list
cilium endpoint list | awk '{print $4}' > cilium_pods.txt
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' > all_pods.txt
diff cilium_pods.txt all_pods.txt

# Check Cilium agent logs for unmanaged pod warnings
kubectl logs -n kube-system -l k8s-app=cilium | grep -i "unmanaged\|not managed"
```

## Step 2: Configure Cilium's Policy for Unmanaged Pods

Set Cilium's behavior when it encounters traffic from or to unmanaged endpoints.

```yaml
# cilium-configmap-unmanaged.yaml - ConfigMap configuring unmanaged pod behavior
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Policy enforcement for unmanaged endpoints:
  # "default" - no policy enforcement for unmanaged pods (allow all)
  # "always"  - enforce policy for all pods including unmanaged (deny all without explicit policy)
  # "never"   - disable policy enforcement cluster-wide
  policy-enforcement: "default"

  # Enable endpoint health checking to track managed vs unmanaged pods
  endpoint-status: "true"

  # Grace period before treating an endpoint as failed during migration
  endpoint-gc-interval: "5m"
```

```bash
# Apply the ConfigMap (restart Cilium DaemonSet to pick up changes)
kubectl apply -f cilium-configmap-unmanaged.yaml
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
cilium endpoint list | grep <pod-name>
```

## Step 4: Validate All Pods Are Managed

After remediation, confirm that all pods are managed Cilium endpoints.

```bash
# Check that all non-hostNetwork pods have Cilium endpoints
# Get total pod count (excluding host-network pods)
TOTAL_PODS=$(kubectl get pods -A --field-selector spec.hostNetwork!=true \
  --no-headers | wc -l)

# Get Cilium endpoint count (managed pods only)
CILIUM_ENDPOINTS=$(cilium endpoint list --no-headers | grep -c "ready")

echo "Total pods: $TOTAL_PODS"
echo "Cilium managed: $CILIUM_ENDPOINTS"

# Check overall Cilium health
cilium status --all-health

# Verify network connectivity for a previously unmanaged pod
kubectl exec <previously-unmanaged-pod> -- curl -s http://kubernetes.default.svc/healthz
```

## Best Practices

- Always perform CNI migrations using rolling node drains rather than in-place CNI replacement
- Monitor the Cilium endpoint list during migrations to catch any pods that fail to register
- Use `policy-enforcement: default` during migrations to avoid disrupting traffic before all pods are managed
- After completing migration, switch to `policy-enforcement: always` for consistent policy enforcement
- Set up a Prometheus alert when the number of Cilium endpoints is less than the expected pod count

## Conclusion

Handling unmanaged pods correctly is essential for safe Cilium deployments and migrations. By understanding how Cilium discovers and registers pods as endpoints, configuring the appropriate policy enforcement mode during transitions, and systematically triggering endpoint creation for existing pods, you ensure consistent networking and policy enforcement across your entire cluster. The `cilium endpoint list` command is your primary tool for monitoring management coverage during any migration.
