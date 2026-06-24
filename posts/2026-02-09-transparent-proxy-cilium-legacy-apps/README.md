# How to Implement Transparent Proxy with Cilium for Legacy Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, Proxy, Legacy Applications, Networking

Description: Configure Cilium transparent proxy to enable legacy applications to communicate with Kubernetes services without code changes, using automatic DNS-based service discovery and traffic redirection.

---

Legacy applications often expect to connect to services using environment variables or static configuration files. They don't understand Kubernetes service names or cluster DNS conventions. Combining CoreDNS rewrites with Cilium's eBPF service handling and Local Redirect Policy can solve this by mapping legacy destinations to Kubernetes services without requiring application changes.

## Understanding Transparent Proxy

A transparent proxy intercepts network traffic without the client knowing a proxy exists. For Kubernetes, this means:

- Applications can use hardcoded IPs or legacy hostnames
- DNS resolution can be mapped with CoreDNS rewrites
- Matching IP traffic can be redirected to selected local backend pods
- No application code changes required
- Works with applications that can run in Kubernetes but cannot easily change their network configuration

Cilium implements service load balancing and Local Redirect Policy using eBPF in the datapath. Cilium's Layer 7 policy and service mesh features use Envoy when traffic needs application-layer visibility or proxying.

## Prerequisites

Ensure Cilium is installed with kube-proxy replacement:

```bash
cilium status | grep "KubeProxyReplacement"
```

Should show:

```text
KubeProxyReplacement:    True   [eth0]
```

If not, enable it:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=true
```

## Enabling Transparent Proxy Mode

Configure Cilium to enable Local Redirect Policy and ensure Layer 7 proxy support is available:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set localRedirectPolicies.enabled=true \
  --set l7Proxy=true \
  --set loadBalancer.l7.backend=envoy
```

Key settings:

- `localRedirectPolicies.enabled`: Enables CiliumLocalRedirectPolicy resources
- `l7Proxy`: Enables Cilium Layer 7 policy and visibility through Envoy
- `loadBalancer.l7.backend`: Enables L7 service load balancing by way of service annotations

Restart Cilium pods to apply:

```bash
kubectl rollout restart daemonset cilium -n kube-system
kubectl rollout status daemonset cilium -n kube-system
```

## Configuring DNS for Legacy Applications

Legacy apps often use hostnames instead of Kubernetes service names. Configure DNS to resolve these:

```yaml
# legacy-dns-config.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  legacy.override: |
    rewrite name legacy-db.example.com database.production.svc.cluster.local
    rewrite name legacy-api.example.com api-server.production.svc.cluster.local
```

Merge this with your existing CoreDNS config:

```bash
kubectl edit configmap coredns -n kube-system
```

Add to the Corefile:

```text
.:53 {
    errors
    health
    ready

    # Import custom DNS rewrites
    import /etc/coredns/custom/*.override

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

Mount the custom ConfigMap:

```bash
kubectl edit deployment coredns -n kube-system
```

Add volume and volume mount:

```yaml
spec:
  template:
    spec:
      volumes:
      - name: custom-config
        configMap:
          name: coredns-custom
      containers:
      - name: coredns
        volumeMounts:
        - name: custom-config
          mountPath: /etc/coredns/custom
          readOnly: true
```

Now legacy-db.example.com resolves to your Kubernetes database service.

## Running Legacy Applications with Transparent Proxy

Deploy a legacy application:

```yaml
# legacy-app.yaml
apiVersion: v1
kind: Pod
metadata:
  name: legacy-app
  namespace: production
spec:
  containers:
  - name: app
    image: legacy-app:v1.0
    env:
    # Legacy app uses environment variables
    - name: DATABASE_HOST
      value: "legacy-db.example.com"
    - name: DATABASE_PORT
      value: "5432"
    - name: API_ENDPOINT
      value: "http://legacy-api.example.com/v1"
```

The application code expects to connect to legacy-db.example.com. With DNS rewriting, the name is resolved through database.production.svc.cluster.local.

Apply and test:

```bash
kubectl apply -f legacy-app.yaml

# Check that DNS resolution works
kubectl exec -n production legacy-app -- nslookup legacy-db.example.com

# Check connectivity
kubectl exec -n production legacy-app -- nc -zv legacy-db.example.com 5432
```

## Implementing Traffic Redirection

For applications using IP addresses instead of hostnames, use Cilium's local redirect policy:

```yaml
# local-redirect.yaml
apiVersion: cilium.io/v2
kind: CiliumLocalRedirectPolicy
metadata:
  name: redirect-legacy-db
  namespace: production
spec:
  redirectFrontend:
    # Legacy app connects to this IP
    addressMatcher:
      ip: "10.10.10.10"
      toPorts:
      - port: "5432"
        protocol: TCP
  redirectBackend:
    # Redirect to local backend pods selected by these labels
    localEndpointSelector:
      matchLabels:
        app: database
    toPorts:
    - port: "5432"
      protocol: TCP
```

Apply the redirect policy:

```bash
kubectl apply -f local-redirect.yaml
```

Now connections to 10.10.10.10:5432 redirect to database pods.

## Configuring for Stateful Legacy Applications

Some legacy apps maintain long-lived connections:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-backend
  namespace: production
spec:
  sessionAffinity: ClientIP  # Ensure same pod gets requests
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 86400  # 24-hour sessions
  selector:
    app: legacy-backend
  ports:
  - port: 8080
    targetPort: 8080
```

Combine with Cilium service annotations:

```yaml
metadata:
  annotations:
    service.cilium.io/lb-l7: "enabled"
```

This routes service traffic through Envoy when Cilium L7 service load balancing is enabled. Keep `sessionAffinity` for ordinary TCP connection stickiness.

## Implementing Service Mesh Features for Legacy Apps

Add HTTP observability without changing application code:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: legacy-app-visibility
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: legacy-app
  egress:
  - toEndpoints:
    - matchLabels:
        app: api-server
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http: [{}]  # Enable HTTP L7 visibility
```

This adds HTTP Layer 7 visibility without modifying the legacy app. For database protocols such as PostgreSQL, use L3/L4 policy and Hubble flow visibility unless you have a supported Cilium L7 parser for that protocol.

View the traffic:

```bash
# Enable Hubble and Hubble UI for observability
cilium hubble enable --ui

# Open Hubble UI
cilium hubble ui

# Or use CLI
hubble observe --from-pod production/legacy-app
```

## Handling External Service Dependencies

Legacy apps often call external APIs. Define DNS-based egress policy for these dependencies:

```yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-external-api
spec:
  endpointSelector:
    matchLabels:
      app: legacy-app
  egress:
  - toFQDNs:
    - matchName: "api.partner.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
  - toEndpoints:
    - matchLabels:
        "k8s:io.kubernetes.pod.namespace": kube-system
        "k8s:k8s-app": kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: ANY
      rules:
        dns:
        - matchPattern: "*"
```

This allows legacy-app to reach api.partner.com and perform DNS lookups.

## Migrating Gradually

Use transparent proxy for gradual migration:

```yaml
# Phase 1: Legacy app with transparent proxy
apiVersion: v1
kind: Pod
metadata:
  name: legacy-app-v1
  labels:
    app: myapp
    version: legacy
spec:
  containers:
  - name: app
    image: legacy-app:v1.0
    env:
    - name: SERVICE_URL
      value: "http://backend.example.com"
---
# Phase 2: Modernized app using Kubernetes services
apiVersion: v1
kind: Pod
metadata:
  name: modern-app-v2
  labels:
    app: myapp
    version: modern
spec:
  containers:
  - name: app
    image: modern-app:v2.0
    env:
    - name: SERVICE_URL
      value: "http://backend.production.svc.cluster.local"
```

Both versions work simultaneously while you migrate.

## Debugging Transparent Proxy

If transparent proxy isn't working:

### Check Cilium Agent Status

```bash
kubectl exec -n kube-system cilium-xxxxx -- cilium status
```

Look for:

```text
KubeProxyReplacement:  True
Host firewall:         Disabled
```

### Verify Service Redirection

```bash
kubectl exec -n kube-system cilium-xxxxx -- cilium-dbg service list
```

Should show your services with proper endpoints.

### Check BPF Maps

```bash
kubectl exec -n kube-system cilium-xxxxx -- cilium-dbg bpf lb list
```

This shows the actual BPF load balancer configuration.

### Enable Debug Logging

```bash
kubectl exec -n kube-system cilium-xxxxx -- cilium-dbg endpoint list
kubectl exec -n kube-system cilium-xxxxx -- cilium-dbg endpoint config <endpoint-id> Debug=true
```

Watch logs:

```bash
kubectl logs -n kube-system cilium-xxxxx -f | grep -i redirect
```

### Test Connectivity Step by Step

```bash
# From legacy app pod
kubectl exec -n production legacy-app -- ping legacy-db.example.com
kubectl exec -n production legacy-app -- nslookup legacy-db.example.com
kubectl exec -n production legacy-app -- curl -v http://legacy-api.example.com
kubectl exec -n production legacy-app -- tcpdump -i any -n port 5432
```

## Performance Considerations

Transparent proxy with eBPF is extremely efficient:

- No userspace proxy overhead
- In-kernel packet processing
- Near-native network performance
- Minimal CPU impact

Benchmark before and after:

```bash
# Install fortio for load testing
kubectl run fortio --image=fortio/fortio -- load -c 100 -qps 1000 -t 60s http://backend.production.svc.cluster.local
```

Measure the latency impact in your own environment; eBPF service handling is designed to avoid a userspace proxy in the normal L3/L4 datapath, while Layer 7 policy and L7 service load balancing intentionally proxy matching traffic through Envoy.

## Security Benefits

Transparent proxy enables security policies for legacy apps:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: legacy-app-security
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: legacy-app
  egress:
  # Only allow specific services
  - toEndpoints:
    - matchLabels:
        app: database
  - toEndpoints:
    - matchLabels:
        app: cache
```

Because any egress rule that selects an endpoint puts it into egress default-deny mode, this restricts the legacy app to the selected destinations without modifying the application.

## Best Practices

When using transparent proxy for legacy applications:

- Start with DNS rewrites for hostname-based apps
- Use local redirect policies for IP-based apps
- Enable Hubble for visibility into legacy app traffic
- Implement network policies to restrict egress
- Test thoroughly before migrating production workloads
- Monitor for connection failures during migration
- Document all DNS rewrites and redirects
- Use session affinity for stateful connections
- Gradually migrate to Kubernetes-native service discovery
- Keep transparent proxy as a temporary solution, not permanent

CoreDNS rewrites and Cilium redirection features make it possible to run legacy applications in Kubernetes without rewriting them. It's a powerful migration tool that lets you modernize infrastructure before modernizing code.
