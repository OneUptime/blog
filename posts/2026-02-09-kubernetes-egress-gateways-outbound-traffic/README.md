# How to Set Up Kubernetes Egress Gateways for Controlled Outbound Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Egress Gateway, Security, Istio, Networking

Description: Implement egress gateways in Kubernetes to centralize and control outbound traffic, enabling security policies, traffic monitoring, and compliance requirements for external service access.

---

Most Kubernetes networking guides focus on ingress traffic coming into your cluster. But controlling egress traffic leaving your cluster is equally important for security, compliance, and cost management. Egress gateways provide a centralized point for all outbound traffic, enabling fine-grained control over which services can reach external endpoints.

## Understanding Egress Gateways

An egress gateway is a dedicated set of pods that all outbound traffic must flow through. Instead of pods directly connecting to external services, they route through the gateway. This architecture enables:

- Centralized security policies for external access
- Traffic logging and monitoring
- IP allowlisting at external firewalls (gateway has a stable IP)
- Cost tracking by routing egress through specific nodes
- TLS termination and inspection
- Protocol-level filtering

Without an egress gateway, every pod can reach external services directly, making it hard to enforce policies or track which workloads access what.

## Implementing Egress Gateway with Istio

Istio provides the most mature egress gateway implementation. Start by installing Istio if you haven't already:

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.20.2
export PATH=$PWD/bin:$PATH

# Install with egress gateway enabled
istioctl install --set profile=default \
  --set components.egressGateways[0].name=istio-egressgateway \
  --set components.egressGateways[0].enabled=true -y
```

Verify the egress gateway is running:

```bash
kubectl get pod -n istio-system -l istio=egressgateway
```

## Configuring Basic Egress Control

By default, Istio allows all outbound traffic. Change this to require explicit configuration:

```bash
kubectl get configmap istio -n istio-system -o yaml | \
  sed 's/mode: ALLOW_ANY/mode: REGISTRY_ONLY/' | \
  kubectl replace -n istio-system -f -
```

Now pods can only reach services explicitly configured in the service registry.

## Routing Traffic Through Egress Gateway

Define an external service and route it through the gateway:

```yaml
# external-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: egress-gateway
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - api.example.com
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api-through-egress
spec:
  hosts:
  - api.example.com
  gateways:
  - mesh
  - egress-gateway
  http:
  - match:
    - gateways:
      - mesh
      port: 443
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - egress-gateway
      port: 443
    route:
    - destination:
        host: api.example.com
        port:
          number: 443
```

Apply this configuration:

```bash
kubectl apply -f external-service.yaml
```

Now traffic to api.example.com routes through the egress gateway first.

## Testing Egress Gateway

Deploy a test pod and verify traffic flows through the gateway:

```yaml
# test-egress.yaml
apiVersion: v1
kind: Pod
metadata:
  name: egress-test
  labels:
    app: egress-test
spec:
  containers:
  - name: curl
    image: curlimages/curl
    command: ["/bin/sh"]
    args: ["-c", "while true; do sleep 3600; done"]
```

```bash
kubectl apply -f test-egress.yaml

# Test connectivity
kubectl exec -it egress-test -- curl -I https://api.example.com
```

Check egress gateway logs to confirm traffic passed through:

```bash
kubectl logs -n istio-system -l istio=egressgateway -f
```

You should see log entries for requests to api.example.com.

## Implementing Without Istio

If you don't want the complexity of Istio, implement egress gateways with basic Kubernetes resources and iptables.

### Create Egress Gateway Pods

```yaml
# egress-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: egress-gateway
  namespace: egress-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: egress-gateway
  template:
    metadata:
      labels:
        app: egress-gateway
    spec:
      containers:
      - name: squid
        image: ubuntu/squid:latest
        ports:
        - containerPort: 3128
        volumeMounts:
        - name: squid-config
          mountPath: /etc/squid
      volumes:
      - name: squid-config
        configMap:
          name: squid-config
---
apiVersion: v1
kind: Service
metadata:
  name: egress-gateway
  namespace: egress-system
spec:
  selector:
    app: egress-gateway
  ports:
  - port: 3128
    targetPort: 3128
```

### Configure Squid as HTTP Proxy

```yaml
# squid-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: squid-config
  namespace: egress-system
data:
  squid.conf: |
    http_port 3128

    # Allow access to specific domains
    acl allowed_sites dstdomain .example.com
    acl allowed_sites dstdomain .googleapis.com
    acl SSL_ports port 443
    acl CONNECT method CONNECT

    # Deny CONNECT to other than secure SSL ports
    http_access deny CONNECT !SSL_ports

    # Allow access to allowed sites
    http_access allow allowed_sites

    # Deny all other access
    http_access deny all

    # Logging
    access_log /var/log/squid/access.log squid

    # Cache settings
    cache deny all
```

Deploy the egress gateway:

```bash
kubectl create namespace egress-system
kubectl apply -f squid-config.yaml
kubectl apply -f egress-gateway.yaml
```

### Configure Pods to Use the Proxy

Set HTTP_PROXY environment variables in your application pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-egress
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: HTTP_PROXY
          value: "http://egress-gateway.egress-system.svc.cluster.local:3128"
        - name: HTTPS_PROXY
          value: "http://egress-gateway.egress-system.svc.cluster.local:3128"
        - name: NO_PROXY
          value: ".cluster.local,.svc,localhost,127.0.0.1"
```

## Implementing with Network Policies

Combine egress gateways with network policies for defense in depth:

```yaml
# deny-all-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  # Allow DNS
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
  # Allow traffic to egress gateway only
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: egress-system
      podSelector:
        matchLabels:
          app: egress-gateway
    ports:
    - protocol: TCP
      port: 3128
```

This forces all pods in the production namespace to use the egress gateway for external access.

## Source IP Preservation

For services that need to allowlist your cluster's IP, ensure the egress gateway has a stable external IP.

With Istio:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-egressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  loadBalancerIP: 203.0.113.10  # Your reserved IP
  selector:
    istio: egressgateway
  ports:
  - port: 443
    name: https
```

For bare-metal with MetalLB:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: egress-gateway
  namespace: egress-system
  annotations:
    metallb.universe.tf/address-pool: egress-pool
spec:
  type: LoadBalancer
  selector:
    app: egress-gateway
  ports:
  - port: 3128
```

External services see all traffic coming from this stable IP.

## Egress Gateway for Specific Namespaces

Route only specific namespaces through the egress gateway:

```yaml
# namespace-specific-egress.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
  - api.partner.com
  gateways:
  - mesh
  - egress-gateway
  http:
  - match:
    - gateways:
      - mesh
      sourceNamespace: production  # Only production namespace
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
  - match:
    - gateways:
      - egress-gateway
    route:
    - destination:
        host: api.partner.com
```

Other namespaces can't reach api.partner.com at all (with REGISTRY_ONLY mode).

## Monitoring Egress Traffic

Implement comprehensive monitoring of egress traffic:

### With Istio

```bash
# View egress gateway metrics
kubectl port-forward -n istio-system \
  svc/istio-egressgateway 15090:15090

# Query Prometheus metrics
curl http://localhost:15090/stats/prometheus | grep istio_requests_total
```

Create a Grafana dashboard tracking:
- Requests per external service
- Latency to external endpoints
- Error rates
- Bandwidth usage

### With Squid

Parse Squid access logs:

```bash
kubectl logs -n egress-system -l app=egress-gateway | \
  awk '{print $7}' | sort | uniq -c | sort -nr
```

Ship logs to your logging system for analysis:

```yaml
# fluent-bit-egress.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: egress-system
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/squid/access.log
        Parser            squid
        Tag               egress.*

    [OUTPUT]
        Name              es
        Match             egress.*
        Host              elasticsearch.logging.svc.cluster.local
        Port              9200
        Index             egress-logs
```

## Cost Optimization

Route expensive egress traffic through specific nodes with lower cloud provider egress costs:

```yaml
# egress-gateway-nodeaffinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: egress-gateway
  namespace: egress-system
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-role.kubernetes.io/egress
                operator: In
                values:
                - "true"
      tolerations:
      - key: egress-only
        operator: Exists
        effect: NoSchedule
```

Label specific nodes for egress traffic:

```bash
kubectl label node node-1 node-role.kubernetes.io/egress=true
kubectl taint node node-1 egress-only=true:NoSchedule
```

## Security Considerations

Egress gateways enhance security but need proper configuration:

- Use TLS inspection for deep packet inspection
- Implement rate limiting to prevent data exfiltration
- Log all outbound connections for audit trails
- Regularly review and update allowed destination lists
- Use DNS policies to prevent DNS tunneling
- Implement anomaly detection on egress traffic patterns

Example rate limiting with Istio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api-circuit-breaker
spec:
  host: api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

## Best Practices

When implementing egress gateways:

- Start with monitoring-only mode before enforcing policies
- Use multiple egress gateway replicas for high availability
- Implement health checks for external dependencies
- Document all allowed external services and their business justification
- Use network policies in addition to gateway-level controls
- Monitor gateway resource usage and scale appropriately
- Implement circuit breakers to protect against external service failures
- Test failover scenarios regularly
- Keep an emergency bypass procedure documented
- Review egress logs regularly for suspicious patterns

Egress gateways transform outbound traffic from a blind spot into a well-controlled, monitored, and secured aspect of your Kubernetes infrastructure. They're essential for enterprises with compliance requirements or those running workloads that process sensitive data.
