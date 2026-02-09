# How to Configure Pod DNS Policy and dnsConfig for Custom Resolvers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, DNS

Description: Master Kubernetes DNS configuration with dnsPolicy and dnsConfig to use custom DNS resolvers, configure search domains, and optimize DNS resolution for pods with specific networking requirements.

---

DNS resolution is critical for service discovery and external connectivity in Kubernetes. While the default DNS configuration works for most cases, some applications need custom DNS resolvers, specific search domains, or optimized DNS settings. Kubernetes provides dnsPolicy and dnsConfig to control pod DNS behavior.

Understanding these settings lets you integrate with corporate DNS infrastructure, optimize resolution performance, and troubleshoot DNS-related issues effectively.

## Understanding DNS Policies

Kubernetes offers four DNS policies that control how pods resolve DNS names.

ClusterFirst is the default policy. Pods use the cluster DNS (typically CoreDNS) for resolution. Cluster-local names like service.namespace.svc.cluster.local resolve through CoreDNS. External names fall back to the upstream DNS configured in CoreDNS.

Default uses the node's DNS configuration. Pods inherit DNS settings from the node they run on. This bypasses cluster DNS entirely.

ClusterFirstWithHostNet is like ClusterFirst but for pods using hostNetwork. Regular ClusterFirst does not work with hostNetwork because the pod uses the node's network namespace.

None disables automatic DNS configuration. You must explicitly configure DNS using dnsConfig.

## Basic DNS Policy Configuration

Use the default ClusterFirst policy implicitly:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: default-dns-pod
spec:
  containers:
  - name: app
    image: nginx
```

No dnsPolicy specified means ClusterFirst is used.

Explicitly set ClusterFirst:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cluster-dns-pod
spec:
  dnsPolicy: ClusterFirst
  containers:
  - name: app
    image: nginx
```

Use node DNS settings:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: node-dns-pod
spec:
  dnsPolicy: Default
  containers:
  - name: app
    image: nginx
```

This pod resolves DNS using the node's /etc/resolv.conf.

For hostNetwork pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostnet-pod
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
  containers:
  - name: app
    image: nginx
```

## Custom DNS Configuration with dnsConfig

dnsConfig lets you customize DNS settings regardless of dnsPolicy. You can add nameservers, search domains, and options.

Add custom nameservers:

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
    - 8.8.4.4
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "5"
  containers:
  - name: app
    image: nginx
```

This pod uses Google DNS servers with custom search domains.

Combine with ClusterFirst:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: combined-dns-pod
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    nameservers:
    - 10.0.0.10  # Additional custom resolver
    searches:
    - example.com  # Additional search domain
    options:
    - name: timeout
      value: "2"
    - name: attempts
      value: "3"
  containers:
  - name: app
    image: nginx
```

This pod uses cluster DNS first, with additional custom nameservers and search domains.

## Configuring Corporate DNS Resolvers

Integrate with corporate DNS infrastructure:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: corporate-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 10.100.0.10  # Primary corporate DNS
    - 10.100.0.11  # Secondary corporate DNS
    searches:
    - corp.example.com
    - example.com
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "5"
    - name: timeout
      value: "3"
    - name: attempts
      value: "2"
  containers:
  - name: app
    image: corporate-app:latest
```

This configuration:
- Uses corporate DNS servers first
- Includes corporate search domains
- Maintains Kubernetes cluster search domains
- Sets reasonable timeout and retry values

## Optimizing DNS Performance

DNS resolution can impact application performance. Optimize with appropriate ndots and timeout settings.

The ndots option controls when to use search domains. If a name has fewer dots than ndots, search domains are appended. The default is usually 5.

Reduce ndots for applications that mostly query fully qualified names:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: optimized-dns-pod
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    options:
    - name: ndots
      value: "1"
    - name: timeout
      value: "1"
    - name: attempts
      value: "2"
  containers:
  - name: app
    image: web-app:latest
```

With ndots:1, "google.com" is tried as-is first instead of trying "google.com.default.svc.cluster.local" first.

For applications that use short service names frequently:

```yaml
dnsConfig:
  options:
  - name: ndots
    value: "5"  # Higher value for more search domain attempts
  - name: single-request-reopen
    value: ""   # Use different source ports for A and AAAA queries
```

## Split DNS Configuration

Some applications need to resolve internal and external names differently:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: split-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 10.96.0.10      # Cluster DNS for internal names
    - 10.100.0.10     # Corporate DNS for corp domains
    - 8.8.8.8         # Public DNS for external
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    - corp.example.com
    options:
    - name: ndots
      value: "2"
  containers:
  - name: app
    image: hybrid-app:latest
```

Nameservers are tried in order. Internal cluster names resolve first, then corporate, then public.

## Debugging DNS Configuration

Check DNS configuration inside a pod:

```bash
kubectl exec my-pod -- cat /etc/resolv.conf
```

Output shows the actual DNS configuration:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

Test DNS resolution:

```bash
kubectl exec my-pod -- nslookup kubernetes.default
```

Test with specific nameserver:

```bash
kubectl exec my-pod -- nslookup kubernetes.default 10.96.0.10
```

Debug DNS resolution steps:

```bash
kubectl exec my-pod -- sh -c 'for name in service service.default service.default.svc service.default.svc.cluster.local; do echo "Testing $name"; nslookup $name; done'
```

This shows how search domains are applied.

## Multi-Network Pods

Pods with multiple network interfaces might need different DNS for each network:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-network-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: network1, network2
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    nameservers:
    - 10.96.0.10      # Cluster DNS
    - 192.168.1.1     # DNS for network1
    - 192.168.2.1     # DNS for network2
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    - network1.local
    - network2.local
  containers:
  - name: app
    image: multi-network-app:latest
```

## Service-Specific DNS Configuration

Different services might need different DNS configurations:

```yaml
# Database pods use internal DNS only
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      dnsPolicy: ClusterFirst
      dnsConfig:
        options:
        - name: ndots
          value: "5"
        - name: timeout
          value: "2"
      containers:
      - name: postgres
        image: postgres:14

---
# API pods need external DNS
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      dnsPolicy: ClusterFirst
      dnsConfig:
        nameservers:
        - 8.8.8.8  # Add public DNS for external API calls
        options:
        - name: ndots
          value: "2"  # Optimize for external domains
      containers:
      - name: api
        image: api:v1.0.0
```

## IPv6 DNS Configuration

Configure DNS for IPv6-enabled pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ipv6-dns-pod
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    nameservers:
    - 2001:4860:4860::8888  # Google Public DNS IPv6
    - 2001:4860:4860::8844
    - 10.96.0.10            # Cluster DNS IPv4
    options:
    - name: single-request-reopen
      value: ""
    - name: inet6
      value: ""
  containers:
  - name: app
    image: ipv6-app:latest
```

## DNS Caching in Pods

Implement local DNS caching to reduce latency:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dns-cache-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 127.0.0.1  # Local dnsmasq cache
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
  containers:
  - name: app
    image: app:latest
  - name: dns-cache
    image: andyshinn/dnsmasq:2.78
    args:
    - --server=10.96.0.10  # Forward to cluster DNS
    - --cache-size=1000
    - --no-negcache
    - --log-queries
    securityContext:
      capabilities:
        add: ['NET_ADMIN']
```

The dnsmasq sidecar caches DNS queries locally, reducing latency for repeated lookups.

## Troubleshooting DNS Issues

Common DNS problems and solutions:

Slow DNS resolution:

```yaml
# Reduce ndots to avoid unnecessary search domain queries
dnsConfig:
  options:
  - name: ndots
    value: "1"
  - name: timeout
    value: "1"
```

DNS queries timing out:

```yaml
# Increase timeout and attempts
dnsConfig:
  options:
  - name: timeout
    value: "5"
  - name: attempts
    value: "3"
```

Cannot resolve external domains:

```yaml
# Add public DNS as fallback
dnsPolicy: ClusterFirst
dnsConfig:
  nameservers:
  - 8.8.8.8
```

Verify CoreDNS is working:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

Test DNS from a debug pod:

```bash
kubectl run dns-test --image=busybox:1.28 --rm -it --restart=Never -- nslookup kubernetes.default
```

## Best Practices

Use ClusterFirst for most applications. It provides service discovery and external resolution.

Set dnsPolicy to None only when you need complete control over DNS configuration.

Test DNS configuration changes in development before applying to production.

Monitor DNS query patterns to optimize ndots and timeout values.

Document custom DNS configurations. Future maintainers need to understand why non-standard settings are used.

Use appropriate search domains. Too many search domains slow down resolution for external names.

Set reasonable timeouts. Very short timeouts cause failures. Very long timeouts slow down applications.

Cache DNS locally when making many requests to the same hosts.

Verify DNS resolution works after configuration changes:

```bash
kubectl exec my-pod -- nslookup service-name
kubectl exec my-pod -- nslookup external-domain.com
```

## Conclusion

DNS configuration through dnsPolicy and dnsConfig provides fine-grained control over name resolution in Kubernetes pods. Use ClusterFirst for standard workloads, customize with dnsConfig for specific requirements, and use None for complete control.

Configure corporate DNS servers, optimize with appropriate ndots and timeout values, and implement caching for high-volume DNS users. Test configurations thoroughly and monitor DNS performance.

Master DNS configuration to integrate Kubernetes with existing infrastructure, optimize application performance, and troubleshoot resolution issues effectively.
