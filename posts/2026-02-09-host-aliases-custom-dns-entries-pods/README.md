# How to Use hostAliases to Inject Custom DNS Entries into Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Configuration

Description: Learn how to use Kubernetes hostAliases to inject custom DNS entries into pods, enabling connections to services by hostname without modifying DNS servers or using external name resolution.

---

Sometimes you need pods to resolve specific hostnames to specific IP addresses without involving DNS servers. Legacy applications might expect certain hostnames, or you might need to override DNS resolution for testing. Kubernetes hostAliases let you inject custom host-to-IP mappings directly into pod /etc/hosts files.

This feature provides a simple way to handle hostname resolution for special cases without complex DNS configuration or external dependencies.

## Understanding hostAliases

hostAliases add entries to a pod's /etc/hosts file. When a pod starts, Kubernetes writes the specified hostname-to-IP mappings into /etc/hosts before the container processes start.

This happens at pod creation time. Changes to hostAliases require restarting the pod. The entries are lost when the pod terminates.

hostAliases work independently of DNS. They bypass DNS resolution entirely for the specified hostnames.

## Basic hostAliases Configuration

Add simple host entries:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-alias-pod
spec:
  hostAliases:
  - ip: "192.168.1.100"
    hostnames:
    - "database.example.com"
    - "db.example.com"
  containers:
  - name: app
    image: nginx
```

Verify the entries:

```bash
kubectl exec host-alias-pod -- cat /etc/hosts
```

Output includes:

```
# Kubernetes-managed hosts file.
127.0.0.1       localhost
::1             localhost ip6-localhost ip6-loopback
...
192.168.1.100   database.example.com db.example.com
```

Multiple IP entries:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-alias-pod
spec:
  hostAliases:
  - ip: "192.168.1.100"
    hostnames:
    - "database.example.com"
  - ip: "192.168.1.101"
    hostnames:
    - "cache.example.com"
    - "redis.example.com"
  - ip: "10.0.0.50"
    hostnames:
    - "api.internal.com"
  containers:
  - name: app
    image: myapp:latest
```

## Connecting to Legacy Systems

Legacy applications often hardcode hostnames. Use hostAliases to map these to actual IPs:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: legacy
  template:
    metadata:
      labels:
        app: legacy
    spec:
      hostAliases:
      - ip: "10.100.50.10"
        hostnames:
        - "mainframe.corp.local"
      - ip: "10.100.50.11"
        hostnames:
        - "ldap.corp.local"
      - ip: "10.100.50.12"
        hostnames:
        - "fileserver.corp.local"
      containers:
      - name: app
        image: legacy-app:v1.0
        env:
        - name: MAINFRAME_HOST
          value: "mainframe.corp.local"
        - name: LDAP_HOST
          value: "ldap.corp.local"
```

The application connects to these hostnames without needing DNS entries or code changes.

## Overriding DNS for Testing

Override production hostnames with test servers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  hostAliases:
  - ip: "10.0.0.100"
    hostnames:
    - "api.production.com"  # Override production API with test instance
  - ip: "10.0.0.101"
    hostnames:
    - "db.production.com"   # Override production DB with test DB
  containers:
  - name: app
    image: app:test
    env:
    - name: API_URL
      value: "http://api.production.com/v1"
    - name: DB_HOST
      value: "db.production.com"
```

The application uses production hostnames but connects to test servers, enabling realistic integration testing.

## Multi-Container Pod Coordination

All containers in a pod share the same /etc/hosts file. Use hostAliases for cross-container communication:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: coordinated-pod
spec:
  hostAliases:
  - ip: "127.0.0.1"
    hostnames:
    - "cache"
    - "queue"
    - "metrics"
  containers:
  - name: app
    image: app:latest
    env:
    - name: CACHE_HOST
      value: "cache"
  - name: redis
    image: redis:7
  - name: rabbitmq
    image: rabbitmq:3
  - name: statsd
    image: statsd:latest
```

The app container connects to "cache", "queue", and "metrics" hostnames, which resolve to localhost where the sidecar containers listen.

## Deployment Strategies

Blue-green deployment with hostname switching:

```yaml
# Blue deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      hostAliases:
      - ip: "10.0.1.100"  # Blue backend
        hostnames:
        - "backend.service"
      containers:
      - name: app
        image: myapp:blue

---
# Green deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      hostAliases:
      - ip: "10.0.1.101"  # Green backend
        hostnames:
        - "backend.service"
      containers:
      - name: app
        image: myapp:green
```

Different versions connect to different backends using the same hostname.

## Development and Staging Environments

Map production hostnames to development services:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dev-pod
  namespace: development
spec:
  hostAliases:
  - ip: "10.244.0.10"  # Development database pod IP
    hostnames:
    - "postgres.production.svc.cluster.local"
  - ip: "10.244.0.11"  # Development Redis pod IP
    hostnames:
    - "redis.production.svc.cluster.local"
  - ip: "10.244.0.12"  # Development API pod IP
    hostnames:
    - "api.production.svc.cluster.local"
  containers:
  - name: app
    image: app:dev
```

Developers can use production configuration files in development without changing code.

## Service Mesh Integration

Override service mesh routing for specific pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bypass-mesh-pod
spec:
  hostAliases:
  - ip: "192.168.10.50"  # Direct service IP, bypassing mesh
    hostnames:
    - "external-service.mesh.local"
  containers:
  - name: app
    image: app:latest
```

This pod connects directly to the service instead of going through the mesh, useful for debugging mesh issues.

## Limitations and Caveats

hostAliases only work for pods not using hostNetwork. Pods with hostNetwork: true use the node's /etc/hosts file, which Kubernetes does not modify.

```yaml
# This will NOT work
apiVersion: v1
kind: Pod
metadata:
  name: invalid-hostalias-pod
spec:
  hostNetwork: true
  hostAliases:  # Ignored because hostNetwork is true
  - ip: "10.0.0.1"
    hostnames:
    - "example.com"
  containers:
  - name: app
    image: nginx
```

Changes to hostAliases require pod restart:

```bash
# Update hostAliases in deployment
kubectl edit deployment my-app

# Restart pods to apply changes
kubectl rollout restart deployment my-app
```

hostAliases entries are prepended to /etc/hosts. If Kubernetes adds other entries (like pod IP), they appear after hostAliases.

## Combining with DNS Configuration

Use hostAliases with custom DNS for comprehensive name resolution:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: combined-resolution-pod
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    nameservers:
    - 10.96.0.10
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
  hostAliases:
  - ip: "192.168.1.100"
    hostnames:
    - "legacy.internal.com"
  containers:
  - name: app
    image: app:latest
```

This pod:
- Checks /etc/hosts first (includes hostAliases)
- Falls back to DNS for other names
- Uses cluster DNS for service discovery

## Debugging hostAliases

Verify entries are applied:

```bash
kubectl exec my-pod -- cat /etc/hosts
```

Check if hostname resolves correctly:

```bash
kubectl exec my-pod -- getent hosts legacy.internal.com
```

Test connectivity:

```bash
kubectl exec my-pod -- ping -c 3 legacy.internal.com
kubectl exec my-pod -- curl http://legacy.internal.com
```

Check for typos in hostnames:

```bash
kubectl get pod my-pod -o jsonpath='{.spec.hostAliases}'
```

## Dynamic hostAliases with Init Containers

Generate hostAliases dynamically using init containers is not directly possible, but you can modify /etc/hosts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dynamic-hosts-pod
spec:
  initContainers:
  - name: setup-hosts
    image: busybox
    command:
    - sh
    - -c
    - |
      # Add custom entries to /etc/hosts
      echo "10.0.0.50 dynamic.example.com" >> /etc/hosts
    volumeMounts:
    - name: hosts
      mountPath: /etc/hosts
  containers:
  - name: app
    image: app:latest
    volumeMounts:
    - name: hosts
      mountPath: /etc/hosts
  volumes:
  - name: hosts
    emptyDir: {}
```

Note: This approach is complex and not recommended. Use hostAliases when possible.

## ConfigMap-Based hostAliases

Store hostAliases configuration in a ConfigMap for easier management:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: host-aliases-config
data:
  aliases.yaml: |
    - ip: "192.168.1.100"
      hostnames:
      - "db.example.com"
    - ip: "192.168.1.101"
      hostnames:
      - "cache.example.com"
```

Reference this in deployment templates using templating tools like Helm or Kustomize.

Helm template example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: {{ .Values.app.name }}
spec:
  hostAliases:
  {{- range .Values.hostAliases }}
  - ip: {{ .ip }}
    hostnames:
    {{- range .hostnames }}
    - {{ . }}
    {{- end }}
  {{- end }}
  containers:
  - name: app
    image: {{ .Values.app.image }}
```

Values file:

```yaml
hostAliases:
- ip: "192.168.1.100"
  hostnames:
  - "db.example.com"
  - "database.example.com"
- ip: "192.168.1.101"
  hostnames:
  - "cache.example.com"
```

## Best Practices

Use hostAliases sparingly. DNS is the preferred method for name resolution in Kubernetes.

Document why each hostAlias exists. Future maintainers need to understand the requirement.

Use consistent IP addresses. Changing IPs requires updating all pods.

Prefer Kubernetes services over hostAliases for pod-to-pod communication.

Test applications with hostAliases in development before production deployment.

Monitor for stale entries. If the IP address of a service changes, update hostAliases and restart pods.

Use ConfigMaps or Helm values to centralize hostAliases configuration across deployments.

Avoid using hostAliases for services that have frequent IP changes.

Consider DNS alternatives:
- ExternalName services for external hosts
- Service discovery for internal services
- Custom DNS entries in CoreDNS configuration

## Security Considerations

hostAliases can override legitimate hostnames. An attacker with pod creation privileges could redirect traffic:

```yaml
# Malicious example
hostAliases:
- ip: "10.0.0.999"  # Attacker-controlled server
  hostnames:
  - "api.production.com"
```

Use Pod Security Policies or admission controllers to restrict hostAliases in sensitive namespaces.

Audit hostAliases usage:

```bash
kubectl get pods -A -o json | jq -r '.items[] | select(.spec.hostAliases != null) | {name: .metadata.name, namespace: .metadata.namespace, aliases: .spec.hostAliases}'
```

## Conclusion

hostAliases provide a simple mechanism for injecting custom hostname-to-IP mappings into pods. Use them for legacy application compatibility, testing with overridden hostnames, and special cases where DNS configuration is impractical.

Configure hostAliases appropriately, document their purpose, and prefer DNS-based solutions when possible. Combine hostAliases with DNS configuration for comprehensive name resolution.

Master hostAliases to handle special hostname resolution requirements while maintaining simple and maintainable Kubernetes deployments.
