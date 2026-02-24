# How to Handle Network Plugin Compatibility in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, CNI, Networking, Kubernetes

Description: How to identify and resolve compatibility issues between Istio ambient mode and various Kubernetes CNI plugins.

---

Istio ambient mode relies on low-level network manipulation to redirect traffic through the ztunnel proxy. This means it needs to work alongside whatever CNI (Container Network Interface) plugin your cluster is using. Not every CNI plays nicely with ambient mode, and when there are conflicts, you get mysterious networking failures. This guide covers the known compatibility issues and workarounds for common CNI plugins.

## How Ambient Mode Handles Networking

Before getting into CNI-specific issues, it helps to understand what ambient mode does at the network level. The Istio CNI agent (which runs as a DaemonSet) is responsible for:

1. Detecting pods that should be in the ambient mesh
2. Setting up network redirection rules (iptables or eBPF) so traffic from those pods goes through ztunnel
3. Setting up rules so traffic destined for those pods also goes through ztunnel

This network manipulation must coexist with whatever the cluster's CNI plugin is doing. If there are conflicts in iptables rule ordering or network namespace configuration, traffic can break.

## Checking Your CNI Plugin

First, identify what CNI plugin your cluster is running:

```bash
# Check the CNI configuration directory
ls /etc/cni/net.d/

# Or check the CNI binaries
ls /opt/cni/bin/

# For managed clusters, check the kube-system namespace
kubectl get pods -n kube-system | grep -E "calico|cilium|flannel|weave|antrea"
```

## Calico Compatibility

Calico is one of the most widely used CNI plugins and generally works well with ambient mode. However, there are a few things to watch for.

### Calico with iptables mode

Calico's iptables mode works with ambient mode out of the box. Make sure Istio CNI is installed and configured correctly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  components:
    cni:
      enabled: true
  values:
    cni:
      ambient:
        enabled: true
```

### Calico with eBPF mode

Calico's eBPF dataplane can conflict with Istio ambient mode because both try to intercept traffic at the kernel level. If you are running Calico in eBPF mode, you may need to disable Calico's eBPF for pods in the ambient mesh:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true
  bpfExternalServiceMode: DSR
```

If you see connection failures after enabling ambient mode with Calico eBPF, check the ztunnel logs for redirection errors:

```bash
kubectl logs -n istio-system -l app=ztunnel | grep -i "redirect\|intercept\|error"
```

A workaround is to use Calico in iptables mode for namespaces that are part of the ambient mesh.

## Cilium Compatibility

Cilium is popular in modern clusters and has its own eBPF-based networking stack. Ambient mode compatibility with Cilium requires specific configuration.

### Disabling Cilium's kube-proxy Replacement for Mesh Traffic

Cilium often replaces kube-proxy with its own eBPF-based service routing. This can interfere with how ztunnel routes traffic:

```yaml
# In the Cilium ConfigMap or Helm values
kubeProxyReplacement: partial
hostServices:
  enabled: false
  protocols: tcp
socketLB:
  enabled: true
  hostNamespaceOnly: true
```

Setting `hostNamespaceOnly: true` for socketLB prevents Cilium from intercepting pod traffic that should go through ztunnel.

### Cilium CNI Chaining

Istio CNI needs to chain with Cilium. Verify the CNI chain is set up correctly:

```bash
# Check the CNI configuration
cat /etc/cni/net.d/05-cilium.conflist
```

The Istio CNI plugin should appear in the plugins list:

```json
{
  "name": "cilium",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "cilium-cni"
    },
    {
      "type": "istio-cni"
    }
  ]
}
```

If istio-cni is not in the chain, reinstall the Istio CNI with the proper configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    cni:
      ambient:
        enabled: true
      cniConfDir: /etc/cni/net.d
      cniBinDir: /opt/cni/bin
```

## Flannel Compatibility

Flannel is the simplest CNI and usually works with ambient mode without issues. The main concern is that Flannel uses VXLAN encapsulation, which adds overhead:

```bash
# Verify Flannel is running
kubectl get pods -n kube-flannel

# Check the Flannel interface
kubectl debug node/my-node -it --image=nicolaka/netshoot -- ip link show flannel.1
```

If you see MTU-related issues (connections hang or packets get dropped), adjust the MTU on the ztunnel:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      env:
        ZTUNNEL_OUTBOUND_MTU: "1400"
```

Flannel's default MTU is usually 1450 (1500 minus 50 for VXLAN overhead). ztunnel needs to use a slightly lower MTU to account for its own encapsulation.

## Antrea Compatibility

Antrea is a CNI plugin that supports both OVS-based and eBPF datapath. For ambient mode:

```yaml
# Antrea configuration for compatibility with ambient mode
apiVersion: crd.antrea.io/v1alpha1
kind: AntreaAgentConfiguration
spec:
  trafficEncapMode: encap
  noSNAT: true
```

The `noSNAT` setting is important because Istio ambient mode needs to see the original source IP of pods to enforce authorization policies. If the CNI performs SNAT, ztunnel sees the node IP instead of the pod IP, breaking identity-based policies.

## Debugging CNI Conflicts

When you suspect a CNI conflict, here is a systematic debugging approach:

### Check iptables Rules

```bash
# On the node, check iptables rules
kubectl debug node/my-node -it --image=nicolaka/netshoot -- \
  iptables-save | grep -E "ztunnel|istio|ISTIO"
```

You should see rules that redirect traffic to ztunnel. If these rules are missing or in the wrong chain position, the CNI might be overwriting them.

### Check Network Namespaces

```bash
# Verify pod network namespace setup
kubectl debug node/my-node -it --image=nicolaka/netshoot -- \
  nsenter -t $(pgrep -f "my-app-container") -n -- iptables-save
```

### Check CNI Plugin Logs

```bash
# Istio CNI agent logs
kubectl logs -n istio-system -l k8s-app=istio-cni-node

# Check for errors during pod setup
kubectl logs -n istio-system -l k8s-app=istio-cni-node | grep -i "error\|fail"
```

### Verify Traffic Flow

Use tcpdump to verify traffic is being redirected correctly:

```bash
# Capture traffic on the ztunnel pod
kubectl exec -n istio-system ztunnel-xxxxx -- \
  tcpdump -i any -n port 15008 -c 20

# Or from a debug pod on the node
kubectl debug node/my-node -it --image=nicolaka/netshoot -- \
  tcpdump -i any -n "port 15008 or port 15001" -c 20
```

Port 15008 is the HBONE port used by ztunnel. If you see traffic on this port, redirection is working.

## General Best Practices

1. **Install Istio CNI after the primary CNI**: The Istio CNI plugin should chain after the primary CNI, not replace it.

2. **Avoid eBPF conflicts**: If both your CNI and Istio use eBPF, check for conflicts. In some cases, you may need to disable eBPF features on one side.

3. **Match MTU settings**: Ensure ztunnel's MTU is compatible with your CNI's encapsulation overhead.

4. **Test with a simple workload first**: Before rolling out ambient mode cluster-wide, test with a single namespace and simple HTTP services.

5. **Keep CNI and Istio versions updated**: Compatibility improves with each release. Check the Istio release notes for CNI-specific fixes.

```bash
# Quick compatibility test
kubectl create namespace cni-test
kubectl label namespace cni-test istio.io/dataplane-mode=ambient

kubectl apply -n cni-test -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
        - name: httpbin
          image: kennethreitz/httpbin
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
spec:
  selector:
    app: httpbin
  ports:
    - port: 80
EOF

# Test connectivity
kubectl run -n cni-test test --image=curlimages/curl --rm -it -- \
  curl -s http://httpbin/get
```

If this works, your CNI is compatible with ambient mode for basic traffic. Add authorization policies and waypoint proxies incrementally to test more advanced features.

CNI compatibility is one of the trickiest aspects of running Istio ambient mode. The key is to understand what network-level changes both your CNI and Istio are making, and ensure they do not conflict. When in doubt, start with iptables-based CNI modes rather than eBPF, as they tend to have fewer conflicts.
