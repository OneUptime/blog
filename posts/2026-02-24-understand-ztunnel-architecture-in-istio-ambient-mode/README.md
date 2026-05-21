# How to Understand ztunnel Architecture in Istio Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Ztunnel, Architecture, Service Mesh

Description: A deep dive into ztunnel architecture in Istio ambient mode covering its design, responsibilities, traffic flow, and how it replaces sidecar proxies for L4 functionality.

---

ztunnel is the core data plane component of Istio ambient mode. It is a lightweight, purpose-built proxy that runs on every node in the cluster as a DaemonSet. Unlike the Envoy-based sidecar proxy that can process both L4 and L7 traffic, ztunnel focuses on L3 and L4 functionality: mTLS encryption, TCP-level authorization, and basic telemetry.

Understanding how ztunnel works helps you troubleshoot issues, tune performance, and appreciate why ambient mode is so much lighter than sidecar mode.

## What ztunnel Does

ztunnel has four main responsibilities:

1. **mTLS encryption**: Encrypts all traffic between mesh workloads using mutual TLS with SPIFFE-based identities
2. **Identity management**: Manages X.509 certificates for all workloads on its node, obtained from istiod
3. **L4 authorization**: Enforces AuthorizationPolicies that operate at the TCP level (source identity, destination port)
4. **Telemetry**: Reports TCP-level metrics like connection count, bytes sent/received, and connection duration

What ztunnel does NOT do:
- HTTP parsing or routing
- Header manipulation
- Retries or timeouts
- Circuit breaking
- Rate limiting
- Any L7 processing

Those L7 features are handled by waypoint proxies when needed.

## How ztunnel Is Deployed

ztunnel runs as a DaemonSet in the `istio-system` namespace:

```bash
kubectl get daemonset ztunnel -n istio-system
```

Output:

```text
NAME      DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
ztunnel   3         3         3       3             3           <none>          12d
```

Each ztunnel pod runs on a single node and handles traffic for all ambient mesh workloads on that node. This is a sharp contrast to sidecar mode where every pod has its own proxy.

Check the ztunnel pods:

```bash
kubectl get pods -l app=ztunnel -n istio-system -o wide
```

```text
NAME            READY   STATUS    NODE      IP
ztunnel-abc12   1/1     Running   node-1    10.0.0.5
ztunnel-def34   1/1     Running   node-2    10.0.0.6
ztunnel-ghi56   1/1     Running   node-3    10.0.0.7
```

## ztunnel Is Written in Rust

Unlike the Envoy-based sidecar proxy (which is C++), ztunnel is written in Rust. This was a deliberate choice by the Istio team for several reasons:

- Memory safety without garbage collection
- Small binary size and fast startup
- Low memory footprint (much less than Envoy for L4-only operations)
- Efficient async I/O for handling many concurrent connections

Istio's published performance testing for Istio 1.24 showed a single ztunnel proxy using about 12MB of memory under the tested workload, compared to about 60MB for a single Envoy sidecar. Actual numbers vary with traffic and configuration, but the important difference is that ztunnel is one proxy per node rather than one proxy per pod.

## Traffic Flow: Source to Destination

Here is how traffic flows through ztunnel when pod A in namespace `app-a` calls pod B in namespace `app-b`, both enrolled in ambient mode:

### Step 1: Traffic Interception

Pod A sends a regular TCP connection to pod B's ClusterIP or pod IP. The istio-cni plugin has configured in-pod iptables rules to redirect this traffic to the local ztunnel instance.

### Step 2: Source-Side Processing

The ztunnel on pod A's node:
1. Identifies the source workload and looks up its SPIFFE identity
2. Determines the destination workload
3. If a waypoint proxy is in the path, routes traffic there first
4. Establishes an HBONE (HTTP-Based Overlay Network Environment) tunnel toward the destination workload through the destination ztunnel
5. The HBONE tunnel uses mTLS, encrypting the traffic with the source workload's certificate

### Step 3: Transit

The encrypted HBONE tunnel carries the traffic across the network. Anyone sniffing packets on the wire sees encrypted TLS data, not the original application traffic.

### Step 4: Destination-Side Processing

The ztunnel on pod B's node:
1. Terminates the HBONE tunnel
2. Validates the source identity from the mTLS handshake
3. Checks destination-side L4 AuthorizationPolicies
4. Forwards the decrypted traffic to pod B

The whole process is transparent to both pods. Pod A thinks it is talking directly to pod B, and pod B thinks it is receiving a direct connection from pod A.

## Certificate Management

ztunnel needs certificates for every workload identity on its node. It receives configuration from istiod over xDS and obtains the workload certificates it needs from Istio's CA:

```bash
istioctl ztunnel-config certificates
```

```text
CERTIFICATE NAME                                              TYPE     STATUS      VALID CERT  SERIAL NUMBER
spiffe://cluster.local/ns/bookinfo/sa/bookinfo-productpage    Leaf     Available   true        abc123
spiffe://cluster.local/ns/bookinfo/sa/bookinfo-productpage    Root     Available   true        root123
spiffe://cluster.local/ns/bookinfo/sa/bookinfo-reviews        Leaf     Available   true        def456
spiffe://cluster.local/ns/bookinfo/sa/bookinfo-reviews        Root     Available   true        root123
spiffe://cluster.local/ns/default/sa/sleep                    Leaf     Available   true        ghi789
spiffe://cluster.local/ns/default/sa/sleep                    Root     Available   true        root123
```

Each workload identity corresponds to a Kubernetes ServiceAccount. All pods running under the same ServiceAccount share the same SPIFFE identity, and ztunnel manages certificates for each unique identity on the node.

When a new pod starts on the node, ztunnel requests a certificate for that pod's ServiceAccount identity from istiod. When a pod is deleted, the certificate is eventually cleaned up.

## ztunnel Configuration

ztunnel's behavior is configured through istiod. You can inspect its current configuration:

```bash
# View all workloads ztunnel knows about

istioctl ztunnel-config workloads

# View service information
istioctl ztunnel-config services

# View authorization policies loaded in ztunnel
istioctl ztunnel-config policies

# View everything
istioctl ztunnel-config all
```

The `policies` command is particularly useful for debugging authorization issues:

```bash
istioctl ztunnel-config policies
```

```text
NAMESPACE    POLICY NAME         ACTION    SCOPE
bookinfo     allow-productpage   ALLOW     Namespace
bookinfo     deny-ratings        DENY      Namespace
```

Resource Consumption

Monitor ztunnel resource usage:

```bash
kubectl top pods -l app=ztunnel -n istio-system
```

```text
NAME            CPU(cores)   MEMORY(bytes)
ztunnel-abc12   15m          32Mi
ztunnel-def34   12m          28Mi
ztunnel-ghi56   18m          35Mi
```

The resource usage scales with:
- Number of active connections on the node
- Total traffic throughput
- Number of unique workload identities (certificates to manage)

For nodes with high traffic, you may need to increase resource limits:

```yaml
# ztunnel Helm values
resources:
  requests:
    cpu: 200m
    memory: 128Mi
  limits:
    cpu: "1"
    memory: 512Mi
```

## Traffic Interception Mechanism

ztunnel relies on the istio-cni plugin to intercept traffic. The CNI plugin configures network rules when pods start and removes them when pods stop.

Current ambient mode uses in-pod iptables rules for traffic redirection. Earlier Istio ambient work included an eBPF redirection option, but the current in-pod redirection model no longer requires it.

Check the redirect rules in a workload pod:

```bash
kubectl debug <pod-name> -n <namespace> -it --image=gcr.io/istio-release/base --profile=netadmin -- iptables-save
```

## ztunnel Scaling

Because ztunnel is a DaemonSet, it scales automatically with your cluster. Add a node, get a ztunnel. Remove a node, lose a ztunnel. You do not need to think about scaling it manually.

However, if one node has disproportionately more traffic than others (hot nodes), the ztunnel on that node will use more resources. This is a natural consequence of the per-node architecture and is usually not a problem unless node traffic distribution is extremely skewed.

## Comparing ztunnel to Envoy Sidecar

| Aspect | ztunnel | Envoy Sidecar |
|--------|---------|---------------|
| Language | Rust | C++ |
| Scope | L3/L4 only | L4-L7 |
| Deployment | Per-node DaemonSet | Per-pod container |
| Memory | About 12MB in Istio's 1.24 benchmark, per node | About 60MB in Istio's 1.24 benchmark, per pod |
| Configuration | Via istiod, minimal | Via istiod, extensive |
| Features | mTLS, L4 auth, TCP metrics | Full traffic management |

ztunnel is not a replacement for Envoy. It is a complement that handles the common case (L4 security) efficiently, while waypoint proxies (which run Envoy) handle the less common L7 cases. This split is what makes ambient mode so resource-efficient.
