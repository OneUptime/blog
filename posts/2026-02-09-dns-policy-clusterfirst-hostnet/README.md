# How to Configure DNS Policy ClusterFirstWithHostNet for HostNetwork Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Networking, Configuration

Description: Learn how to properly configure DNS resolution for pods using hostNetwork by implementing the ClusterFirstWithHostNet DNS policy, ensuring cluster DNS works correctly while maintaining host network access.

---

Pods running with `hostNetwork: true` use the host's network namespace, which includes the host's DNS configuration. This causes issues when these pods need to resolve Kubernetes service names. The `ClusterFirstWithHostNet` DNS policy solves this by providing cluster DNS resolution while maintaining host network capabilities.

This guide shows you how to configure and troubleshoot DNS for host network pods.

## Understanding HostNetwork DNS Challenges

When `hostNetwork: true` is set, pods:

- Share the node's network namespace
- Get the node's IP address
- Use the node's `/etc/resolv.conf` for DNS
- Cannot resolve cluster service names by default

This breaks service discovery for system pods like CNI components, monitoring agents, and ingress controllers that require host network access.

## Default DNS Policies

Kubernetes provides these DNS policies:

- `Default`: Use node's DNS configuration
- `ClusterFirst`: Use cluster DNS (CoreDNS)
- `ClusterFirstWithHostNet`: Use cluster DNS even with hostNetwork
- `None`: Custom DNS configuration via dnsConfig

## Configuring ClusterFirstWithHostNet

Basic configuration for host network pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostnet-pod
  namespace: kube-system
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet  # Critical for cluster DNS
  containers:
  - name: app
    image: nginx:1.21
    ports:
    - containerPort: 80
      hostPort: 80
```

Without `ClusterFirstWithHostNet`, the pod would use node's DNS and fail to resolve cluster services.

## DaemonSet with Host Network

Common pattern for node-level system components:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        ports:
        - containerPort: 9100
          hostPort: 9100
        env:
        # Can now resolve cluster services
        - name: PROMETHEUS_URL
          value: "http://prometheus-server.monitoring.svc.cluster.local:9090"
```

## Ingress Controller Configuration

Ingress controllers typically require host network:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ingress-nginx
  template:
    metadata:
      labels:
        app: ingress-nginx
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: controller
        image: registry.k8s.io/ingress-nginx/controller:v1.8.0
        args:
        - /nginx-ingress-controller
        - --publish-service=$(POD_NAMESPACE)/ingress-nginx-controller
        - --default-backend-service=$(POD_NAMESPACE)/default-backend
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRefFrom:
              fieldPath: metadata.namespace
        ports:
        - name: http
          containerPort: 80
          hostPort: 80
        - name: https
          containerPort: 443
          hostPort: 443
```

## CNI Plugin Deployment

CNI components need host network and cluster DNS:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  template:
    metadata:
      labels:
        k8s-app: calico-node
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccountName: calico-node
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
      containers:
      - name: calico-node
        image: calico/node:v3.26.0
        env:
        - name: DATASTORE_TYPE
          value: "kubernetes"
        - name: KUBERNETES_SERVICE_HOST
          value: "kubernetes.default.svc.cluster.local"  # Uses cluster DNS
        - name: KUBERNETES_SERVICE_PORT
          value: "443"
```

## Monitoring Agent with Host Network

Deploy agents that need both host network and cluster service access:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: prometheus-node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.6.0
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
      - name: config-reloader
        image: jimmidyson/configmap-reload:v0.5.0
        args:
        - --webhook-url=http://localhost:9100/-/reload
        - --volume-dir=/etc/node-exporter
        # Can access ConfigMaps via cluster DNS
        env:
        - name: CONFIG_SERVICE
          value: "config-service.monitoring.svc.cluster.local"
```

## Testing DNS Resolution

Verify DNS works correctly for host network pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-hostnet-dns
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
  containers:
  - name: test
    image: nicolaka/netshoot
    command:
    - sh
    - -c
    - |
      echo "=== DNS Configuration ==="
      cat /etc/resolv.conf
      echo ""

      echo "=== Testing Cluster Service DNS ==="
      nslookup kubernetes.default.svc.cluster.local
      echo ""

      echo "=== Testing External DNS ==="
      nslookup google.com
      echo ""

      echo "=== Checking Network ==="
      ip addr show
      echo ""

      echo "Tests complete"
      sleep infinity
  restartPolicy: Never
```

Deploy and check:

```bash
kubectl apply -f test-hostnet-dns.yaml
kubectl logs test-hostnet-dns
```

Expected resolv.conf with ClusterFirstWithHostNet:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

## Troubleshooting DNS Issues

**Issue: Service names not resolving**

Check DNS policy is set:

```bash
kubectl get pod <pod-name> -o jsonpath='{.spec.dnsPolicy}'
# Should output: ClusterFirstWithHostNet
```

Fix if wrong:

```yaml
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet  # Add this
```

**Issue: Using node's DNS instead of cluster DNS**

Verify inside pod:

```bash
kubectl exec <pod-name> -- cat /etc/resolv.conf
# Should show CoreDNS IP (e.g., 10.96.0.10), not node's resolvers
```

**Issue: External domains not resolving**

Check CoreDNS forward configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml | grep -A5 forward
```

## Custom DNS Configuration with Host Network

Combine ClusterFirstWithHostNet with dnsConfig:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-hostnet-dns
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
  dnsConfig:
    nameservers:
    - 1.1.1.1  # Additional nameserver
    searches:
    - company.internal  # Custom search domain
    options:
    - name: ndots
      value: "2"
    - name: timeout
      value: "3"
  containers:
  - name: app
    image: nginx:1.21
```

## StatefulSet with Host Network

Configure StatefulSets using host network:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: elasticsearch
        image: elasticsearch:8.8.0
        env:
        - name: cluster.name
          value: "logging-cluster"
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch.logging.svc.cluster.local,elasticsearch-1.elasticsearch.logging.svc.cluster.local,elasticsearch-2.elasticsearch.logging.svc.cluster.local"
        ports:
        - containerPort: 9200
          hostPort: 9200
          name: http
        - containerPort: 9300
          hostPort: 9300
          name: transport
```

## Monitoring Host Network DNS

Create monitoring for DNS resolution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-monitor-hostnet
data:
  monitor.sh: |
    #!/bin/bash

    while true; do
        echo "=== $(date) ==="

        # Check if using cluster DNS
        NAMESERVER=$(grep nameserver /etc/resolv.conf | head -1 | awk '{print $2}')
        echo "Primary nameserver: $NAMESERVER"

        # Test cluster service resolution
        if nslookup kubernetes.default.svc.cluster.local >/dev/null 2>&1; then
            echo "Cluster DNS: OK"
        else
            echo "Cluster DNS: FAILED"
        fi

        # Test external resolution
        if nslookup google.com >/dev/null 2>&1; then
            echo "External DNS: OK"
        else
            echo "External DNS: FAILED"
        fi

        echo ""
        sleep 60
    done
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: dns-monitor
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: dns-monitor
  template:
    metadata:
      labels:
        app: dns-monitor
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: monitor
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/monitor.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: dns-monitor-hostnet
```

## Best Practices

Follow these guidelines for host network pods:

1. Always use ClusterFirstWithHostNet for pods with hostNetwork: true
2. Test DNS resolution after deploying host network pods
3. Document why host network is required
4. Monitor DNS resolution for host network pods
5. Use node selectors to control pod placement
6. Consider security implications of host network access
7. Implement proper resource limits
8. Use tolerations for system pods
9. Test both cluster and external DNS resolution
10. Version control all host network configurations

The ClusterFirstWithHostNet DNS policy enables pods using host network to maintain cluster DNS resolution capabilities. By properly configuring this policy, system components, ingress controllers, and monitoring agents can leverage host network performance while still accessing Kubernetes services through standard DNS names.

For more DNS configuration patterns, explore our guides on [custom DNS resolvers](https://oneuptime.com/blog/post/2026-02-09-custom-dns-resolvers-pod-dnsconfig/view) and [DNS troubleshooting](https://oneuptime.com/blog/post/2026-02-09-debug-dns-resolution-dnsutils/view).
