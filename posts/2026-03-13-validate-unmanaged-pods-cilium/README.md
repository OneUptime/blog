# Validate Unmanaged Pods in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: Learn how to identify and validate unmanaged pods in a Cilium-managed cluster - pods that are not under Cilium's network policy enforcement - and understand when this is intentional versus a...

---

## Introduction

In Cilium, every pod that is connected to the network through the Cilium CNI plugin is represented as a managed endpoint. Cilium applies network policies, enforces identity-based security, and tracks connectivity for managed pods. However, some pods may be "unmanaged" - either because they use host networking, were created before Cilium was installed, or are running on nodes where Cilium is not functioning correctly.

Unmanaged pods are a security concern because they bypass Cilium's network policy enforcement. A pod that should be subject to isolation policies but is running unmanaged has unrestricted network access. Validating which pods are unmanaged and understanding why is essential for ensuring your security posture is correctly implemented.

This guide covers identifying unmanaged pods, understanding their causes, and resolving unintended unmanaged pod states.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `cilium` CLI installed
- `kubectl` with cluster admin access

## Step 1: Identify Unmanaged Pods

List pods that Cilium is not managing as endpoints.

```bash
# List all Cilium-managed endpoints
cilium endpoint list

# Get the count of managed endpoints
cilium endpoint list | grep -c "ready"

# Get all running pods and compare with Cilium endpoints
echo "Running pods: $(kubectl get pods --all-namespaces --field-selector=status.phase=Running --no-headers | wc -l)"
echo "Cilium endpoints: $(cilium endpoint list | grep -c 'endpoint')"

# Use cilium status to check for unmanaged pods
cilium status --verbose | grep -i "unmanaged\|not managed"
```

## Step 2: Find Pods Not Represented as Cilium Endpoints

Cross-reference running pods with Cilium endpoints to identify gaps.

```bash
# Get all pod IPs
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.status.podIP}{"\n"}{end}' | grep -v "^$" | sort > /tmp/pod-ips.txt

# Get all Cilium endpoint IPs
CALICO_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1)
kubectl exec -n kube-system $CALICO_POD -- cilium endpoint list -o json | \
  python3 -c "import json,sys; [print(e['status']['networking']['addressing'][0]['ipv4']) for e in json.load(sys.stdin) if e.get('status',{}).get('networking',{}).get('addressing')]" | sort > /tmp/cilium-ips.txt

# Find pod IPs not in Cilium endpoint list
diff /tmp/pod-ips.txt /tmp/cilium-ips.txt
```

## Step 3: Inspect Host-Network Pods

Host-network pods use the node's IP and are typically not managed as Cilium endpoints - this is usually intentional.

```bash
# List all host-network pods (these are expected to be unmanaged in most cases)
kubectl get pods --all-namespaces -o wide | grep "true"
kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.hostNetwork==true)]}{.metadata.namespace}{"\t"}{.metadata.name}{"\n"}{end}'

# Verify that Cilium system pods themselves use host network (expected)
kubectl get pods -n kube-system -l k8s-app=cilium -o jsonpath='{.items[0].spec.hostNetwork}'
```

## Step 4: Investigate Non-Host-Network Unmanaged Pods

If non-host-network pods are unmanaged by Cilium, investigate the cause.

```bash
# Check if the pod is on a node where Cilium is not running
kubectl get pod <unmanaged-pod> -o wide  # Note the node name
kubectl get pod -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=<pod-node>

# Check the pod's CNI annotations
kubectl get pod <unmanaged-pod> -o jsonpath='{.metadata.annotations}' | python3 -m json.tool

# Check if the pod was annotated to skip Cilium
kubectl get pod <unmanaged-pod> -o yaml | grep -i "cilium\|cni"

# Check Cilium logs for errors processing the pod
kubectl logs -n kube-system $(kubectl get pod -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=<pod-node> -o name) \
  -c cilium-agent | grep <unmanaged-pod-name>
```

## Step 5: Resolve Unintentional Unmanaged Pod States

Fix pods that are unintentionally not managed by Cilium.

```bash
# If Cilium agent is not running on the pod's node, restart it
kubectl delete pod -n kube-system $(kubectl get pod -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=<pod-node> -o name)

# If the pod was created before Cilium started, recreate the pod
kubectl delete pod <unmanaged-pod>
# The deployment/replicaset will recreate it through Cilium

# After recreation, verify the pod is now managed
cilium endpoint list | grep <pod-ip>
```

## Best Practices

- Regularly audit unmanaged pods using `cilium endpoint list` comparisons in your monitoring pipeline
- Use Cilium's `--ensure-no-host-ns-pods` flag to alert on unexpected host-network pods
- In security-sensitive environments, use Cilium's default-deny policies which require endpoints to be managed
- Monitor Cilium endpoint creation failures in Cilium agent metrics
- Document expected unmanaged pods (system DaemonSets with hostNetwork) to distinguish them from problems

## Conclusion

Unmanaged pods in Cilium represent a gap in your network security posture since they bypass policy enforcement. By systematically identifying unmanaged pods, distinguishing expected host-network pods from unexpected gaps, and resolving Cilium agent failures, you ensure comprehensive network policy coverage. Periodic audits of managed vs total pod counts should be part of your cluster security review process.
