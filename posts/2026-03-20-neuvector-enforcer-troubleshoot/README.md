# How to Troubleshoot NeuVector Enforcer Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Enforcer, Troubleshooting, Kubernetes, Security, DaemonSet, SUSE Rancher

Description: Learn how to diagnose and fix NeuVector Enforcer issues including pods not connecting, policy not being enforced, eBPF probe failures, and kernel compatibility problems.

---

The NeuVector Enforcer is a DaemonSet that runs on every node and enforces security policies at the network and process level. When the Enforcer fails or is misconfigured, security policies may not be applied.

---

## Step 1: Check Enforcer Status

```bash
# Check all enforcer pods across the cluster

kubectl get pods -n neuvector -l app=neuvector-enforcer-pod -o wide

# Confirm each node has one enforcer pod
kubectl get pods -n neuvector -l app=neuvector-enforcer-pod | wc -l
# Should equal number of nodes
kubectl get nodes | wc -l

# Check enforcer logs
kubectl logs -n neuvector \
  -l app=neuvector-enforcer-pod \
  --tail=100 \
  --prefix=true | grep -i "error\|fail\|warn"
```

---

## Issue 1: Enforcer Not Running on Some Nodes

**Cause**: The Enforcer DaemonSet has a taint mismatch with some nodes.

```bash
# Check which nodes are missing enforcer pods
kubectl get pods -n neuvector -l app=neuvector-enforcer-pod -o wide | awk '{print $7}'

# Compare with all nodes
kubectl get nodes | awk '{print $1}'

# Check DaemonSet tolerations
kubectl get daemonset neuvector-enforcer-pod -n neuvector \
  -o jsonpath='{.spec.template.spec.tolerations}'

# Add missing toleration if needed
kubectl patch daemonset neuvector-enforcer-pod -n neuvector --type merge -p '{
  "spec": {
    "template": {
      "spec": {
        "tolerations": [
          {"operator": "Exists"}
        ]
      }
    }
  }
}'
```

---

## Issue 2: Enforcer Cannot Connect to Controller

```bash
# Check controller pod is running
kubectl get pods -n neuvector -l app=neuvector-controller-pod

# Verify the controller service has ready endpoints. The enforcer connects to the
# controller on TCP 18301 (cluster/Serf) and 18300 (RPC), not the REST API port 10443.
kubectl get endpoints neuvector-svc-controller -n neuvector
kubectl describe svc neuvector-svc-controller -n neuvector

# Check NetworkPolicy - the enforcer needs TCP access to the controller on 18300/18301
kubectl get networkpolicy -n neuvector
```

---

## Issue 3: eBPF or Kernel Probe Failures

NeuVector uses eBPF or kernel modules for network monitoring. Failures here reduce visibility:

```bash
# Check if the enforcer is in degraded mode
kubectl logs -n neuvector \
  $(kubectl get pod -n neuvector -l app=neuvector-enforcer-pod -o jsonpath='{.items[0].metadata.name}') \
  | grep -i "ebpf\|probe\|module"

# Verify kernel version - confirm the node kernel is on a supported distro/version
uname -r

# Check if BPF filesystem is mounted
mount | grep bpf
# If not: mount -t bpf bpf /sys/fs/bpf

# Check kernel modules
lsmod | grep -E "nfnetlink|xt_"
```

---

## Issue 4: Policy Not Being Enforced

```bash
# Verify Enforcer is in "Protect" mode (not "Discover" or "Monitor")
# NeuVector UI: Policy > Groups > [Group] > Policy Mode

# Check via API
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/group \
  | jq '.groups[] | {name:.name, mode:.policy_mode}'

# Force refresh enforcer config
kubectl rollout restart daemonset/neuvector-enforcer-pod -n neuvector
```

---

## Step 5: Capture Enforcer Debug Logs

```bash
# Enable debug logging on a specific enforcer
kubectl exec -n neuvector \
  $(kubectl get pod -n neuvector -l app=neuvector-enforcer-pod -o jsonpath='{.items[0].metadata.name}') \
  -- cat /proc/1/cmdline | tr '\0' ' '

# Enable controller debug categories via NeuVector API (temporary)
curl -sk -X PATCH \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/system/config \
  -d '{"config":{"controller_debug":["cpath","conn"]}}'
```

---

## Best Practices

- Use `tolerations: [{operator: "Exists"}]` on the Enforcer DaemonSet to ensure it runs on all nodes including tainted ones.
- Run on a Linux distribution and kernel version listed in the NeuVector system requirements - older or unsupported kernels can limit network monitoring features.
- Monitor Enforcer pod memory - on busy nodes with many containers, the Enforcer may need 512MB+.
