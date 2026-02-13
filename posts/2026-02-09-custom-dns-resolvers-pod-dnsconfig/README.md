# How to Configure Custom DNS Resolvers per Pod Using dnsConfig and nameservers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Configuration, Pods

Description: Learn how to configure custom DNS resolvers per pod using dnsConfig and nameservers in Kubernetes, enabling pod-specific DNS behavior for special routing requirements and external resolver integration.

---

While CoreDNS handles cluster-wide DNS resolution, some pods require custom DNS configuration for specific use cases. Kubernetes provides dnsConfig and dnsPolicy options that let you customize DNS settings per pod, including custom nameservers, search domains, and resolver options.

This guide shows you how to configure custom DNS resolvers for individual pods in Kubernetes.

## Understanding Pod DNS Configuration

Pods receive DNS configuration from two sources:

1. **dnsPolicy**: Determines base DNS behavior
2. **dnsConfig**: Provides additional customization

Available DNS policies:

- `ClusterFirst` (default): Use cluster DNS, fallback to upstream
- `ClusterFirstWithHostNet`: For pods using hostNetwork
- `Default`: Use node's DNS configuration
- `None`: Requires dnsConfig to specify all settings

## Basic Custom Nameserver Configuration

Configure a pod with custom nameservers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  containers:
  - name: app
    image: nginx:1.21
  dnsPolicy: None  # Required when using dnsConfig fully
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 8.8.4.4
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "5"
```

Deploy and verify:

```bash
# Create pod
kubectl apply -f custom-dns-pod.yaml

# Check DNS configuration
kubectl exec custom-dns-pod -- cat /etc/resolv.conf
```

Expected output:

```
nameserver 8.8.8.8
nameserver 8.8.4.4
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

## Augmenting Cluster DNS with Additional Nameservers

Add custom nameservers while keeping cluster DNS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-nameserver-pod
spec:
  containers:
  - name: app
    image: nginx:1.21
  dnsPolicy: ClusterFirst  # Use cluster DNS as base
  dnsConfig:
    nameservers:
    - 1.1.1.1  # Cloudflare DNS
    searches:
    - company.internal
    options:
    - name: timeout
      value: "2"
    - name: attempts
      value: "3"
```

This configuration:
- Uses CoreDNS (ClusterFirst) as primary
- Adds 1.1.1.1 as additional nameserver
- Adds company.internal to search domains
- Customizes resolver timeout and attempts

## Environment-Specific DNS Configuration

Configure different DNS per environment using ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-config-prod
data:
  nameservers: |
    10.0.1.53
    10.0.1.54
  searches: |
    prod.company.internal
    company.internal
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-config-dev
data:
  nameservers: |
    192.168.1.53
  searches: |
    dev.company.internal
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
      dnsPolicy: None
      dnsConfig:
        nameservers:
        - 10.0.1.53
        - 10.0.1.54
        searches:
        - prod.company.internal
        - production.svc.cluster.local
        - svc.cluster.local
        - cluster.local
        options:
        - name: ndots
          value: "5"
```

## External DNS Server Integration

Configure pods to use external DNS servers for specific zones:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: external-dns-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: DATABASE_HOST
      value: db.company.internal  # Resolved via external DNS
  dnsPolicy: None
  dnsConfig:
    # External DNS server that knows about company.internal
    nameservers:
    - 10.0.1.53  # Corporate DNS
    - 8.8.8.8    # Fallback to public DNS
    searches:
    - company.internal
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "2"
    - name: timeout
      value: "5"
```

## Search Domain Customization

Control search domain behavior:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-search-pod
spec:
  containers:
  - name: app
    image: nginx:1.21
  dnsPolicy: ClusterFirst
  dnsConfig:
    searches:
    # Add custom search domains
    - partner.external.com
    - internal.company.com
    # Keep cluster search domains
    - default.svc.cluster.local
    - svc.cluster.local
    options:
    - name: ndots
      value: "3"  # Fewer dots = try search domains sooner
```

With `ndots:3`, querying "api-service" tries:
1. api-service.partner.external.com
2. api-service.internal.company.com
3. api-service.default.svc.cluster.local
4. api-service.svc.cluster.local

## Resolver Options Configuration

Tune DNS resolver behavior:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tuned-resolver-pod
spec:
  containers:
  - name: app
    image: myapp:latest
  dnsPolicy: ClusterFirst
  dnsConfig:
    options:
    # Number of dots in name to trigger absolute query first
    - name: ndots
      value: "2"
    # Seconds before query timeout
    - name: timeout
      value: "3"
    # Number of query attempts
    - name: attempts
      value: "2"
    # Rotate through nameservers
    - name: rotate
    # Try AAAA queries
    - name: inet6
    # Use TCP for queries
    - name: use-vc
```

Common resolver options:

- `ndots`: Threshold for absolute vs relative queries
- `timeout`: Query timeout in seconds
- `attempts`: Retry count
- `rotate`: Round-robin nameserver selection
- `single-request-reopen`: Avoid port reuse issues
- `inet6`: Enable IPv6 queries

## StatefulSet with Per-Pod DNS

Configure custom DNS for StatefulSet pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  clusterIP: None  # Headless service
  selector:
    app: database
  ports:
  - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
      dnsPolicy: ClusterFirst
      dnsConfig:
        searches:
        # Add custom domain for database replication
        - db.internal.company.com
        - default.svc.cluster.local
        - svc.cluster.local
        options:
        - name: ndots
          value: "5"
        - name: timeout
          value: "10"  # Longer timeout for database operations
```

## Testing Custom DNS Configuration

Create a test suite:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-test
data:
  test.sh: |
    #!/bin/bash

    echo "=== DNS Configuration Test ==="

    # Check resolv.conf
    echo "Current resolv.conf:"
    cat /etc/resolv.conf
    echo ""

    # Test cluster DNS
    echo "Test 1: Cluster DNS"
    if nslookup kubernetes.default.svc.cluster.local; then
        echo "PASS: Cluster DNS works"
    else
        echo "FAIL: Cluster DNS not working"
    fi
    echo ""

    # Test external DNS
    echo "Test 2: External DNS"
    if nslookup google.com; then
        echo "PASS: External DNS works"
    else
        echo "FAIL: External DNS not working"
    fi
    echo ""

    # Test custom search domain
    echo "Test 3: Search domain"
    nslookup kubernetes  # Should use search domains
    echo ""

    # Test all nameservers
    echo "Test 4: Individual nameservers"
    for ns in $(grep nameserver /etc/resolv.conf | awk '{print $2}'); do
        echo "Testing nameserver: $ns"
        nslookup google.com $ns
    done
---
apiVersion: v1
kind: Pod
metadata:
  name: test-custom-dns
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command:
    - sh
    - /scripts/test.sh
    volumeMounts:
    - name: scripts
      mountPath: /scripts
  volumes:
  - name: scripts
    configMap:
      name: dns-test
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 1.1.1.1
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    options:
    - name: ndots
      value: "5"
  restartPolicy: Never
```

Run tests:

```bash
kubectl apply -f dns-test.yaml
kubectl logs test-custom-dns
```

## Deployment Template with Custom DNS

Create a reusable deployment template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-custom-dns
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: DNS_SERVERS
          value: "8.8.8.8,1.1.1.1"
      dnsPolicy: ClusterFirst
      dnsConfig:
        nameservers:
        # Add additional nameservers
        - 1.1.1.1
        searches:
        # Add custom search domains
        - company.internal
        options:
        # Optimize for low latency
        - name: ndots
          value: "2"
        - name: timeout
          value: "2"
        - name: attempts
          value: "2"
        - name: single-request-reopen
```

## Monitoring Custom DNS Configuration

Track DNS configuration across pods:

```bash
#!/bin/bash

# check-dns-config.sh
echo "Checking DNS configuration across pods..."

for pod in $(kubectl get pods -o name); do
    echo "Pod: $pod"
    kubectl exec $pod -- cat /etc/resolv.conf 2>/dev/null || echo "  Cannot access"
    echo ""
done
```

## Troubleshooting

**Issue: Custom nameservers not appearing**

Verify dnsPolicy is set correctly:

```yaml
# If dnsPolicy is Default, dnsConfig is ignored
dnsPolicy: None  # Required for full custom DNS
```

**Issue: Cluster services not resolving**

Ensure cluster search domains are included:

```yaml
dnsConfig:
  searches:
  - default.svc.cluster.local  # Don't forget these
  - svc.cluster.local
  - cluster.local
```

**Issue: Slow DNS resolution**

Optimize ndots value:

```yaml
dnsConfig:
  options:
  - name: ndots
    value: "2"  # Lower value = fewer search attempts
```

## Best Practices

Follow these guidelines:

1. Use ClusterFirst + dnsConfig for most cases (augments cluster DNS)
2. Use None + dnsConfig only when completely replacing DNS
3. Always include cluster search domains when using None policy
4. Test DNS configuration before production deployment
5. Document why custom DNS is needed
6. Monitor DNS resolution performance
7. Keep ndots as low as practical
8. Include fallback nameservers
9. Version control DNS configurations
10. Consider using ConfigMaps for environment-specific settings

Custom DNS configuration per pod provides flexibility for special networking requirements while maintaining Kubernetes' DNS infrastructure. By understanding dnsPolicy and dnsConfig options, you can integrate external DNS servers, customize resolver behavior, and handle complex routing scenarios without compromising cluster DNS functionality.

For more DNS customization, explore our guides on [CoreDNS configuration](https://oneuptime.com/blog/post/2026-02-09-coredns-custom-forward-zones/view) and [DNS troubleshooting](https://oneuptime.com/blog/post/2026-02-09-debug-dns-resolution-dnsutils/view).
