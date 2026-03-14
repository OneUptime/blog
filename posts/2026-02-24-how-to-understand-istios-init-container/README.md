# How to Understand Istio's Init Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Init Containers, iptables, Kubernetes, Networking

Description: A detailed explanation of Istio's init container, how it sets up iptables rules for traffic interception, and how to troubleshoot init container issues.

---

The init container is a small but critical piece of the Istio sidecar injection. It runs before your application starts and sets up the networking rules that redirect all traffic through the Envoy sidecar proxy. Without it, the sidecar would just sit there doing nothing because no traffic would flow through it.

## What the Init Container Does

The init container, named `istio-init`, has exactly one job: configure iptables rules in the pod's network namespace so that all inbound and outbound TCP traffic gets redirected to the Envoy proxy.

Here is the init container spec as injected by Istio:

```yaml
initContainers:
- name: istio-init
  image: docker.io/istio/proxyv2:1.20.0
  command:
  - istio-iptables
  args:
  - -p
  - "15001"
  - -z
  - "15006"
  - -u
  - "1337"
  - -m
  - REDIRECT
  - -i
  - '*'
  - -x
  - ""
  - -b
  - '*'
  - -d
  - "15090,15021,15020"
  securityContext:
    allowPrivilegeEscalation: false
    capabilities:
      add:
      - NET_ADMIN
      - NET_RAW
      drop:
      - ALL
    privileged: false
    readOnlyRootFilesystem: false
    runAsGroup: 0
    runAsNonRoot: false
    runAsUser: 0
  resources:
    limits:
      cpu: 2000m
      memory: 1024Mi
    requests:
      cpu: 10m
      memory: 40Mi
```

## The istio-iptables Command

The `istio-iptables` command is a Go binary that generates and applies iptables rules. Here is what each argument means:

| Flag | Value | Description |
|------|-------|-------------|
| `-p` | 15001 | Port where Envoy listens for outbound traffic |
| `-z` | 15006 | Port where Envoy listens for inbound traffic |
| `-u` | 1337 | UID of the Envoy proxy process (traffic from this UID is not redirected to avoid loops) |
| `-m` | REDIRECT | iptables mode to use (REDIRECT or TPROXY) |
| `-i` | * | Include all outbound IP ranges for redirection |
| `-x` | "" | Exclude no IP ranges from outbound redirection |
| `-b` | * | Include all inbound ports for redirection |
| `-d` | 15090,15021,15020 | Exclude these inbound ports from redirection |

## The iptables Rules

After the init container runs, several iptables rules are in place. You can view them from the sidecar container:

```bash
kubectl exec my-app-xyz -c istio-proxy -- iptables -t nat -L -n -v
```

The output looks something like this:

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
RETURN     all  --  0.0.0.0/0  0.0.0.0/0  owner UID match 1337
RETURN     all  --  0.0.0.0/0  0.0.0.0/0  owner GID match 1337
RETURN     all  --  0.0.0.0/0  127.0.0.6
ISTIO_IN_REDIRECT  all  --  0.0.0.0/0  0.0.0.0/0  owner UID match 1337
ISTIO_IN_REDIRECT  all  --  0.0.0.0/0  0.0.0.0/0  owner GID match 1337
RETURN     all  --  0.0.0.0/0  0.0.0.0/0  dst 127.0.0.1
ISTIO_REDIRECT  all  --  0.0.0.0/0  0.0.0.0/0

Chain ISTIO_REDIRECT (1 references)
target     prot opt source    destination
REDIRECT   tcp  --  0.0.0.0/0  0.0.0.0/0  redir ports 15001
```

## Understanding the Rules

The rules create two main traffic flows:

### Inbound Traffic Flow

1. Traffic arrives at the pod on any port
2. The PREROUTING chain sends it to ISTIO_INBOUND
3. ISTIO_INBOUND checks if the port is excluded (15008, 15090, 15021, 15020). If so, it returns (passes through directly)
4. Otherwise, ISTIO_IN_REDIRECT redirects the traffic to port 15006 (Envoy inbound listener)
5. Envoy processes the request and forwards it to the application on localhost

### Outbound Traffic Flow

1. The application makes an outbound connection
2. The OUTPUT chain sends it to ISTIO_OUTPUT
3. ISTIO_OUTPUT checks if the traffic comes from UID/GID 1337 (Envoy itself). If so, it returns (passes through to avoid loops)
4. Otherwise, ISTIO_REDIRECT redirects the traffic to port 15001 (Envoy outbound listener)
5. Envoy processes the request and sends it to the actual destination

## The Loop Prevention

The most critical part of the iptables rules is preventing an infinite loop. Without the UID check, this would happen:

1. App sends traffic to service-b
2. iptables redirects it to Envoy (port 15001)
3. Envoy tries to send traffic to service-b
4. iptables redirects it to Envoy again (port 15001)
5. Infinite loop

The `owner UID match 1337` rule prevents this. Traffic from Envoy's UID is allowed to pass through without redirection.

## Excluded Ports

Some ports are excluded from redirection:

- **15090** - Envoy Prometheus metrics endpoint
- **15021** - Health check endpoint (used by kubelet for readiness probes)
- **15020** - Istio agent Prometheus metrics

These ports need to be directly accessible by Kubernetes and monitoring systems without going through the proxy.

You can exclude additional ports using pod annotations:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "9090,9091"
    traffic.sidecar.istio.io/excludeOutboundPorts: "3306,5432"
```

This is useful when you have ports that should not be proxied, like database connections or legacy protocols that Envoy does not handle well.

## Excluding IP Ranges

You can also exclude specific IP ranges from redirection:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
```

This is common on cloud providers where the metadata endpoint (169.254.169.254) should be accessed directly.

Or include only specific ranges:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"
```

## REDIRECT vs TPROXY

The init container supports two iptables modes:

**REDIRECT** (default) - Uses NAT table REDIRECT target. The original destination IP is lost, so Envoy uses the SO_ORIGINAL_DST socket option to recover it. This is simpler but does not preserve the source IP.

**TPROXY** - Uses the TPROXY target in the mangle table. Preserves both source and destination IP. Requires additional kernel capabilities and is generally used when source IP preservation is important.

To use TPROXY:

```yaml
metadata:
  annotations:
    sidecar.istio.io/interceptionMode: TPROXY
```

## The CNI Plugin Alternative

Istio also offers a CNI plugin that can replace the init container. Instead of running an init container in every pod, the CNI plugin configures iptables rules at the node level when pods are created:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
```

Benefits of the CNI plugin:
- No init container needed in pods
- No NET_ADMIN capability required in pods (better for security-restricted environments)
- Slightly faster pod startup

The downside is that it requires a DaemonSet running on every node and adds complexity to the CNI chain.

## Troubleshooting Init Container Issues

### Init Container Failing

```bash
# Check init container logs
kubectl logs my-app-xyz -c istio-init
```

Common errors:
- **Permission denied** - The init container needs NET_ADMIN capability. Check if PodSecurityPolicy or PodSecurityStandards are blocking it.
- **iptables command not found** - The container image might be corrupted or wrong.

### Traffic Not Being Intercepted

If the sidecar is running but traffic bypasses it:

```bash
# Verify iptables rules are in place
kubectl exec my-app-xyz -c istio-proxy -- iptables -t nat -L ISTIO_REDIRECT -n

# If empty, the init container probably failed silently
kubectl describe pod my-app-xyz | grep -A 5 "Init Containers"
```

### Application Cannot Reach External Services

If your app cannot reach services outside the mesh:

```bash
# Check the outbound rules
kubectl exec my-app-xyz -c istio-proxy -- iptables -t nat -L ISTIO_OUTPUT -n -v
```

Make sure the destination IP is not being blackholed. Check the meshConfig outboundTrafficPolicy.

The init container is a tiny piece of the puzzle, but it is the foundation that makes everything else work. Without it correctly setting up iptables rules, no traffic flows through the sidecar, and all of Istio's features become useless. When debugging networking issues in Istio, always verify that the init container ran successfully and the iptables rules are in place.
