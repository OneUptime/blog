# How to Set Up DNS for Rancher Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, DNS, Service Discovery

Description: A guide to setting up and configuring DNS for services in Rancher-managed Kubernetes clusters using CoreDNS.

DNS is a critical component of Kubernetes networking, enabling pods and services to discover and communicate with each other using human-readable names. Rancher-managed RKE2 clusters use CoreDNS as the default DNS provider, and modern RKE clusters do as well. This guide covers how DNS works in Kubernetes clusters managed through Rancher and how to customize it for your needs.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- kubectl access to your cluster

## Understanding DNS in Kubernetes

Every Kubernetes service gets a DNS entry automatically. The full DNS name follows this pattern:

```xml
<service-name>.<namespace>.svc.<cluster-domain>
```

The default cluster domain is `cluster.local`. So a service called `my-api` in the `production` namespace would be accessible at `my-api.production.svc.cluster.local`.

## Step 1: Verify CoreDNS Is Running

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl get svc -n kube-system -l k8s-app=kube-dns
```

You should see CoreDNS pods in Running state and a service with a ClusterIP.

## Step 2: Test DNS Resolution

Create a test pod and verify DNS works:

```bash
kubectl run dns-test --image=busybox:1.36 --restart=Never --rm -it -- sh
```

Inside the pod:

```bash
nslookup kubernetes.default.svc.cluster.local
nslookup kube-dns.kube-system.svc.cluster.local
```

## Step 3: Understand DNS Records for Services

Kubernetes creates different DNS records depending on the service type:

**ClusterIP services** get an A record:
```plaintext
my-service.default.svc.cluster.local -> 10.43.0.100
```

**Headless services** (ClusterIP: None) get A records for each pod:
```plaintext
my-headless.default.svc.cluster.local -> 10.42.0.5, 10.42.1.3, 10.42.2.7
```

**SRV records** are created for named ports:
```plaintext
_http._tcp.my-service.default.svc.cluster.local -> 0 100 80 my-service.default.svc.cluster.local
```

## Step 4: Configure CoreDNS

View the current CoreDNS configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

A typical Corefile looks like:

```plaintext
.:53 {
    errors
    health {
        lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

## Step 5: Add Custom DNS Entries

Add custom DNS records by editing the CoreDNS ConfigMap:

```bash
kubectl edit configmap coredns -n kube-system
```

On RKE2 clusters, make persistent CoreDNS changes through a `HelmChartConfig` for `rke2-coredns`; direct edits to the generated ConfigMap can be overwritten by the add-on manager.

Add a `hosts` plugin for static entries:

```plaintext
.:53 {
    errors
    health {
        lameduck 5s
    }
    ready
    hosts {
        192.168.1.100 legacy-server.internal
        192.168.1.101 database.internal
        fallthrough
    }
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

CoreDNS will automatically reload after the ConfigMap changes.

## Step 6: Configure Upstream DNS Servers

Forward DNS queries to specific upstream servers:

```plaintext
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    forward . 8.8.8.8 8.8.4.4 {
        max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

For domain-specific forwarding:

```plaintext
example.com:53 {
    forward . 10.0.0.53
    cache 30
}
```

## Step 7: Configure Per-Pod DNS Settings

Override DNS settings for specific pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 1.1.1.1
    searches:
    - my-namespace.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "5"
  containers:
  - name: app
    image: nginx
```

Available DNS policies:

- **ClusterFirst** (default): Use cluster DNS, fall through to upstream
- **Default**: Use the node's DNS configuration
- **None**: Allow custom dnsConfig specification
- **ClusterFirstWithHostNet**: For pods using hostNetwork

## Step 8: Configure DNS for StatefulSets

StatefulSets get stable DNS names for each pod:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
  namespace: default
spec:
  serviceName: db-headless
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: postgres:15
        ports:
        - containerPort: 5432
---
apiVersion: v1
kind: Service
metadata:
  name: db-headless
  namespace: default
spec:
  clusterIP: None
  selector:
    app: db
  ports:
  - port: 5432
    targetPort: 5432
```

Each pod gets a stable DNS name:

```plaintext
db-0.db-headless.default.svc.cluster.local
db-1.db-headless.default.svc.cluster.local
db-2.db-headless.default.svc.cluster.local
```

## Step 9: Enable DNS Autoscaling

For large clusters, scale CoreDNS automatically. RKE2-based Rancher clusters deploy CoreDNS with the autoscaler by default. If your cluster does not already include it, deploy the autoscaler with:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-dns-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: system:kube-dns-autoscaler
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["list", "watch"]
- apiGroups: [""]
  resources: ["replicationcontrollers/scale"]
  verbs: ["get", "update"]
- apiGroups: ["apps"]
  resources: ["deployments/scale", "replicasets/scale"]
  verbs: ["get", "update"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-dns-autoscaler
subjects:
- kind: ServiceAccount
  name: kube-dns-autoscaler
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: system:kube-dns-autoscaler
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-dns-autoscaler
  namespace: kube-system
  labels:
    k8s-app: kube-dns-autoscaler
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns-autoscaler
  template:
    metadata:
      labels:
        k8s-app: kube-dns-autoscaler
    spec:
      priorityClassName: system-cluster-critical
      containers:
      - name: autoscaler
        image: registry.k8s.io/cpa/cluster-proportional-autoscaler:1.8.4
        command:
        - /cluster-proportional-autoscaler
        - --namespace=kube-system
        - --configmap=kube-dns-autoscaler
        - --target=Deployment/coredns
        - --default-params={"linear":{"coresPerReplica":256,"nodesPerReplica":16,"preventSinglePointFailure":true,"includeUnschedulableNodes":true}}
        - --logtostderr=true
        - --v=2
      serviceAccountName: kube-dns-autoscaler
```

## Troubleshooting

- **DNS not resolving**: Check CoreDNS pods: `kubectl get pods -n kube-system -l k8s-app=kube-dns`
- **Slow DNS**: Reduce ndots value or adjust cache TTL in CoreDNS config
- **External DNS not working**: Verify forward configuration in Corefile
- **Check CoreDNS logs**: `kubectl logs -n kube-system -l k8s-app=kube-dns`
- **Test resolution**: `kubectl run test --image=busybox --restart=Never --rm -it -- nslookup <service-name>`

## Summary

DNS is the backbone of service discovery in Rancher-managed Kubernetes clusters. CoreDNS automatically creates DNS records for services and pods, enabling seamless communication between workloads. By customizing the CoreDNS configuration, you can add custom entries, configure upstream servers, and tune DNS behavior for your specific requirements.
