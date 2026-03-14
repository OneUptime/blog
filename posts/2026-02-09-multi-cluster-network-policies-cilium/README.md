# How to Configure Multi-Cluster Network Policies with Cilium ClusterMesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, Network Policies, Multi-Cluster, eBPF

Description: Learn how to implement cross-cluster network policies using Cilium ClusterMesh for secure, performant service communication across multiple Kubernetes clusters.

---

Network security becomes complex when applications span multiple Kubernetes clusters. Traditional network policies only work within a single cluster, leaving cross-cluster traffic unprotected or requiring complex service mesh configurations. Cilium ClusterMesh provides eBPF-based networking that extends network policies across cluster boundaries while maintaining high performance.

In this guide, you'll learn how to set up Cilium ClusterMesh and configure network policies that enforce security across multiple Kubernetes clusters.

## Understanding Cilium ClusterMesh

Cilium ClusterMesh connects multiple Kubernetes clusters at the networking layer, enabling pods in different clusters to communicate directly using their pod IPs. It provides transparent service discovery across clusters, unified network policy enforcement, and high-performance data plane using eBPF technology that bypasses iptables overhead.

ClusterMesh creates encrypted tunnels between clusters and synchronizes service information, allowing you to write network policies that reference services and pods regardless of which cluster they run in.

## Installing Cilium in Each Cluster

Install Cilium with ClusterMesh support in each cluster:

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
sudo tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Install Cilium in cluster-1
cilium install \
  --context cluster-1 \
  --cluster-name cluster-1 \
  --cluster-id 1 \
  --ipam kubernetes

# Install Cilium in cluster-2
cilium install \
  --context cluster-2 \
  --cluster-name cluster-2 \
  --cluster-id 2 \
  --ipam kubernetes
```

Each cluster needs a unique cluster ID and non-overlapping pod CIDR ranges.

Verify Cilium installation:

```bash
cilium status --context cluster-1
cilium status --context cluster-2
```

## Enabling ClusterMesh

Enable ClusterMesh on both clusters:

```bash
# Enable ClusterMesh in cluster-1
cilium clustermesh enable --context cluster-1 --service-type LoadBalancer

# Enable ClusterMesh in cluster-2
cilium clustermesh enable --context cluster-2 --service-type LoadBalancer

# Wait for ClusterMesh to be ready
cilium clustermesh status --context cluster-1 --wait
cilium clustermesh status --context cluster-2 --wait
```

Connect the clusters:

```bash
# Connect cluster-1 to cluster-2
cilium clustermesh connect --context cluster-1 --destination-context cluster-2

# Verify connectivity
cilium clustermesh status --context cluster-1
```

You should see cluster-2 listed as connected with a status of "ready."

## Configuring Global Services

Make services available across clusters by adding the global service annotation:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: default
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/shared: "true"
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: payment

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment
  template:
    metadata:
      labels:
        app: payment
    spec:
      containers:
      - name: payment
        image: myregistry.io/payment:v1.0
        ports:
        - containerPort: 8080
```

Deploy this to both clusters. Pods in cluster-1 can now access the payment service endpoints in both clusters transparently.

## Implementing Cross-Cluster Network Policies

Create network policies that work across clusters. Start with a simple policy allowing traffic from specific namespaces:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-payment
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: payment
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
        io.kubernetes.pod.namespace: default
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
```

This policy works identically whether the frontend pod is in the same cluster or a different cluster connected via ClusterMesh.

Create a more complex policy allowing traffic based on cluster identity:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-from-cluster-1
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: database
  ingress:
  - fromEndpoints:
    - matchLabels:
        io.cilium.k8s.policy.cluster: cluster-1
        app: api
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
```

This allows only API pods from cluster-1 to access the database, blocking API pods from other clusters.

## Implementing Zone-Based Network Policies

Restrict traffic based on geographic zones:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: restrict-cross-region-database-access
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: database
      region: us-east-1
  ingress:
  - fromEndpoints:
    - matchLabels:
        region: us-east-1
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP

  egress:
  - toEndpoints:
    - matchLabels:
        region: us-east-1
```

This ensures database traffic stays within the same region for latency and compliance reasons.

## Layer 7 Network Policies

Cilium supports Layer 7 (HTTP) network policies for fine-grained control:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-http-policy
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/api/v1/.*"
        - method: "POST"
          path: "/api/v1/orders"
          headers:
          - "Content-Type: application/json"
```

This policy allows only specific HTTP methods and paths, providing API-level security across clusters.

## Implementing Service-to-Service Authentication

Combine network policies with mutual TLS for stronger security:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: mtls-required-policy
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: secure-service
  ingress:
  - fromEndpoints:
    - matchLabels:
        security.cilium.io/identity: "authorized-client"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
      terminatingTLS:
        secret:
          name: server-tls-cert
          namespace: default
    fromRequires:
    - matchLabels:
        security.cilium.io/mtls: "enabled"
```

## Deny-All Default Policy

Implement a default deny-all policy for defense in depth:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  endpointSelector: {}
  ingress:
  - {}
  egress:
  - {}

  # Explicitly deny all traffic not matching other policies
  policyEnforcement: always
```

Then create specific allow policies for required traffic:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-dns
  namespace: default
spec:
  endpointSelector: {}
  egress:
  - toEndpoints:
    - matchLabels:
        io.kubernetes.pod.namespace: kube-system
        k8s-app: kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
      rules:
        dns:
        - matchPattern: "*"
```

## Monitoring Network Policy Enforcement

Monitor policy decisions using Hubble, Cilium's observability layer:

```bash
# Enable Hubble
cilium hubble enable --context cluster-1 --ui

# Access Hubble UI
cilium hubble ui --context cluster-1
```

Query flow logs programmatically:

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
sudo tar xzvfC hubble-linux-amd64.tar.gz /usr/local/bin

# Watch flows in real-time
hubble observe --context cluster-1

# Filter dropped traffic
hubble observe --context cluster-1 --verdict DROPPED

# Monitor traffic to specific service
hubble observe --context cluster-1 --to-label app=payment
```

Create alerts for policy violations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-network-policy-alerts
  namespace: cilium-monitoring
spec:
  groups:
  - name: cilium-policies
    rules:
    - alert: HighDroppedPackets
      expr: rate(cilium_drop_count_total[5m]) > 100
      for: 5m
      annotations:
        summary: "High rate of dropped packets detected"

    - alert: PolicyDenyIncrease
      expr: increase(cilium_policy_l4_denied_total[10m]) > 50
      for: 5m
      annotations:
        summary: "Increase in policy denied connections"
```

## Testing Network Policies

Test policies before enforcement:

```bash
# Deploy test pods in each cluster
kubectl run --context cluster-1 -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
kubectl run --context cluster-2 -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash

# Test connectivity from cluster-1 to service in cluster-2
curl http://payment-service.default.svc.cluster.local/health

# Test specific endpoints
curl -X POST http://payment-service/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"item":"test"}'
```

Use Cilium's policy simulation mode:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: test-policy
  namespace: default
  annotations:
    policy.cilium.io/audit-mode: "true"  # Log violations but don't enforce
spec:
  endpointSelector:
    matchLabels:
      app: payment
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
```

Review audit logs before removing the annotation to enforce the policy.

## Best Practices

Start with permissive policies and gradually tighten them based on observed traffic patterns. Hubble flow logs show actual communication patterns.

Use namespace isolation to create security boundaries. Different applications should run in different namespaces with policies restricting cross-namespace traffic.

Label pods consistently across clusters. Network policies rely on labels, so standardize labeling conventions.

Implement monitoring before enforcing policies. Understand normal traffic patterns to avoid breaking applications.

Test policies in staging environments that mirror production cluster configurations.

Document your network policies clearly, including the security rationale and expected traffic flows.

## Conclusion

Cilium ClusterMesh extends Kubernetes network policies across cluster boundaries, providing unified security enforcement for multi-cluster architectures. Its eBPF-based data plane delivers high performance while enabling sophisticated Layer 7 policies and observability through Hubble.

Start with basic cross-cluster connectivity and service discovery, then layer on network policies incrementally as you understand your traffic patterns. The combination of ClusterMesh and well-designed network policies provides robust security for distributed Kubernetes applications.
