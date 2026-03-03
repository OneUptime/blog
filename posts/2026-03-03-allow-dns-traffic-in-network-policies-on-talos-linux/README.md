# How to Allow DNS Traffic in Network Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Network Policies, DNS, CoreDNS

Description: Learn how to properly allow DNS traffic in Kubernetes network policies on Talos Linux to prevent connectivity issues caused by blocked name resolution.

---

If you have ever applied a restrictive network policy on your Talos Linux Kubernetes cluster and suddenly everything stopped working, there is a good chance DNS traffic got blocked. This is the single most common mistake people make when setting up network policies, and it happens because DNS resolution is so fundamental that we tend to forget about it. This guide explains how to handle DNS traffic correctly in your network policies on Talos Linux.

## Why DNS Traffic Gets Blocked

When you create a network policy in Kubernetes with an egress rule, it becomes an implicit deny for all egress traffic not covered by the rule. So if you create a policy that allows your application to talk to a database on port 5432, you have also implicitly blocked all other outgoing traffic from those pods, including DNS queries.

DNS in Kubernetes works through CoreDNS, which runs as pods in the `kube-system` namespace. Your application pods send DNS queries to the CoreDNS service (usually at the cluster DNS IP, something like 10.96.0.10) on UDP port 53 and TCP port 53. If those packets cannot reach CoreDNS, name resolution fails and your pods cannot connect to anything by service name.

## The Problem in Practice

Here is a policy that looks reasonable but will break your application:

```yaml
# broken-policy.yaml
# This policy blocks DNS and will break service discovery
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-db-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

After applying this, the web-api pods can only send traffic to postgres pods on port 5432. They cannot resolve `postgres.production.svc.cluster.local` because DNS queries are blocked. The connection will fail with a name resolution error, not a connection timeout, which is your first clue that DNS is the issue.

## The Fix: Allow DNS Egress

You need to add a DNS egress rule to every network policy that restricts egress traffic. Here is the corrected version:

```yaml
# fixed-policy.yaml
# Allow database access AND DNS resolution
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-db-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # Allow database access
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

The key addition is the second egress rule that allows traffic to pods labeled `k8s-app: kube-dns` in the `kube-system` namespace on both UDP and TCP port 53.

## Different Ways to Allow DNS

There are several approaches to allowing DNS, each with different trade-offs.

### Method 1: Target CoreDNS Pods Directly (Recommended)

This is the most restrictive and secure approach. It only allows DNS traffic to the actual CoreDNS pods:

```yaml
# dns-to-coredns-pods.yaml
egress:
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: kube-system
        podSelector:
          matchLabels:
            k8s-app: kube-dns
    ports:
      - protocol: UDP
        port: 53
      - protocol: TCP
        port: 53
```

### Method 2: Allow DNS to Any Pod in kube-system

This is slightly less restrictive but still reasonable:

```yaml
# dns-to-kube-system.yaml
egress:
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: kube-system
    ports:
      - protocol: UDP
        port: 53
      - protocol: TCP
        port: 53
```

### Method 3: Allow DNS to Any Destination

This is the least restrictive approach. It allows DNS queries to any IP on port 53:

```yaml
# dns-to-anywhere.yaml
egress:
  - ports:
      - protocol: UDP
        port: 53
      - protocol: TCP
        port: 53
```

This approach is simpler but less secure because it allows pods to make DNS queries to any server, including external ones. In most cases, Method 1 is preferred.

## Creating a Reusable DNS Policy

Instead of adding DNS rules to every single policy, you can create a standalone policy that allows DNS for all pods in a namespace:

```yaml
# allow-dns-all-pods.yaml
# Blanket DNS allow for all pods in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}  # All pods in the namespace
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

Apply this once to each namespace, and then your other policies only need to worry about application-specific traffic.

## Handling NodeLocal DNSCache

If you are running NodeLocal DNSCache on your Talos Linux cluster (which caches DNS queries on each node for better performance), the DNS traffic flow changes. Pods send queries to a local cache running on the node instead of going directly to CoreDNS.

NodeLocal DNSCache typically listens on a link-local address like 169.254.20.10. You need to account for this in your policies:

```yaml
# allow-dns-with-nodelocal.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS to CoreDNS (fallback)
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow DNS to NodeLocal DNSCache
    - to:
        - ipBlock:
            cidr: 169.254.20.10/32
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Testing DNS Connectivity

After applying your policies, verify that DNS is working:

```bash
# Launch a test pod in the affected namespace
kubectl run dns-test --image=busybox:1.36 -n production --rm -it --restart=Never -- sh

# Test DNS resolution
nslookup kubernetes.default.svc.cluster.local
nslookup google.com

# If DNS fails, you will see:
# ;; connection timed out; no servers could be reached
```

You can also check what DNS server pods are configured to use:

```bash
# Check the resolv.conf inside a pod
kubectl exec -n production <pod-name> -- cat /etc/resolv.conf
```

The output will show the cluster DNS IP. Make sure your network policy allows traffic to that destination.

## Debugging DNS Issues on Talos

When DNS is not working despite having what looks like correct policies, check the following:

```bash
# Verify CoreDNS pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns

# Verify the network policy is applied correctly
kubectl get networkpolicies -n production -o yaml

# If using Cilium, check policy enforcement
cilium monitor --type policy-verdict -n production
```

On Talos Linux, you can also inspect the CNI state using talosctl:

```bash
# Check network state on a specific node
talosctl get addresses --nodes <node-ip>

# View kernel network logs
talosctl dmesg --nodes <node-ip> | grep -i "nf_"
```

## Best Practices

There are a few rules of thumb that will save you headaches. First, always add DNS rules when you add egress restrictions. Make it a habit, not an afterthought. Second, consider creating a namespace-wide DNS allow policy as a baseline before adding any restrictive policies. Third, remember that both UDP and TCP port 53 need to be allowed because DNS uses TCP for large responses and zone transfers. Fourth, test DNS resolution after every policy change. It takes five seconds and can save hours of debugging. Fifth, if you are using a service mesh like Istio or Linkerd on top of Talos, the DNS path might go through a sidecar proxy, so check the mesh documentation for any additional requirements.

DNS is the glue that holds Kubernetes networking together. On Talos Linux, where the OS is minimal and there is no way to install additional tools on the node, getting your DNS network policies right from the start is critical. Allow DNS first, restrict everything else second, and always test.
