# How to Use subdomain and hostname Fields for Pod DNS Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Networking

Description: Discover how to configure subdomain and hostname fields in Kubernetes pods to create predictable DNS names for service discovery and inter-pod communication.

---

In Kubernetes, every pod gets a default DNS name based on its IP address, but this isn't always practical for applications that need stable, human-readable identities. The `hostname` and `subdomain` fields in the pod specification allow you to create custom DNS names that remain consistent across pod restarts and make service discovery more intuitive.

These fields are particularly useful for StatefulSets, clustered applications, and any workload that requires pods to discover each other by name rather than through service load balancing.

## Understanding Pod DNS Naming

By default, Kubernetes assigns DNS names to pods in the format `pod-ip-address.namespace.pod.cluster.local`. For example, a pod with IP 10.244.1.5 in the default namespace gets:

```
10-244-1-5.default.pod.cluster.local
```

This works but has limitations. The name changes whenever the pod gets a new IP address, and it's not human-readable. The `hostname` and `subdomain` fields let you override this behavior.

## Basic hostname Configuration

The `hostname` field sets the hostname inside the pod and influences the DNS name:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  namespace: production
spec:
  hostname: webapp-01
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
```

Inside this pod, running `hostname` will return `webapp-01`. However, for this hostname to be resolvable via DNS from other pods, you need to combine it with the `subdomain` field.

## Using subdomain for DNS Resolution

The `subdomain` field must match the name of a headless service (a service with `clusterIP: None`). This creates a fully qualified domain name (FQDN) for the pod:

```yaml
# Headless service for DNS
apiVersion: v1
kind: Service
metadata:
  name: webapp-cluster
  namespace: production
spec:
  clusterIP: None  # Makes this a headless service
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 80
---
# Pod with hostname and subdomain
apiVersion: v1
kind: Pod
metadata:
  name: web-server-01
  namespace: production
  labels:
    app: webapp
spec:
  hostname: webapp-01
  subdomain: webapp-cluster  # Must match service name
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
```

With this configuration, the pod is accessible at:

```
webapp-01.webapp-cluster.production.svc.cluster.local
```

Other pods can resolve this name:

```bash
# From another pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup webapp-01.webapp-cluster.production.svc.cluster.local
```

## Practical Example: Database Cluster

Here's a realistic example of using hostname and subdomain for a PostgreSQL cluster:

```yaml
# Headless service for PostgreSQL cluster
apiVersion: v1
kind: Service
metadata:
  name: postgres-cluster
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - name: postgres
    port: 5432
    targetPort: 5432
---
# Primary database pod
apiVersion: v1
kind: Pod
metadata:
  name: postgres-primary
  namespace: database
  labels:
    app: postgres
    role: primary
spec:
  hostname: pg-primary
  subdomain: postgres-cluster
  containers:
  - name: postgresql
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    ports:
    - containerPort: 5432
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-primary-pvc
---
# Replica database pod
apiVersion: v1
kind: Pod
metadata:
  name: postgres-replica-01
  namespace: database
  labels:
    app: postgres
    role: replica
spec:
  hostname: pg-replica-01
  subdomain: postgres-cluster
  containers:
  - name: postgresql
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    # Configure as streaming replica
    - name: POSTGRES_PRIMARY_HOST
      value: pg-primary.postgres-cluster.database.svc.cluster.local
    ports:
    - containerPort: 5432
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-replica-01-pvc
```

The replica can now connect to the primary using a stable DNS name that doesn't change even if the primary pod is rescheduled to a different node.

## Integration with StatefulSets

StatefulSets automatically set hostname and subdomain for each pod, which is why they provide stable network identities:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis-cluster  # Automatically sets subdomain
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      # StatefulSet automatically sets:
      # - hostname: redis-0, redis-1, redis-2
      # - subdomain: redis-cluster
      containers:
      - name: redis
        image: redis:7.2
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - /data/nodes.conf
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Each pod gets a predictable DNS name:
- `redis-0.redis-cluster.default.svc.cluster.local`
- `redis-1.redis-cluster.default.svc.cluster.local`
- `redis-2.redis-cluster.default.svc.cluster.local`

You can verify these DNS names:

```bash
# From inside the cluster
kubectl run -it --rm dns-test --image=busybox --restart=Never -- sh
# Inside the container:
nslookup redis-0.redis-cluster.default.svc.cluster.local
nslookup redis-1.redis-cluster.default.svc.cluster.local
```

## Service Discovery Patterns

Applications can use these predictable names for peer discovery. Here's a Go example:

```go
package main

import (
    "fmt"
    "net"
    "os"
    "strings"
)

func discoverPeers() ([]string, error) {
    // Get pod hostname
    hostname, err := os.Hostname()
    if err != nil {
        return nil, err
    }

    // Extract StatefulSet index from hostname (e.g., "redis-0" -> 0)
    parts := strings.Split(hostname, "-")

    // Build FQDN for peer discovery
    subdomain := "redis-cluster"
    namespace := os.Getenv("POD_NAMESPACE")

    var peers []string
    for i := 0; i < 3; i++ {
        peerName := fmt.Sprintf("redis-%d.%s.%s.svc.cluster.local",
            i, subdomain, namespace)

        // Verify DNS resolution
        _, err := net.LookupHost(peerName)
        if err == nil {
            peers = append(peers, peerName)
        }
    }

    return peers, nil
}

func main() {
    peers, err := discoverPeers()
    if err != nil {
        fmt.Printf("Error discovering peers: %v\n", err)
        return
    }

    fmt.Printf("Discovered peers: %v\n", peers)
}
```

## Debugging DNS Configuration

If your DNS names aren't resolving, check these common issues:

```bash
# Verify the headless service exists
kubectl get svc -n production webapp-cluster
# Should show clusterIP: None

# Check pod labels match service selector
kubectl get pod -n production web-server-01 --show-labels
kubectl get svc -n production webapp-cluster -o yaml | grep selector

# Test DNS resolution from within the cluster
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
# Inside the container:
nslookup webapp-01.webapp-cluster.production.svc.cluster.local
dig webapp-01.webapp-cluster.production.svc.cluster.local
```

Verify CoreDNS is running properly:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

## Advanced Configuration

You can combine hostname/subdomain with host aliases for complex networking scenarios:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-server
spec:
  hostname: app-01
  subdomain: app-cluster
  hostAliases:
  - ip: "10.244.1.10"
    hostnames:
    - "legacy-db.internal"
    - "cache.internal"
  containers:
  - name: app
    image: myapp:1.0
```

This pod can resolve both its own DNS name and the custom host aliases, useful for hybrid cloud or migration scenarios.

## Best Practices

Always use headless services when you need individual pod DNS names. Regular services with ClusterIP only provide load-balanced endpoints.

Keep hostnames short and meaningful. They become part of log messages and debugging output.

For StatefulSets, let Kubernetes manage hostname and subdomain automatically. Manual configuration is only needed for regular pods.

Use namespace-aware DNS names in your application code. Hard-coding the namespace makes your manifests less portable.

Document your DNS naming scheme. Teams need to understand how to reach specific pods, especially in multi-tier applications.

Monitor DNS resolution performance. CoreDNS can become a bottleneck in large clusters with frequent pod churn.

The combination of hostname and subdomain fields provides powerful control over pod identity in Kubernetes. By creating predictable, stable DNS names, you can build distributed applications that discover and communicate with each other reliably, without depending on external service discovery systems.
