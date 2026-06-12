# How to Configure Cilium Egress Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Egress Gateway, Networking, Security, DevOps, Service Mesh

Description: A comprehensive guide to configuring Cilium Egress Gateway for controlling and monitoring outbound traffic from Kubernetes clusters, including selective routing, high availability, and observability.

---

> Egress gateways give you a predictable, auditable, and secure way to route outbound traffic from your Kubernetes workloads. Instead of traffic leaving from any node with any IP, you control exactly which gateway nodes handle egress and what source IP external services see.

## Understanding Egress Gateway Concepts

By default, when a pod makes an outbound connection to an external service, the traffic is SNAT'd to the node's IP address. This creates several problems:

- External services see different source IPs depending on which node the pod runs on
- IP-based allowlists become unmanageable
- Auditing and compliance become difficult
- No centralized control over egress traffic

Cilium Egress Gateway solves these problems by routing egress traffic through dedicated gateway nodes with predictable IP addresses.

```mermaid
flowchart LR
    subgraph Cluster["Kubernetes Cluster"]
        subgraph Workers["Worker Nodes"]
            P1[Pod A]
            P2[Pod B]
            P3[Pod C]
        end
        subgraph Gateway["Egress Gateway Nodes"]
            EG1[Gateway 1<br/>IP: 10.0.1.100]
            EG2[Gateway 2<br/>IP: 10.0.1.101]
        end
    end

    P1 --> EG1
    P2 --> EG1
    P3 --> EG2

    EG1 --> External[External API<br/>Sees: 10.0.1.100]
    EG2 --> External
```

### Prerequisites

Before configuring egress gateway, ensure:

1. **Cilium 1.13+** is installed with egress gateway support enabled
2. **BPF masquerading** and **kube-proxy replacement** are enabled
3. **Gateway nodes** are available with static IPs

Check your Cilium installation:

```bash
# Verify Cilium is running

cilium status

# Check Cilium version
cilium version

# Verify BPF masquerading and kube-proxy replacement are enabled
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep -E 'Masquerading|KubeProxyReplacement'
```

## Enabling Egress Gateway in Cilium

First, enable the egress gateway feature in Cilium's configuration.

### Helm Installation

```yaml
# values.yaml for Cilium Helm chart
# Enable egress gateway functionality
egressGateway:
  enabled: true

# BPF masquerading is required for egress gateway
bpf:
  masquerade: true

# kube-proxy replacement is required for egress gateway
kubeProxyReplacement: true

# Optional: Enable Hubble for observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

Install or upgrade Cilium:

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with egress gateway enabled
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --values values.yaml \
  --wait
```

### Label Gateway Nodes

Designate specific nodes as egress gateways by labeling them:

```bash
# Label nodes that will serve as egress gateways
# These nodes should have static, predictable IPs
kubectl label nodes gateway-node-1 egress-gateway=true egress-ip=primary zone=zone-a
kubectl label nodes gateway-node-2 egress-gateway=true egress-ip=secondary zone=zone-b

# Verify labels
kubectl get nodes -l egress-gateway=true
```

## Gateway Configuration

Now create the egress gateway policy to route traffic through gateway nodes.

### Basic Egress Gateway Policy

```yaml
# egress-gateway-policy.yaml
# Route all traffic from specific pods through egress gateway
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: external-api-egress
  # Policies are cluster-scoped, no namespace needed
spec:
  # Select pods that should use this egress gateway
  selectors:
    - podSelector:
        matchLabels:
          app: payment-service
          # Only pods with this label use the egress gateway
          egress: external

  # Define which destination CIDRs trigger egress gateway routing
  destinationCIDRs:
    # Route traffic to external networks through gateway
    - "0.0.0.0/0"

  # Exclude internal cluster traffic from egress routing
  excludedCIDRs:
    - "10.0.0.0/8"      # Internal pod network
    - "172.16.0.0/12"   # Internal service network
    - "192.168.0.0/16"  # Other internal ranges

  # Select gateway nodes and specify egress IP
  egressGateway:
    # Node selector for gateway nodes
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: primary
    # The egress IP address (must be configured on the node)
    egressIP: 10.0.1.100
```

Apply the policy:

```bash
kubectl apply -f egress-gateway-policy.yaml

# Verify policy is active
kubectl get ciliumegressgatewaypolicies
kubectl describe ciliumegressgatewaypolicy external-api-egress
```

### Multiple Egress IPs for Different Services

```yaml
# payment-egress.yaml
# Dedicated egress IP for payment services
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: payment-egress
spec:
  selectors:
    - podSelector:
        matchLabels:
          app: payment-processor
  destinationCIDRs:
    # Stripe API ranges (example)
    - "35.190.247.0/24"
    - "35.201.97.0/24"
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: primary
    egressIP: 10.0.1.100

---
# analytics-egress.yaml
# Different egress IP for analytics services
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: analytics-egress
spec:
  selectors:
    - podSelector:
        matchLabels:
          app: analytics-pipeline
  destinationCIDRs:
    # Google Analytics API ranges (example)
    - "142.250.0.0/16"
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: secondary
    egressIP: 10.0.1.101
```

## Selective Egress Routing

Fine-grained control over which traffic uses egress gateways.

### Namespace-Based Selection

```yaml
# namespace-egress.yaml
# Route all traffic from production namespace through egress
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: production-namespace-egress
spec:
  selectors:
    # Select by namespace label
    - podSelector:
        matchLabels:
          io.kubernetes.pod.namespace: production
  destinationCIDRs:
    - "0.0.0.0/0"
  excludedCIDRs:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: primary
    egressIP: 10.0.1.100
```

### Destination-Based Routing

```yaml
# destination-based-egress.yaml
# Different egress IPs based on destination
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: aws-services-egress
spec:
  selectors:
    - podSelector:
        matchLabels:
          egress: aws
  # AWS API endpoints in us-east-1
  destinationCIDRs:
    - "52.94.0.0/16"
    - "54.239.0.0/16"
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: primary
    egressIP: 10.0.1.100

---
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: azure-services-egress
spec:
  selectors:
    - podSelector:
        matchLabels:
          egress: azure
  # Azure API endpoints
  destinationCIDRs:
    - "13.64.0.0/11"
    - "40.64.0.0/10"
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: secondary
    egressIP: 10.0.2.100
```

### Combining Multiple Selectors

```yaml
# complex-egress.yaml
# Complex selection with multiple criteria
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: multi-criteria-egress
spec:
  selectors:
    # First selector: production payment pods
    - podSelector:
        matchLabels:
          app: payment
          env: production
    # Second selector: any pod with external-api label
    - podSelector:
        matchLabels:
          network: external-api
    # Third selector: specific namespace
    - podSelector:
        matchExpressions:
          - key: io.kubernetes.pod.namespace
            operator: In
            values:
              - finance
              - compliance
  destinationCIDRs:
    - "0.0.0.0/0"
  excludedCIDRs:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
        egress-ip: primary
    egressIP: 10.0.1.100
```

## High Availability Setup

Improve egress gateway availability by configuring more than one gateway node.

```mermaid
flowchart TB
    subgraph Pods["Application Pods"]
        P1[Pod 1]
        P2[Pod 2]
        P3[Pod 3]
    end

    subgraph HA["HA Egress Gateway"]
        EG1[Gateway Node 1<br/>IP: 10.0.1.100]
        EG2[Gateway Node 2<br/>IP: 10.0.2.100]
    end

    P1 --> EG1
    P2 --> EG1
    P3 --> EG2

    EG1 --> External[External Services]
    EG2 --> External
```

### Multiple Gateway Nodes

```yaml
# ha-egress-policy.yaml
# High availability egress with multiple gateway nodes
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: ha-egress-gateway
spec:
  selectors:
    - podSelector:
        matchLabels:
          egress: external
  destinationCIDRs:
    - "0.0.0.0/0"
  excludedCIDRs:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
  egressGateways:
    # Each selected endpoint uses one gateway from this list.
    # Changing the selected gateway set can break existing connections.
    - nodeSelector:
        matchLabels:
          egress-gateway: "true"
          zone: zone-a
      egressIP: 10.0.1.100
    - nodeSelector:
        matchLabels:
          egress-gateway: "true"
          zone: zone-b
      egressIP: 10.0.2.100
```

### Node Preparation for HA

```bash
# Prepare gateway nodes with required configuration
# Run on each gateway node

# Ensure each egress IP is configured on the gateway node that advertises it
sudo ip addr add 10.0.1.100/32 dev eth0

# For cloud providers, use their mechanisms:
# AWS: Elastic IP or secondary private IP attached to ENI
# GCP: Alias IP range
# Azure: Secondary IP configuration
```

### Using Provider-Managed Failover

For automatic failover of a single externally allowlisted IP, use your cloud provider's supported mechanism to move or reassign that IP to a healthy gateway node. A Kubernetes `Service` of type `LoadBalancer` does not configure the source IP used by Cilium Egress Gateway.

Re-apply the `CiliumEgressGatewayPolicy` after changing gateway-node IP assignments so Cilium refreshes its selected egress IP.

### Health Checks for Gateway Nodes

```yaml
# gateway-health-daemonset.yaml
# Health monitoring for egress gateway nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: egress-gateway-health
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: egress-health
  template:
    metadata:
      labels:
        app: egress-health
    spec:
      nodeSelector:
        egress-gateway: "true"
      tolerations:
        - operator: Exists
      containers:
        - name: health-check
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                # Check egress connectivity
                if curl -s --max-time 5 https://api.github.com > /dev/null; then
                  echo "Egress healthy"
                else
                  echo "Egress failed"
                  # Alert so the provider failover process can react
                fi
                sleep 30
              done
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
            limits:
              cpu: 50m
              memory: 64Mi
```

## Monitoring Egress Traffic

Visibility into egress traffic patterns and health.

```mermaid
flowchart LR
    subgraph Cluster["Kubernetes Cluster"]
        Pods[Application Pods]
        EG[Egress Gateway]
        Hubble[Hubble]
        Prometheus[Prometheus]
    end

    Pods --> EG
    EG --> External[External APIs]

    Hubble -->|Observe| EG
    Hubble --> Prometheus
    Prometheus --> Grafana[Grafana Dashboard]
```

### Enable Hubble Observability

```yaml
# values.yaml additions for Hubble egress monitoring
hubble:
  enabled: true
  relay:
    enabled: true
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - icmp
      - httpV2:labelsContext=source_namespace,destination_ip,traffic_direction
```

### Hubble CLI Commands

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
HUBBLE_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then HUBBLE_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}
sha256sum --check hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum
sudo tar xzvfC hubble-linux-${HUBBLE_ARCH}.tar.gz /usr/local/bin

# Port forward to Hubble relay
cilium hubble port-forward &

# Observe all egress traffic
hubble observe --type trace:to-network

# Filter egress traffic from specific namespace
hubble observe --namespace production --type trace:to-network

# Watch traffic to specific destination
hubble observe --to-ip 35.190.247.0/24

# Monitor egress gateway policy matches
hubble observe --verdict FORWARDED --type policy-verdict

# Export flows to JSON for analysis
hubble observe --type trace:to-network -o json > egress-flows.json
```

### Prometheus Metrics

```yaml
# values.yaml additions for Prometheus Operator ServiceMonitors
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true

operator:
  prometheus:
    enabled: true
    serviceMonitor:
      enabled: true

hubble:
  metrics:
    serviceMonitor:
      enabled: true
      interval: 30s
```

### Key Metrics to Monitor

```yaml
# prometheus-rules.yaml
# Alerting rules for egress gateway
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: egress-gateway-alerts
  namespace: monitoring
spec:
  groups:
    - name: egress-gateway
      rules:
        # Alert on high egress traffic
        - alert: HighEgressTraffic
          expr: |
            sum(rate(hubble_flows_processed_total{
              type="Trace",
              subtype="to-network",
              verdict="FORWARDED"
            }[5m])) > 10000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: High egress traffic detected

        # Alert on egress policy drops
        - alert: EgressPolicyDrops
          expr: |
            sum(rate(hubble_drop_total{
              reason="POLICY_DENIED"
            }[5m])) > 100
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: Egress traffic being dropped by policy

        # Alert on gateway node down
        - alert: EgressGatewayNodeDown
          expr: |
            count(kube_node_status_condition{
              condition="Ready",
              status="true"
            } * on(node) kube_node_labels{
              label_egress_gateway="true"
            }) < 2
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: Egress gateway redundancy lost
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Cilium Egress Gateway",
    "panels": [
      {
        "title": "Egress Traffic Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(hubble_flows_processed_total{type=\"Trace\",subtype=\"to-network\",verdict=\"FORWARDED\"}[5m]))",
            "legendFormat": "egress"
          }
        ]
      },
      {
        "title": "Egress Gateway Node Health",
        "type": "stat",
        "targets": [
          {
            "expr": "count(kube_node_status_condition{condition=\"Ready\",status=\"true\"} * on(node) kube_node_labels{label_egress_gateway=\"true\"})"
          }
        ]
      },
      {
        "title": "Policy Drops",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(hubble_drop_total{reason=\"POLICY_DENIED\"}[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Verify Egress Gateway Status

```bash
# Check Cilium egress gateway status
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf egress list

# Verify policy is applied
kubectl get ciliumegressgatewaypolicies -o yaml

# Check endpoint status
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list

# Debug connectivity from a pod
kubectl exec -it test-pod -- curl -v https://api.external.com
```

### Common Issues

**Traffic not routed through gateway:**
- Verify pod labels match policy selectors
- Check destination CIDR is not in excludedCIDRs
- Ensure gateway nodes are labeled correctly

**Egress IP not working:**
- Verify egress IP is configured on gateway node interface
- Check cloud provider allows the IP assignment
- Ensure BPF masquerading is enabled

**High latency through gateway:**
- Check gateway node capacity
- Verify network path between pods and gateway
- Consider adding more gateway nodes

## Best Practices Summary

1. **Dedicated Gateway Nodes**: Use dedicated nodes for egress gateways to ensure predictable performance and easier troubleshooting.

2. **Static IPs**: Always use static IPs for egress gateways to maintain consistent allowlisting with external services.

3. **High Availability**: Deploy at least two gateway nodes in different availability zones for redundancy.

4. **Selective Routing**: Only route traffic that needs egress control through gateways; use excludedCIDRs for internal traffic.

5. **Monitor Everything**: Enable Hubble and set up comprehensive monitoring and alerting for egress traffic patterns.

6. **Document Policies**: Maintain clear documentation of which services use which egress IPs and why.

7. **Test Failover**: Regularly test gateway node failover or gateway reassignment to ensure HA configuration works as expected.

8. **Audit Regularly**: Review egress policies and traffic patterns quarterly to ensure they match security requirements.

9. **Version Control**: Store all egress gateway policies in Git for auditability and rollback capability.

10. **Least Privilege**: Apply egress policies only to pods that need external access; default deny for everything else.

---

Egress gateways are essential for enterprise Kubernetes deployments where you need predictable source IPs, audit trails, and centralized control over outbound traffic. Cilium makes this straightforward with its native egress gateway support and excellent observability through Hubble.

For monitoring your Kubernetes clusters, egress gateways, and the applications that depend on them, check out [OneUptime](https://oneuptime.com) - a comprehensive observability platform that helps you understand what's happening across your infrastructure.
