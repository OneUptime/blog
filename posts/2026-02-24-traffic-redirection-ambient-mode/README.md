# How to Handle Traffic Redirection in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Traffic Redirection, Kubernetes, CNI

Description: Understanding how traffic redirection works in Istio ambient mode using the CNI plugin, iptables, and eBPF for transparent interception.

---

Traffic redirection is how Istio ambient mode captures network traffic from your pods without requiring any changes to your application code. Unlike sidecar mode where an init container sets up iptables rules within a pod's network namespace, ambient mode handles redirection at the node level through the Istio CNI plugin. Understanding this mechanism is critical for troubleshooting connectivity issues and ensuring your workloads work correctly with the ambient mesh.

## How Traffic Gets Captured

In ambient mode, when a pod starts in a namespace with the `istio.io/dataplane-mode=ambient` label, the Istio CNI plugin detects it and sets up redirection rules. These rules ensure that:

- Outbound traffic from the pod is redirected to the local ztunnel
- Inbound traffic destined for the pod is routed through the local ztunnel

The CNI plugin runs as a DaemonSet and hooks into the Kubernetes pod lifecycle:

```bash
# Check the Istio CNI plugin pods
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide
```

## The Redirection Mechanism

Istio ambient mode supports two traffic redirection mechanisms: iptables and eBPF. The method used depends on your Istio version and configuration.

**iptables-based redirection:**

The CNI plugin creates iptables rules in the pod's network namespace that redirect traffic to ztunnel. You can inspect these rules:

```bash
# Find the PID of a pod in the ambient mesh
POD_NAME=my-pod
CONTAINER_ID=$(kubectl get pod $POD_NAME -n my-app -o jsonpath='{.status.containerStatuses[0].containerID}' | sed 's/containerd:\/\///')

# On the node, inspect the iptables rules (requires node access)
nsenter -t $(crictl inspect $CONTAINER_ID | jq .info.pid) -n iptables-save
```

The iptables rules typically look something like:

```
-A OUTPUT -j ISTIO_OUTPUT
-A ISTIO_OUTPUT -p tcp -j MARK --set-xmark 0x100/0x100
```

The mark value tells the host network stack to route the traffic to ztunnel instead of sending it directly to the destination.

**eBPF-based redirection:**

Newer versions of Istio support eBPF for traffic redirection, which is more efficient than iptables:

```bash
# Check if eBPF mode is enabled
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -i ebpf
```

eBPF programs attach to the network interfaces and redirect packets directly, avoiding the overhead of iptables chain traversal.

## Traffic Flow in Detail

Here is the detailed flow for a request from pod A to pod B, both in ambient-enrolled namespaces on different nodes:

```
1. Pod A sends TCP SYN to Pod B's ClusterIP
2. CNI redirection captures the packet on Node A
3. Packet is redirected to ztunnel on Node A (via TPROXY or MARK)
4. ztunnel on Node A:
   a. Resolves the destination service
   b. Applies L4 authorization policies
   c. Selects a backend pod (load balancing)
   d. Initiates HBONE connection to ztunnel on Node B
   e. Wraps the TCP stream in HTTP/2 CONNECT
   f. Applies mTLS encryption
5. ztunnel on Node B:
   a. Terminates the HBONE connection
   b. Verifies the source identity
   c. Applies destination-side L4 authorization policies
   d. Delivers the traffic to Pod B
```

If a waypoint proxy is configured for the destination service, step 4d routes to the waypoint instead, which adds L7 processing before forwarding to the destination ztunnel.

## Checking Redirection Is Working

You can verify that traffic redirection is properly configured by testing connectivity and checking ztunnel logs:

```bash
# Deploy a test pod in the ambient namespace
kubectl run test-pod --image=curlimages/curl -n my-app -- sleep 3600

# Exec into the test pod and make a request
kubectl exec -it test-pod -n my-app -- curl -v http://my-service:8080/health

# Check ztunnel logs on the source node
NODE=$(kubectl get pod test-pod -n my-app -o jsonpath='{.spec.nodeName}')
kubectl logs -n istio-system -l app=ztunnel --field-selector spec.nodeName=$NODE --tail=50
```

In the ztunnel logs, you should see connection events showing the traffic was intercepted and forwarded.

## Handling Traffic That Should Not Be Redirected

Some traffic should bypass the mesh entirely. For example, traffic to the Kubernetes API server, DNS queries to kube-dns, or health check probes from the kubelet.

Ambient mode automatically excludes certain traffic:

- Traffic to the Kubernetes API server
- Traffic within the `kube-system` namespace
- Traffic from non-ambient namespaces

If you need to exclude additional traffic, you can use annotations on pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: special-pod
  namespace: my-app
  annotations:
    traffic.istio.io/excludeOutboundPorts: "9090,9091"
    traffic.istio.io/excludeInboundPorts: "8443"
spec:
  containers:
  - name: app
    image: my-app:latest
```

You can also exclude specific CIDR ranges:

```yaml
annotations:
  traffic.istio.io/excludeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"
```

## Troubleshooting Redirection Issues

**Traffic not being intercepted:**

If traffic is going directly to the destination without passing through ztunnel, check:

```bash
# Verify the namespace has the ambient label
kubectl get namespace my-app -o jsonpath='{.metadata.labels.istio\.io/dataplane-mode}'

# Verify the CNI plugin is running on the node
kubectl get pods -n istio-system -l k8s-app=istio-cni-node --field-selector spec.nodeName=$(kubectl get pod my-pod -n my-app -o jsonpath='{.spec.nodeName}')

# Check CNI plugin logs
kubectl logs -n istio-system $(kubectl get pod -n istio-system -l k8s-app=istio-cni-node -o jsonpath='{.items[0].metadata.name}') --tail=100
```

**Connection timeouts after enabling ambient:**

This usually means the redirection rules are in place but ztunnel is not properly handling the traffic. Check ztunnel health:

```bash
# Check ztunnel readiness
kubectl get pods -n istio-system -l app=ztunnel

# Check ztunnel logs for errors
kubectl logs -n istio-system -l app=ztunnel --tail=100 | grep -i error
```

**DNS resolution failures:**

Ambient mode should not affect DNS resolution since DNS traffic is typically excluded from redirection. But if you see DNS issues:

```bash
# Verify DNS traffic is not being redirected
kubectl exec test-pod -n my-app -- nslookup kubernetes.default.svc.cluster.local
```

## Pod Startup Ordering

One important consideration with ambient mode traffic redirection is pod startup ordering. The CNI plugin sets up redirection rules when a pod is created. If ztunnel is not ready on a node when a pod starts, the redirected traffic will fail because there is nothing to handle it.

Istio handles this by having the CNI plugin check ztunnel readiness before configuring redirection. If ztunnel is not ready, the CNI plugin waits or skips redirection setup until ztunnel becomes available.

```bash
# Check ztunnel readiness on a specific node
kubectl get pod -n istio-system -l app=ztunnel --field-selector spec.nodeName=node-1 -o jsonpath='{.items[0].status.conditions}'
```

## Performance Considerations

Traffic redirection adds latency because every connection goes through ztunnel. The overhead is typically small (sub-millisecond for iptables, even less for eBPF), but it is measurable. Things to consider:

- eBPF redirection has lower overhead than iptables
- The number of iptables rules does not scale with the number of pods (unlike sidecar mode where each pod has its own rules)
- ztunnel's connection handling is the main source of latency, not the redirection itself

## Summary

Traffic redirection in Istio ambient mode happens transparently through the Istio CNI plugin, which sets up iptables or eBPF rules to capture pod traffic and route it through ztunnel. The mechanism handles both inbound and outbound traffic, supports exclusions for traffic that should bypass the mesh, and automatically manages pod startup ordering. When troubleshooting ambient mode connectivity issues, the redirection layer is often the first place to look.
