# How to Understand Sidecar Proxy Port Capture in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, iptables, Envoy, Kubernetes, Networking

Description: A deep look at how Istio captures traffic through iptables rules and redirects it to the Envoy sidecar proxy for processing.

---

When Istio injects a sidecar into your pod, it does not just add a container. It also sets up networking rules that redirect all inbound and outbound traffic through the Envoy proxy. Understanding how this traffic capture works helps you debug networking issues, configure port exclusions, and understand why some traffic patterns behave differently with Istio.

## How Traffic Capture Works

Istio uses iptables rules (or optionally eBPF) to intercept traffic at the network level. When a pod starts with the Istio sidecar, an init container called `istio-init` runs first and sets up these iptables rules.

The init container runs a program called `istio-iptables` that creates NAT rules to redirect traffic:

- **Inbound traffic**: Any traffic arriving at the pod is redirected to the Envoy sidecar on port 15006
- **Outbound traffic**: Any traffic leaving the pod is redirected to the Envoy sidecar on port 15001

```bash
# View the iptables rules inside a pod
kubectl exec my-pod -c istio-proxy -- iptables -t nat -L -n -v
```

The output shows something like:

```text
Chain PREROUTING (policy ACCEPT)
target     prot opt source    destination
ISTIO_INBOUND  tcp  --  0.0.0.0/0  0.0.0.0/0

Chain OUTPUT (policy ACCEPT)
target     prot opt source    destination
ISTIO_OUTPUT  tcp  --  0.0.0.0/0  0.0.0.0/0

Chain ISTIO_INBOUND (1 references)
target     prot opt source    destination
RETURN     tcp  --  0.0.0.0/0  0.0.0.0/0  tcp dpt:15008
RETURN     tcp  --  0.0.0.0/0  0.0.0.0/0  tcp dpt:15090
RETURN     tcp  --  0.0.0.0/0  0.0.0.0/0  tcp dpt:15021
RETURN     tcp  --  0.0.0.0/0  0.0.0.0/0  tcp dpt:15020
ISTIO_IN_REDIRECT  tcp  --  0.0.0.0/0  0.0.0.0/0

Chain ISTIO_IN_REDIRECT (1 references)
target     prot opt source    destination
REDIRECT   tcp  --  0.0.0.0/0  0.0.0.0/0  redir ports 15006

Chain ISTIO_OUTPUT (1 references)
target     prot opt source    destination
RETURN     all  --  127.0.0.6  0.0.0.0/0
ISTIO_IN_REDIRECT  tcp  --  0.0.0.0/0  !127.0.0.1  owner UID match 1337
RETURN     tcp  --  0.0.0.0/0  0.0.0.0/0  ! owner UID match 1337
RETURN     all  --  0.0.0.0/0  127.0.0.1
ISTIO_REDIRECT  all  --  0.0.0.0/0  0.0.0.0/0

Chain ISTIO_REDIRECT (1 references)
target     prot opt source    destination
REDIRECT   tcp  --  0.0.0.0/0  0.0.0.0/0  redir ports 15001
```

## Key Ports Used by Istio

Understanding which ports Istio uses is essential:

| Port | Purpose |
|------|---------|
| 15000 | Envoy admin interface |
| 15001 | Envoy outbound capture |
| 15006 | Envoy inbound capture |
| 15008 | HBONE mTLS tunnel port |
| 15020 | Istio agent (merged Prometheus telemetry) |
| 15021 | Health check endpoint |
| 15090 | Envoy Prometheus stats |

These ports are excluded from traffic capture to avoid infinite redirect loops. Traffic to these ports goes directly to the Envoy proxy without going through iptables redirect.

## Traffic Flow for Inbound Requests

When a request arrives at your pod from another service:

1. The request hits the pod's network interface
2. iptables PREROUTING chain catches it
3. ISTIO_INBOUND chain checks if it should be redirected
4. If not excluded, ISTIO_IN_REDIRECT sends it to port 15006
5. Envoy processes the request (mTLS termination, authorization, etc.)
6. Envoy forwards the request to your application on localhost

```bash
# Trace the inbound path for a specific port
istioctl proxy-config listeners my-pod --port 15006 -o json | \
  jq '.[].filterChains[] | {destination_port: .filterChainMatch.destinationPort, filters: [.filters[].name]}'
```

## Traffic Flow for Outbound Requests

When your application makes an outbound request:

1. Your application sends a request (e.g., to another-service:8080)
2. iptables OUTPUT chain catches it
3. ISTIO_OUTPUT chain checks if it should be redirected
4. If not excluded, ISTIO_REDIRECT sends it to port 15001
5. Envoy resolves the destination using its routing configuration
6. Envoy establishes a connection (with mTLS) to the destination

```bash
# View outbound listener configuration
istioctl proxy-config listeners my-pod --port 15001 -o json | jq '.[0].name'
```

## Excluding Ports from Capture

Not all traffic should go through the sidecar. You can exclude specific ports from capture.

### Exclude Inbound Ports

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "9090,9091"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Traffic to ports 9090 and 9091 goes directly to your application, bypassing the Envoy proxy.

### Exclude Outbound Ports

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "3306,6379,5432"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

This is commonly used for database connections that either handle their own TLS or use server-first protocols.

### Exclude IP Ranges

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

### Include Only Specific Ports

Instead of excluding ports, you can specify that only certain ports should be captured:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/includeInboundPorts: "8080,8443"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Only ports 8080 and 8443 are captured. All other inbound traffic bypasses the sidecar.

## Using Istio CNI Instead of Init Containers

The default traffic capture mechanism uses an init container that needs `NET_ADMIN` and `NET_RAW` capabilities. In environments with strict pod security policies, this can be a problem.

Istio CNI plugin moves the iptables setup from an init container to a CNI plugin that runs at the node level:

```bash
# Install Istio with CNI
istioctl install --set components.cni.enabled=true

# Verify CNI is running
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
```

With CNI, pods no longer need elevated privileges for traffic capture. The iptables rules are set up by the CNI plugin before the pod's containers start.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
```

## Debugging Traffic Capture Issues

When traffic is not being captured correctly, here is how to debug:

```bash
# Check if iptables rules are set up correctly
kubectl exec my-pod -c istio-proxy -- iptables -t nat -L -n -v

# Check Envoy listener configuration
istioctl proxy-config listeners my-pod

# Check if the init container ran successfully
kubectl describe pod my-pod | grep -A 5 "istio-init"

# Check init container logs
kubectl logs my-pod -c istio-init 2>/dev/null

# Verify the proxy is intercepting traffic
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_cx_total"
```

### Common Issues

**Traffic bypassing the sidecar**: If your application connects to `127.0.0.1` (localhost) of another process in the same pod, that traffic stays within the pod and is not captured by iptables rules.

**UID-based exclusion**: The iptables rules use UID 1337 to identify traffic from the Envoy proxy itself and avoid redirecting it in a loop. If your application runs as UID 1337, its traffic will not be captured.

```yaml
# Make sure your app does NOT run as UID 1337
spec:
  containers:
  - name: my-app
    securityContext:
      runAsUser: 1000  # Any UID except 1337
```

**DNS traffic**: UDP traffic is not captured by default. DNS queries (UDP port 53) go directly from the pod without going through Envoy. Istio captures DNS through a separate mechanism using the Istio agent.

Understanding traffic capture is foundational to debugging Istio networking issues. When you know how traffic flows through the iptables rules and into the Envoy proxy, you can quickly identify whether an issue is with the capture rules, the Envoy configuration, or your application.
