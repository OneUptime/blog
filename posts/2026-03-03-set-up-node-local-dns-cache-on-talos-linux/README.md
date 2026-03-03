# How to Set Up Node-Local DNS Cache on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, NodeLocal DNSCache, CoreDNS, Performance, Kubernetes

Description: Deploy NodeLocal DNSCache on Talos Linux to reduce DNS latency, improve reliability, and eliminate conntrack issues for DNS traffic.

---

NodeLocal DNSCache is a Kubernetes feature that runs a DNS caching agent on every node as a DaemonSet. Instead of pods sending every DNS query across the network to the CoreDNS pods, they first hit the local cache running on the same node. This reduces latency, decreases the load on CoreDNS, and avoids a well-known Linux kernel bug with UDP conntrack entries that causes intermittent DNS failures. On Talos Linux, setting this up requires a few specific steps.

## Why NodeLocal DNSCache

In a standard Kubernetes setup, every DNS query from every pod goes to the CoreDNS service (usually 10.96.0.10). This query travels through kube-proxy's iptables or IPVS rules, gets load-balanced to a CoreDNS pod, and the response comes back the same way. This works, but it has several drawbacks:

- Each query adds network round-trip latency
- CoreDNS becomes a bottleneck in large clusters
- The Linux conntrack table can drop UDP packets under high query volume, causing random DNS failures
- If CoreDNS pods are on a different node, queries cross the node boundary

NodeLocal DNSCache solves all of these by putting a cache on every node at a link-local address (169.254.20.10).

## How It Works

With NodeLocal DNSCache deployed:

1. Pods send DNS queries to 169.254.20.10 (the node-local cache)
2. The local cache checks its store for a cached answer
3. On a hit, it responds immediately with no network hop
4. On a miss, it forwards to CoreDNS over TCP (avoiding UDP conntrack issues)
5. The response is cached locally for future queries

## Prerequisites

Before deploying, verify your Talos Linux cluster setup:

```bash
# Check the current cluster DNS service IP
kubectl get svc kube-dns -n kube-system
# Note the ClusterIP (usually 10.96.0.10)

# Check what kube-proxy mode is in use
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode

# Verify nodes are ready
kubectl get nodes
```

## Deploying NodeLocal DNSCache

Download and customize the NodeLocal DNSCache manifest:

```bash
# Set the variables for your cluster
CLUSTER_DNS_IP="10.96.0.10"
CLUSTER_DOMAIN="cluster.local"
LOCAL_DNS_IP="169.254.20.10"
```

Create the manifests:

```yaml
# node-local-dns-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-local-dns
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-local-dns
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-local-dns
subjects:
- kind: ServiceAccount
  name: node-local-dns
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: node-local-dns
  apiGroup: rbac.authorization.k8s.io
```

Now the main DaemonSet and ConfigMap:

```yaml
# node-local-dns-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-local-dns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache {
            success 9984 30
            denial 9984 5
        }
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
    }
    in-addr.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
    }
    ip6.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
    }
    .:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . /etc/resolv.conf
        prometheus :9253
    }
```

```yaml
# node-local-dns-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-local-dns
  namespace: kube-system
  labels:
    k8s-app: node-local-dns
spec:
  selector:
    matchLabels:
      k8s-app: node-local-dns
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 10%
  template:
    metadata:
      labels:
        k8s-app: node-local-dns
    spec:
      serviceAccountName: node-local-dns
      hostNetwork: true
      dnsPolicy: Default
      tolerations:
      - key: CriticalAddonsOnly
        operator: Exists
      - effect: NoExecute
        operator: Exists
      - effect: NoSchedule
        operator: Exists
      priorityClassName: system-node-critical
      containers:
      - name: node-cache
        image: registry.k8s.io/dns/k8s-dns-node-cache:1.23.0
        resources:
          requests:
            cpu: 25m
            memory: 64Mi
          limits:
            memory: 128Mi
        args:
        - -localip
        - "169.254.20.10"
        - -conf
        - /etc/Corefile
        - -upstreamsvc
        - kube-dns-upstream
        - -skipteardown=true
        - -setupinterface=true
        - -setupiptables=true
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9253
          name: metrics
          protocol: TCP
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
        livenessProbe:
          httpGet:
            host: 169.254.20.10
            path: /health
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 5
        volumeMounts:
        - mountPath: /run/xtables.lock
          name: xtables-lock
          readOnly: false
        - name: config-volume
          mountPath: /etc/coredns
        - name: kube-dns-config
          mountPath: /etc/Corefile
          subPath: Corefile
      volumes:
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: config-volume
        configMap:
          name: coredns
      - name: kube-dns-config
        configMap:
          name: node-local-dns
```

Create an upstream service for CoreDNS that bypasses iptables:

```yaml
# kube-dns-upstream.yaml
apiVersion: v1
kind: Service
metadata:
  name: kube-dns-upstream
  namespace: kube-system
  labels:
    k8s-app: kube-dns
spec:
  ports:
  - name: dns
    port: 53
    protocol: UDP
    targetPort: 53
  - name: dns-tcp
    port: 53
    protocol: TCP
    targetPort: 53
  selector:
    k8s-app: kube-dns
```

Apply everything:

```bash
kubectl apply -f node-local-dns-serviceaccount.yaml
kubectl apply -f kube-dns-upstream.yaml
kubectl apply -f node-local-dns-configmap.yaml
kubectl apply -f node-local-dns-daemonset.yaml
```

## Configuring Pods to Use NodeLocal DNS

You need to tell pods to use 169.254.20.10 instead of the default ClusterDNS IP. On Talos Linux, update the machine configuration:

```yaml
# talos-kubelet-dns-patch.yaml
machine:
  kubelet:
    clusterDNS:
      - 169.254.20.10
```

Apply to all nodes:

```bash
talosctl patch machineconfig --nodes 10.0.0.10,10.0.0.11,10.0.0.12 \
    --patch-file talos-kubelet-dns-patch.yaml

talosctl patch machineconfig --nodes 10.0.0.20,10.0.0.21 \
    --patch-file talos-kubelet-dns-patch.yaml
```

After applying, new pods will use 169.254.20.10 as their DNS server. Existing pods will continue using the old DNS IP until they are restarted.

## Verifying the Deployment

Check that NodeLocal DNSCache is running on all nodes:

```bash
# Verify DaemonSet is fully rolled out
kubectl get daemonset node-local-dns -n kube-system

# Check that pods are running on every node
kubectl get pods -n kube-system -l k8s-app=node-local-dns -o wide

# Verify the local DNS IP is configured
kubectl run dns-check --rm -it --restart=Never --image=busybox:1.36 -- \
    cat /etc/resolv.conf
# Should show: nameserver 169.254.20.10
```

Test DNS resolution through the local cache:

```bash
kubectl run dns-test --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "=== Query via NodeLocal DNS ==="
    dig kubernetes.default.svc.cluster.local @169.254.20.10 +short

    echo ""
    echo "=== External query via NodeLocal DNS ==="
    dig google.com @169.254.20.10 +short

    echo ""
    echo "=== Query time ==="
    dig google.com @169.254.20.10 | grep "Query time"
    dig google.com @169.254.20.10 | grep "Query time"
'
```

## Monitoring NodeLocal DNS

NodeLocal DNSCache exposes Prometheus metrics on port 9253:

```yaml
# ServiceMonitor for NodeLocal DNS
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-local-dns
  namespace: monitoring
spec:
  jobLabel: k8s-app
  namespaceSelector:
    matchNames:
    - kube-system
  selector:
    matchLabels:
      k8s-app: node-local-dns
  endpoints:
  - port: metrics
    interval: 15s
```

Key metrics to watch:

```bash
# Cache hit rate per node
coredns_cache_hits_total
coredns_cache_misses_total

# Request latency
coredns_dns_request_duration_seconds_bucket

# Upstream health
coredns_forward_healthcheck_failures_total
```

## Troubleshooting

Common issues and fixes:

```bash
# Issue: NodeLocal DNS pod is not starting
# Check logs
kubectl logs -n kube-system -l k8s-app=node-local-dns --tail=50

# Issue: The 169.254.20.10 interface is not created
# Check if the pod has NET_ADMIN capability
kubectl get pods -n kube-system -l k8s-app=node-local-dns -o yaml | grep -A5 capabilities

# Issue: Pods still using old DNS IP
# Check kubelet configuration
talosctl get kubeletconfig -o yaml --nodes 10.0.0.10

# Restart pods to pick up new DNS config
kubectl rollout restart deployment my-app -n production
```

## Wrapping Up

NodeLocal DNSCache is one of the most impactful performance improvements you can make to a Talos Linux cluster. It eliminates the UDP conntrack race condition that causes intermittent DNS failures, reduces CoreDNS load, and cuts DNS query latency to near zero for cached entries. The setup requires changes at both the Kubernetes level (DaemonSet) and the Talos level (kubelet clusterDNS), but the payoff is well worth the effort.
