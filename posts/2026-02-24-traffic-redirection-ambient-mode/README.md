# How to Handle Traffic Redirection in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Traffic Redirection, Kubernetes, CNI

Description: Understanding how traffic redirection works in Istio ambient mode using the CNI plugin, iptables, and eBPF for transparent interception.

---

Traffic redirection is how Istio ambient mode captures network traffic from your pods without requiring any changes to your application code. Unlike sidecar mode where an init container sets up iptables rules within a pod's network namespace, ambient mode uses the Istio CNI node agent together with ztunnel to configure in-pod redirection and local ztunnel proxy ports. Understanding this mechanism is critical for troubleshooting connectivity issues and ensuring your workloads work correctly with the ambient mesh.

## How Traffic Gets Captured

In ambient mode, when a pod starts in or is added to a namespace with the `istio.io/dataplane-mode=ambient` label, the Istio CNI plugin detects it and sets up redirection rules. These rules ensure that:

- Outbound traffic from the pod is redirected to the local ztunnel
- Inbound traffic destined for the pod is routed through the local ztunnel

The CNI plugin runs as a DaemonSet and hooks into the Kubernetes pod lifecycle:

```bash
# Check the Istio CNI plugin pods

kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide
```

## The Redirection Mechanism

Current Istio ambient mode uses in-pod iptables/netfilter rules for traffic redirection. Earlier ambient implementations experimented with other mechanisms, including eBPF, but the current documented model is iptables-based in-pod redirection.

**iptables-based redirection:**

The CNI plugin creates iptables rules in the pod's network namespace that redirect traffic to ztunnel. You can inspect these rules:

```bash
# Inspect iptables rules from an ephemeral debug container with NET_ADMIN
kubectl debug my-pod -it --image=gcr.io/istio-release/base --profile=netadmin -n my-app -- iptables-save
```

The iptables rules typically look something like:

```text
-A OUTPUT -j ISTIO_OUTPUT
-A ISTIO_OUTPUT -p tcp -m mark ! --mark 0x539/0xfff -j REDIRECT --to-ports 15001
```

The mark match helps identify packets already handled by ztunnel so that the in-pod rules can avoid redirecting them again.

## Traffic Flow in Detail

Here is the detailed flow for a request from pod A to pod B, both in ambient-enrolled namespaces on different nodes:

```text
1. Pod A sends TCP traffic to Pod B's service
2. CNI-configured rules capture the packet in Pod A's network namespace
3. Packet is redirected to ztunnel on Node A
4. ztunnel on Node A:
   a. Resolves the destination service
   b. Looks up the destination workload
   c. Selects the destination workload for L4 forwarding
   d. Initiates HBONE connection to ztunnel on Node B
   e. Wraps the TCP stream in HTTP/2 CONNECT
   f. Applies mTLS encryption
5. ztunnel on Node B:
   a. Terminates the HBONE connection
   b. Verifies the source identity
   c. Applies L4 authorization policies on the receiving path
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

Ambient mode automatically handles certain traffic specially:

- Traffic from non-ambient sources is not captured by a source ztunnel
- Kubelet health probes are identified and allowed with special handling
- Traffic in namespaces that are not labeled for ambient mode is not enrolled

If you need to exclude additional traffic, you can use annotations on pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: special-pod
  namespace: my-app
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "9090,9091"
    traffic.sidecar.istio.io/excludeInboundPorts: "8443"
spec:
  containers:
  - name: app
    image: my-app:latest
```

You can also exclude specific CIDR ranges:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"
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

Ambient mode can proxy DNS for ambient workloads, and Istio 1.25 and later enable ambient DNS proxying by default for new pods. But if you see DNS issues:

```bash
# Verify DNS resolution from the pod
kubectl exec test-pod -n my-app -- nslookup kubernetes.default.svc.cluster.local
```

## Pod Startup Ordering

One important consideration with ambient mode traffic redirection is pod startup ordering. The CNI plugin sets up redirection rules when a pod is created. If redirection is not configured before the pod starts sending traffic, traffic could bypass the mesh.

Istio handles this by having the chained CNI plugin notify the `istio-cni` node agent and block pod startup until redirection is successfully configured.

```bash
# Check ztunnel readiness on a specific node
kubectl get pod -n istio-system -l app=ztunnel --field-selector spec.nodeName=node-1 -o jsonpath='{.items[0].status.conditions}'
```

## Performance Considerations

Traffic redirection adds latency because every connection goes through ztunnel. The overhead is typically small, but it is measurable. Things to consider:

- Current ambient redirection uses a compact set of in-pod iptables/netfilter rules
- Workloads do not need a sidecar proxy in every pod, but each enrolled pod still has redirection rules in its own network namespace
- ztunnel's connection handling is the main source of latency, not the redirection itself

## Summary

Traffic redirection in Istio ambient mode happens transparently through the Istio CNI plugin, which sets up in-pod iptables rules to capture pod traffic and route it through ztunnel. The mechanism handles both inbound and outbound traffic, supports exclusions for traffic that should bypass the mesh, and manages pod startup ordering so redirection is configured before traffic can escape. When troubleshooting ambient mode connectivity issues, the redirection layer is often the first place to look.
