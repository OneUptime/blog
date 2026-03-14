# Cilium CNI Configuration: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF, IPAM

Description: Learn how to configure Cilium's CNI plugin settings, understand the CNI configuration file structure, troubleshoot CNI-level issues, and validate proper CNI operation in your Kubernetes cluster.

---

## Introduction

The Container Network Interface (CNI) plugin configuration is the low-level interface between Kubernetes and Cilium's networking implementation. When a pod is created, the kubelet invokes the CNI plugin specified in `/etc/cni/net.d/` with instructions to configure the pod's network namespace. Cilium installs its own CNI configuration file that tells the kubelet to invoke the Cilium CNI binary (`/opt/cni/bin/cilium-cni`) for all pod networking operations.

Cilium's CNI configuration is distinct from the higher-level Cilium configuration in the ConfigMap. The CNI config is written to each node during Cilium installation and specifies parameters like the CNI binary path, chaining mode (for use alongside other CNI plugins), and configuration file name. Incorrect CNI configuration is often the cause of pods getting stuck in `ContainerCreating` state with "failed to configure netns" errors.

This guide covers how to configure Cilium's CNI plugin, troubleshoot CNI configuration issues, validate that the CNI is correctly installed on all nodes, and monitor for CNI-level failures.

## Prerequisites

- Cilium installed or being installed on Kubernetes nodes
- Node access via `kubectl debug` or SSH
- `kubectl` with cluster admin access
- Understanding of the Kubernetes CNI specification

## Configure Cilium CNI

Understand and configure Cilium's CNI installation:

```bash
# Check Cilium CNI configuration on a node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/05-cilium.conf

# Typical Cilium CNI configuration:
cat /etc/cni/net.d/05-cilium.conf
```

```json
{
  "cniVersion": "0.3.1",
  "name": "cilium",
  "type": "cilium-cni",
  "enable-debug": false,
  "log-file": "/var/run/cilium/cilium-cni.log"
}
```

Configure CNI installation via Helm:

```bash
# Configure CNI binary installation path
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set cni.binPath=/opt/cni/bin \
  --set cni.confPath=/etc/cni/net.d \
  --set cni.exclusive=true

# Configure CNI in chaining mode (alongside another CNI)
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set cni.chainingMode=portmap \
  --set cni.exclusive=false

# Configure CNI log level
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set cni.logFile=/var/run/cilium/cilium-cni.log
```

Verify CNI binary is installed on nodes:

```bash
# Check CNI binary exists
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /opt/cni/bin/cilium-cni

# Check CNI config file name takes priority (lower number = higher priority)
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls /etc/cni/net.d/ | sort
# Cilium should be first (05-cilium.conf before 10-*)
```

## Troubleshoot CNI Configuration

Diagnose CNI-level issues:

```bash
# Pods stuck in ContainerCreating with CNI error
kubectl describe pod <stuck-pod>
# Look for: "network plugin is not ready: cni config uninitialized"
# or: "failed to find plugin cilium-cni in path [/opt/cni/bin]"

# Check CNI binary is present on the node
NODE=$(kubectl get pod <stuck-pod> -o jsonpath='{.spec.nodeName}')
kubectl debug node/$NODE -it --image=ubuntu -- \
  ls /opt/cni/bin/cilium-cni

# Check CNI configuration file
kubectl debug node/$NODE -it --image=ubuntu -- \
  cat /etc/cni/net.d/05-cilium.conf

# Check Cilium CNI logs
kubectl debug node/$NODE -it --image=ubuntu -- \
  cat /var/run/cilium/cilium-cni.log | tail -50

# Check if Cilium socket is accessible (CNI binary communicates via socket)
kubectl debug node/$NODE -it --image=ubuntu -- \
  ls /var/run/cilium/cilium.sock
```

Fix common CNI errors:

```bash
# Issue: CNI binary not found
# Cilium DaemonSet should install it - check if DaemonSet is running
kubectl -n kube-system get pods -l k8s-app=cilium --field-selector spec.nodeName=$NODE

# Issue: Multiple CNI configs (conflict)
kubectl debug node/$NODE -it --image=ubuntu -- ls /etc/cni/net.d/
# Remove non-Cilium configs or use exclusive=true

# Issue: CNI config invalid JSON
kubectl debug node/$NODE -it --image=ubuntu -- \
  python3 -c "import json; json.load(open('/etc/cni/net.d/05-cilium.conf'))"

# Issue: Wrong permissions on CNI binary
kubectl debug node/$NODE -it --image=ubuntu -- \
  stat /opt/cni/bin/cilium-cni
# Should be executable: -rwxr-xr-x
```

## Validate CNI Configuration

Confirm CNI is correctly installed and functional:

```bash
# Validate CNI binary is executable on all nodes
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  STATUS=$(kubectl debug node/$node --image=ubuntu -q -- \
    test -x /opt/cni/bin/cilium-cni && echo "OK" || echo "MISSING" 2>/dev/null)
  echo "$node: $STATUS"
done

# Test pod creation (ultimate CNI validation)
kubectl run cni-test --image=nginx --restart=Never
kubectl wait pod/cni-test --for=condition=Ready --timeout=60s
kubectl get pod cni-test -o wide
kubectl delete pod cni-test

# Validate CNI version compatibility
kubectl debug node/<node-name> -it --image=ubuntu -- \
  /opt/cni/bin/cilium-cni --version
```

## Monitor CNI Health

```mermaid
graph TD
    A[kubelet creates pod] -->|Calls CNI| B[cilium-cni binary]
    B -->|Unix socket| C[Cilium Agent]
    C -->|IPAM request| D[Assign IP]
    D -->|Configure netns| E[Pod Network Ready]
    B -->|Log| F[/var/run/cilium/cilium-cni.log]
    G[Monitor] -->|Watch| F
    G -->|Alert| H[CNI Error Detected]
```

Monitor CNI operations:

```bash
# Watch CNI logs for errors on all nodes
kubectl -n kube-system exec ds/cilium -- \
  tail -f /var/run/cilium/cilium-cni.log | grep -i error

# Monitor pod creation success rate
kubectl get events -A --watch | grep -E "ContainerCreating|Failed|CNI"

# Count CNI errors per node
for pod in $(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[*].metadata.name}'); do
  ERRORS=$(kubectl -n kube-system exec $pod -- \
    grep -c "error" /var/run/cilium/cilium-cni.log 2>/dev/null || echo 0)
  NODE=$(kubectl -n kube-system get pod $pod -o jsonpath='{.spec.nodeName}')
  echo "$NODE ($pod): $ERRORS CNI errors"
done
```

## Conclusion

Cilium's CNI configuration is the foundation that enables pod networking in Kubernetes. The CNI binary installed on each node handles the critical path of pod network setup and teardown, communicating with the Cilium agent daemon via Unix socket. Ensuring the CNI binary is correctly installed, the configuration file takes priority over other CNI configs, and the Cilium socket is accessible prevents the most common class of pod networking failures. Regular monitoring of CNI logs and pod creation success rates provides early warning of CNI infrastructure issues.
