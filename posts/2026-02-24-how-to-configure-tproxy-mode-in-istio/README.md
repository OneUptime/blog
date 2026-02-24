# How to Configure TPROXY Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TPROXY, Networking, Envoy, Kubernetes, Traffic Interception

Description: A complete guide to setting up TPROXY transparent proxy mode in Istio for source IP preservation and advanced traffic interception scenarios.

---

TPROXY (transparent proxy) is an alternative to Istio's default REDIRECT mode for traffic interception. While REDIRECT rewrites packet source addresses and breaks source IP visibility, TPROXY preserves the original source and destination IPs throughout the entire proxy chain. This makes it valuable for workloads that need accurate source IP information at the network level.

## How TPROXY Differs from REDIRECT

In REDIRECT mode, iptables changes the destination address of packets to route them to Envoy. This happens in the NAT table:

```
# REDIRECT mode - NAT table
-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
```

In TPROXY mode, packets go through the mangle table instead. The destination address is NOT rewritten. Instead, TPROXY uses a special socket option that allows Envoy to receive packets destined for any address:

```
# TPROXY mode - mangle table
-A ISTIO_INBOUND -p tcp -j TPROXY --on-port 15006 --on-ip 0.0.0.0 --tproxy-mark 0x1/0x1
```

The practical difference: with REDIRECT, your app sees connections from 127.0.0.1. With TPROXY, your app sees the actual client IP.

## Prerequisites

TPROXY requires kernel support. Most modern Linux kernels (3.x and later) include it, but it needs to be enabled. Check your node:

```bash
# On the node (not the pod)
lsmod | grep xt_TPROXY
```

If the module isn't loaded:

```bash
modprobe xt_TPROXY
```

On managed Kubernetes services (GKE, EKS, AKS), TPROXY support is generally available but you should verify. GKE nodes with Container-Optimized OS have it enabled by default. EKS nodes with Amazon Linux 2 also support it.

## Enabling TPROXY for a Single Workload

The simplest way to enable TPROXY is with a pod annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        sidecar.istio.io/interceptionMode: TPROXY
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 8080
```

After deployment, verify the interception mode:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- pilot-agent request GET server_info | grep -i mode
```

And check the iptables rules to confirm TPROXY is active:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t mangle -L -v -n
```

You should see TPROXY rules in the mangle table instead of REDIRECT rules in the NAT table.

## Enabling TPROXY Mesh-Wide

To use TPROXY for all workloads in the mesh:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: TPROXY
```

Apply this with:

```bash
istioctl install -f tproxy-config.yaml
```

Then restart your workloads to pick up the new configuration:

```bash
kubectl rollout restart deployment -n my-namespace
```

## The iptables Rules in Detail

With TPROXY enabled, the iptables configuration looks different from the standard REDIRECT setup. The rules use the mangle table instead of the NAT table.

For inbound traffic:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t mangle -S
```

```
-A PREROUTING -p tcp -j ISTIO_INBOUND
-A ISTIO_INBOUND -p tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15021 -j RETURN
-A ISTIO_INBOUND -p tcp -j TPROXY --on-port 15006 --on-ip 0.0.0.0 --tproxy-mark 0x1/0x1
```

The `--tproxy-mark` sets a firewall mark on the packet, which is used by the routing policy to direct packets to the local routing table.

For outbound traffic, a routing policy rule directs marked packets:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ip rule show
```

```
0:      from all lookup local
32765:  from all fwmark 0x1/0x1 lookup 133
32766:  from all lookup main
32767:  from all lookup default
```

Table 133 is a custom routing table that sends all traffic to the loopback interface:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ip route show table 133
```

```
default via 127.0.0.1 dev lo
```

## Security Context Requirements

TPROXY requires additional privileges compared to REDIRECT mode. The `istio-proxy` container needs the `NET_ADMIN` capability at runtime (not just the init container):

```yaml
containers:
- name: istio-proxy
  securityContext:
    capabilities:
      add:
      - NET_ADMIN
      - NET_RAW
```

This is because the Envoy process needs to create transparent sockets using the `IP_TRANSPARENT` socket option. This is a notable difference from REDIRECT mode, where only the init container needs elevated privileges.

If you're using Pod Security Standards, TPROXY mode requires the Baseline level for the sidecar container, not just the init container.

## Testing Source IP Preservation

Deploy a test workload that shows the source IP:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ip-echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ip-echo
  template:
    metadata:
      labels:
        app: ip-echo
      annotations:
        sidecar.istio.io/interceptionMode: TPROXY
    spec:
      containers:
      - name: ip-echo
        image: registry.k8s.io/echoserver:1.10
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: ip-echo
spec:
  selector:
    app: ip-echo
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

Send a request from another pod in the mesh:

```bash
kubectl exec -it <client-pod> -- curl http://ip-echo:8080/
```

In the response, look for the client address. With TPROXY, you should see the actual pod IP of the client, not 127.0.0.1.

## TPROXY with the Istio CNI Plugin

If you're using the Istio CNI plugin instead of init containers, TPROXY still works. The CNI plugin sets up the mangle table rules and routing policy at the CNI level.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  meshConfig:
    defaultConfig:
      interceptionMode: TPROXY
```

The CNI plugin handles the iptables configuration, but the sidecar still needs NET_ADMIN capability for the transparent socket operations.

## Troubleshooting TPROXY

If TPROXY isn't working, check these things:

**Kernel module**: Make sure `xt_TPROXY` is loaded on the node. Without it, the iptables rules will fail to apply.

**Routing rules**: Verify the custom routing table and policy are in place:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ip rule list
kubectl exec -it <pod-name> -c istio-proxy -- ip route show table 133
```

**Envoy socket options**: Check the Envoy configuration for transparent socket settings:

```bash
istioctl proxy-config listener <pod-name> --port 15006 -o json | grep -i transparent
```

**Init container logs**: If the init container fails to set up TPROXY rules:

```bash
kubectl logs <pod-name> -c istio-init
```

## When to Use TPROXY

Use TPROXY when:
- Your application needs the real source IP at the socket level (not just HTTP headers)
- You're running non-HTTP protocols that can't use X-Forwarded-For
- Network policies depend on source IP accuracy
- Compliance requirements mandate source IP preservation in audit logs

Stick with REDIRECT when:
- HTTP headers for source IP are sufficient
- You want minimal security context requirements on the sidecar
- Kernel TPROXY support is uncertain
- Simplicity is more important than source IP preservation

TPROXY adds some operational complexity but gives you accurate source IP information for every connection through the mesh. For workloads where that matters, it's the right choice.
