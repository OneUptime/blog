# How to Configure Kubernetes Network Segmentation for PCI-DSS Cardholder Data Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PCI-DSS, Compliance, Network Security, NetworkPolicy, Segmentation

Description: Implement PCI-DSS compliant network segmentation in Kubernetes to isolate cardholder data environments using NetworkPolicies, service mesh controls, and zone-based architectures that meet requirement 1.3.

---

PCI-DSS Requirement 1.3 mandates network segmentation to isolate the cardholder data environment (CDE) from the rest of your infrastructure. In traditional networks, this meant VLANs and firewalls. In Kubernetes, network segmentation requires a combination of NetworkPolicies, namespace isolation, service mesh controls, and careful architectural design.

Proper segmentation reduces your PCI scope by limiting which systems handle cardholder data. This shrinks the attack surface, simplifies compliance efforts, and reduces audit costs. However, implementing effective segmentation in a dynamic container environment requires understanding both PCI requirements and Kubernetes networking primitives.

## Understanding PCI-DSS Network Segmentation Requirements

PCI-DSS Requirement 1.3 specifies that the CDE must be segmented from untrusted networks. Sub-requirements mandate DMZ placement of public-facing systems (1.3.1), restriction of inbound traffic to necessary protocols (1.3.2), direct connection prohibition between internet and CDE (1.3.3), implementation of anti-spoofing measures (1.3.4), and restriction of outbound traffic (1.3.5).

For Kubernetes, this means creating network zones with strict ingress and egress controls, ensuring payment processing workloads can only communicate with authorized services, and preventing direct internet connectivity to CDE pods.

## Designing a Zone-Based Architecture

Create distinct security zones using Kubernetes namespaces:

```yaml
# pci-namespaces.yaml
---
# CDE Zone - handles cardholder data
apiVersion: v1
kind: Namespace
metadata:
  name: cardholder-data-environment
  labels:
    pci-zone: cde
    security-level: high
    network-isolation: strict

---
# DMZ Zone - public-facing services (no CHD)
apiVersion: v1
kind: Namespace
metadata:
  name: dmz
  labels:
    pci-zone: dmz
    security-level: medium
    network-isolation: moderate

---
# Internal Zone - backend services (no CHD)
apiVersion: v1
kind: Namespace
metadata:
  name: internal
  labels:
    pci-zone: internal
    security-level: medium
    network-isolation: moderate

---
# Management Zone - monitoring and administration
apiVersion: v1
kind: Namespace
metadata:
  name: management
  labels:
    pci-zone: management
    security-level: high
    network-isolation: strict
```

Apply the namespace structure:

```bash
kubectl apply -f pci-namespaces.yaml
```

## Implementing Default Deny Network Policies

Start with default deny policies for all zones, then explicitly allow required traffic:

```yaml
# pci-default-deny-policies.yaml
---
# CDE: Deny all traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: cardholder-data-environment
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
# DMZ: Deny all except DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-except-dns
  namespace: dmz
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53

---
# Internal: Deny all except DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-except-dns
  namespace: internal
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

Apply default deny policies:

```bash
kubectl apply -f pci-default-deny-policies.yaml
```

## Configuring CDE Network Policies

Allow only necessary traffic to and from the CDE:

```yaml
# pci-cde-network-policies.yaml
---
# Allow payment processor to receive requests from DMZ
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dmz-to-payment-processor
  namespace: cardholder-data-environment
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          pci-zone: dmz
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8443  # TLS only

---
# Allow payment processor to connect to payment gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-payment-gateway-egress
  namespace: cardholder-data-environment
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  policyTypes:
  - Egress
  egress:
  # Allow connection to external payment gateway
  - to:
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 443
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53

---
# Allow CDE database access only from payment processor
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-payment-db-access
  namespace: cardholder-data-environment
spec:
  podSelector:
    matchLabels:
      app: payment-database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: payment-processor
    ports:
    - protocol: TCP
      port: 5432

---
# Deny internet egress from CDE (PCI 1.3.3)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-internet-egress
  namespace: cardholder-data-environment
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  # Only allow internal cluster communication
  - to:
    - namespaceSelector: {}
  # Block all external traffic
```

Apply CDE policies:

```bash
kubectl apply -f pci-cde-network-policies.yaml
```

## Implementing DMZ Network Policies

Configure DMZ to receive internet traffic but restrict CDE access:

```yaml
# pci-dmz-network-policies.yaml
---
# Allow ingress from internet to API gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internet-ingress
  namespace: dmz
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443

---
# Allow API gateway to forward to CDE payment processor
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-cde-egress
  namespace: dmz
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Egress
  egress:
  # Allow connection to CDE payment processor only
  - to:
    - namespaceSelector:
        matchLabels:
          pci-zone: cde
    - podSelector:
        matchLabels:
          app: payment-processor
    ports:
    - protocol: TCP
      port: 8443
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53

---
# Prohibit DMZ direct database access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-database-access
  namespace: dmz
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchExpressions:
        - key: pci-zone
          operator: NotIn
          values: ["cde"]
```

## Using Cilium for Enhanced Network Segmentation

Cilium provides Layer 7 network policies and better observability:

```yaml
# pci-cilium-policies.yaml
---
# Layer 7 policy for API gateway to payment processor
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-to-payment-l7
  namespace: dmz
spec:
  endpointSelector:
    matchLabels:
      app: api-gateway
  egress:
  - toEndpoints:
    - matchLabels:
        app: payment-processor
        io.kubernetes.pod.namespace: cardholder-data-environment
    toPorts:
    - ports:
      - port: "8443"
        protocol: TCP
      rules:
        http:
        - method: "POST"
          path: "/api/v1/process-payment"
        - method: "GET"
          path: "/api/v1/transaction-status"

---
# Block all except specific endpoints (PCI 1.3.2)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: cde-strict-egress
  namespace: cardholder-data-environment
spec:
  endpointSelector:
    matchLabels:
      app: payment-processor
  egress:
  # Allow only specific external payment gateway
  - toFQDNs:
    - matchName: "gateway.payment-provider.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP

  # Deny all other external traffic
  - toEntities:
    - cluster
```

Install Cilium:

```bash
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set policyEnforcementMode=always \
  --set hubble.enabled=true

kubectl apply -f pci-cilium-policies.yaml
```

## Implementing Service Mesh for CDE Isolation

Use Istio for additional traffic control and encryption:

```yaml
# pci-istio-policies.yaml
---
# Strict mTLS for CDE namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: cde-strict-mtls
  namespace: cardholder-data-environment
spec:
  mtls:
    mode: STRICT

---
# Authorization policy for payment processor
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-processor-authz
  namespace: cardholder-data-environment
spec:
  selector:
    matchLabels:
      app: payment-processor
  action: ALLOW
  rules:
  # Only allow from API gateway
  - from:
    - source:
        namespaces: ["dmz"]
        principals: ["cluster.local/ns/dmz/sa/api-gateway"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/v1/process-payment"]

---
# Deny all other access to CDE
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: cde-deny-all
  namespace: cardholder-data-environment
spec:
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces: ["dmz", "management"]
```

Apply Istio policies:

```bash
istioctl install --set profile=default
kubectl label namespace cardholder-data-environment istio-injection=enabled
kubectl apply -f pci-istio-policies.yaml
```

## Monitoring and Auditing Network Segmentation

Create monitoring to detect segmentation violations:

```yaml
# prometheus-pci-network-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pci-network-segmentation-alerts
  namespace: monitoring
spec:
  groups:
  - name: pci_network_security
    interval: 1m
    rules:
    - alert: CDEUnauthorizedAccess
      expr: |
        rate(cilium_drop_count_total{
          destination_namespace="cardholder-data-environment",
          reason="Policy denied"
        }[5m]) > 0.1
      for: 2m
      labels:
        severity: critical
        pci_requirement: "1.3"
      annotations:
        summary: "Unauthorized access attempts to CDE"
        description: "{{ $value }} dropped packets/sec to CDE"

    - alert: InternetTrafficToCDE
      expr: |
        sum(rate(cilium_forward_count_total{
          destination_namespace="cardholder-data-environment",
          source="world"
        }[5m])) > 0
      for: 1m
      labels:
        severity: critical
        pci_requirement: "1.3.3"
      annotations:
        summary: "Direct internet traffic to CDE detected"
        description: "Internet traffic bypassing DMZ"
```

Deploy Hubble for network visibility:

```bash
# Enable Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Query traffic flows to CDE
hubble observe --namespace cardholder-data-environment --follow
```

## Validating PCI Network Segmentation

Create automated tests to verify segmentation:

```bash
# test-pci-segmentation.sh
#!/bin/bash

echo "Testing PCI-DSS Network Segmentation..."

# Test 1: DMZ cannot access CDE database directly
echo "Test 1: DMZ to CDE database (should FAIL)"
kubectl run test-dmz --rm -i -t --restart=Never \
  --namespace=dmz \
  --image=busybox \
  -- sh -c "timeout 5 nc -zv payment-database.cardholder-data-environment.svc 5432" \
  && echo "FAIL: DMZ accessed CDE database" || echo "PASS: Access denied"

# Test 2: API gateway can reach payment processor
echo "Test 2: API gateway to payment processor (should SUCCEED)"
kubectl run test-api --rm -i -t --restart=Never \
  --namespace=dmz \
  --labels=app=api-gateway \
  --image=curlimages/curl \
  -- curl -k https://payment-processor.cardholder-data-environment.svc:8443/health \
  && echo "PASS: Authorized access succeeded" || echo "FAIL: Authorized access denied"

# Test 3: External pod cannot reach CDE
echo "Test 3: External to CDE (should FAIL)"
kubectl run test-external --rm -i -t --restart=Never \
  --namespace=default \
  --image=busybox \
  -- sh -c "timeout 5 nc -zv payment-processor.cardholder-data-environment.svc 8443" \
  && echo "FAIL: External accessed CDE" || echo "PASS: Access denied"

echo "Segmentation tests complete"
```

Run validation tests:

```bash
chmod +x test-pci-segmentation.sh
./test-pci-segmentation.sh
```

PCI-DSS network segmentation in Kubernetes requires layering NetworkPolicies, service mesh controls, and architectural design. By creating distinct security zones and enforcing strict ingress/egress rules, you isolate cardholder data from untrusted networks while maintaining the flexibility needed for modern applications. Regular testing and monitoring ensure segmentation remains effective as your infrastructure evolves.
