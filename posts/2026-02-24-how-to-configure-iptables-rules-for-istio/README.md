# How to Configure iptables Rules for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Iptables, Networking, Kubernetes, Traffic Management

Description: Learn how to configure and customize iptables rules that Istio uses for transparent traffic redirection in Kubernetes pods.

---

Istio relies on iptables rules inside each pod's network namespace to redirect traffic through the Envoy sidecar. While these rules are set up automatically by the `istio-init` container, there are plenty of situations where you need to customize them. Maybe you want to skip certain ports, exclude external IP ranges, or troubleshoot why traffic isn't flowing correctly.

## Default iptables Configuration

When Istio injects the sidecar, the init container runs the `istio-iptables` command with a set of default arguments. You can see these by inspecting a pod's spec:

```bash
kubectl get pod <pod-name> -o jsonpath='{.spec.initContainers[?(@.name=="istio-init")].command}' | python3 -m json.tool
```

The default configuration creates NAT table rules that redirect inbound traffic to port 15006 (Envoy's inbound listener) and outbound traffic to port 15001 (Envoy's outbound listener).

## Viewing Current iptables Rules

To see the active iptables rules in a running pod:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -n -v
```

If you want the rules in a format that can be saved and restored:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables-save -t nat
```

This gives you output like:

```text
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
:ISTIO_INBOUND - [0:0]
:ISTIO_IN_REDIRECT - [0:0]
:ISTIO_OUTPUT - [0:0]
:ISTIO_REDIRECT - [0:0]
-A PREROUTING -p tcp -j ISTIO_INBOUND
-A OUTPUT -p tcp -j ISTIO_OUTPUT
-A ISTIO_INBOUND -p tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp -j ISTIO_IN_REDIRECT
-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
-A ISTIO_OUTPUT -s 127.0.0.6/32 -o lo -j RETURN
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -m owner --uid-owner 1337 -j ISTIO_IN_REDIRECT
-A ISTIO_OUTPUT -o lo -m owner ! --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -d 127.0.0.1/32 -j RETURN
-A ISTIO_OUTPUT -j ISTIO_REDIRECT
-A ISTIO_REDIRECT -p tcp -j REDIRECT --to-ports 15001
COMMIT
```

## Customizing Through Pod Annotations

The easiest way to customize iptables rules is through pod annotations. Istio reads these annotations during sidecar injection and passes them as arguments to the `istio-iptables` command.

### Excluding Inbound Ports

If you have a port that should not be intercepted by Istio (for example, a database port that uses its own TLS):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "3306,5432"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
        - containerPort: 3306
```

### Excluding Outbound Ports

Similarly, for outbound traffic:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"
```

### Including Only Specific Ports

Instead of excluding ports, you can include only specific ones:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeInboundPorts: "8080,8443"
    traffic.sidecar.istio.io/includeOutboundPorts: "80,443,8080"
```

### Excluding IP Ranges

To exclude certain CIDR ranges from outbound interception:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"
```

Or to include only specific ranges:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.96.0.0/12"
```

## Global Configuration Through MeshConfig

For cluster-wide settings, you can configure the default iptables behavior in the IstioOperator or Helm values:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
  values:
    global:
      proxy:
        excludeIPRanges: "169.254.169.254/32"
        excludeInboundPorts: "22"
        includeIPRanges: "*"
```

The `excludeIPRanges` setting here is commonly used to exclude the cloud provider metadata endpoint (169.254.169.254) so that pods can still access instance metadata without going through Envoy.

## Understanding the iptables Chains in Detail

Istio creates four custom chains in the NAT table:

**ISTIO_INBOUND** handles incoming packets. The PREROUTING hook sends all TCP traffic here. Rules in this chain skip Istio's own ports (15008, 15090) and redirect everything else.

**ISTIO_IN_REDIRECT** is the actual redirect target for inbound traffic. It sends packets to port 15006.

**ISTIO_OUTPUT** handles outgoing packets from the pod. The OUTPUT hook sends all TCP traffic here. This chain has the most complex logic because it needs to handle the Envoy process differently from the application process.

**ISTIO_REDIRECT** is the redirect target for outbound traffic. It sends packets to port 15001.

## Manual iptables Modifications

In rare cases, you might need to modify iptables rules manually. This is generally not recommended because the rules reset if the pod restarts, but it can be useful for debugging.

To add a rule that skips interception for a specific destination:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -I ISTIO_OUTPUT -d 192.168.1.100 -j RETURN
```

To remove a rule:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -D ISTIO_OUTPUT -d 192.168.1.100 -j RETURN
```

## Debugging iptables Issues

When traffic isn't flowing correctly, check the packet counters on each rule:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -v -n --line-numbers
```

The packet and byte counters next to each rule tell you which rules are actually matching traffic. If the counters on the ISTIO_REDIRECT chain are zero, outbound traffic isn't being intercepted. If the counters on ISTIO_IN_REDIRECT are zero, inbound traffic is bypassing the proxy.

You can also watch the counters in real time:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- watch -n 1 'iptables -t nat -L -v -n'
```

## IPv6 Considerations

If your cluster uses IPv6 or dual-stack networking, Istio also sets up ip6tables rules. You can view them with:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ip6tables -t nat -L -v -n
```

The structure mirrors the IPv4 rules. If you're excluding IP ranges, remember to exclude both IPv4 and IPv6 ranges as needed.

## Alternatives to iptables

If you want to avoid iptables entirely, Istio supports the CNI plugin mode, which sets up the network rules at the CNI level instead of using an init container. This removes the need for the `NET_ADMIN` capability on the init container. We cover this in a separate post.

Knowing how the iptables rules work gives you the ability to fine-tune traffic interception at a granular level. Whether you need to bypass the proxy for certain external services, troubleshoot connectivity problems, or just understand what is happening under the hood, the iptables configuration is where it all starts.
