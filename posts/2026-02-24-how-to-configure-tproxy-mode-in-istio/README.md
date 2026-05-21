# How to Configure TPROXY Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TPROXY, Networking, Envoy, Kubernetes, Traffic Interception

Description: A complete guide to setting up TPROXY transparent proxy mode in Istio for source IP preservation and advanced traffic interception scenarios.

---

TPROXY (transparent proxy) is an alternative to Istio's default REDIRECT mode for inbound traffic interception. While REDIRECT rewrites packet destination addresses and breaks source IP visibility for the application, TPROXY preserves the original source and destination IPs during inbound interception. This makes it valuable for workloads that need accurate source IP information at the network level.

## How TPROXY Differs from REDIRECT

In REDIRECT mode, iptables changes the destination address of packets to route them to Envoy. This happens in the NAT table:

```text
# REDIRECT mode - NAT table

-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
```

In TPROXY mode, packets go through the mangle table instead. The destination address is NOT rewritten. Instead, TPROXY uses a special socket option that allows Envoy to receive packets destined for any address:

```text
# TPROXY mode - mangle table
-A ISTIO_TPROXY ! -d 127.0.0.1/32 -p tcp -j TPROXY --on-port 15006 --tproxy-mark 1337/0xffffffff
```

The practical difference: with REDIRECT, your app sees the proxied connection from a loopback address. With TPROXY, your app sees the actual client IP.

## Prerequisites

TPROXY requires kernel support. Most modern Linux kernels (3.x and later) include it, but it needs to be enabled. Check your node:

```bash
# On the node (not the pod)
lsmod | grep -E 'xt_TPROXY|xt_socket|xt_mark|xt_connmark'
```

If the modules aren't loaded:

```bash
modprobe xt_TPROXY
modprobe xt_socket
```

On managed Kubernetes services (GKE, EKS, AKS), TPROXY support is generally available on standard Linux node images, but you should verify the required kernel modules and iptables backend on your actual node image.

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
kubectl exec -it <pod-name> -c istio-proxy -- printenv ISTIO_META_INTERCEPTION_MODE
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

```text
-A PREROUTING -p tcp -j ISTIO_INBOUND
-A ISTIO_INBOUND -p tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15021 -j RETURN
-A ISTIO_INBOUND -p tcp -m conntrack --ctstate RELATED,ESTABLISHED -j ISTIO_DIVERT
-A ISTIO_INBOUND -p tcp -j ISTIO_TPROXY
-A ISTIO_DIVERT -j MARK --set-mark 1337
-A ISTIO_DIVERT -j ACCEPT
-A ISTIO_TPROXY ! -d 127.0.0.1/32 -p tcp -j TPROXY --on-port 15006 --tproxy-mark 1337/0xffffffff
```

The `--tproxy-mark` sets a firewall mark on the packet, which is used by the routing policy to direct packets to the local routing table.

For inbound TPROXY traffic, a routing policy rule directs marked packets:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ip rule show
```

```text
0:      from all lookup local
32765:  from all fwmark 0x539 lookup 133
32766:  from all lookup main
32767:  from all lookup default
```

Table 133 is a custom routing table that sends all traffic to the loopback interface:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ip route show table 133
```

```text
local default dev lo scope host
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
```

This is because the Envoy process needs to create transparent sockets using the `IP_TRANSPARENT` socket option. This is a notable difference from REDIRECT mode, where only the init container needs elevated privileges.

If you're using Pod Security Standards, TPROXY mode requires the Privileged profile or an explicit policy exemption for the sidecar container. The Baseline and Restricted profiles do not allow adding `NET_ADMIN`.

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

The CNI plugin handles the iptables configuration, but the sidecar still needs the `NET_ADMIN` capability for the transparent socket operations.

## Troubleshooting TPROXY

If TPROXY isn't working, check these things:

**Kernel modules**: Make sure TPROXY and the related netfilter modules are available on the node. Without them, the iptables rules will fail to apply.

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
