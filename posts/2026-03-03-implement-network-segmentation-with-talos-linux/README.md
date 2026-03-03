# How to Implement Network Segmentation with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Segmentation, Kubernetes, Network Security, Firewall

Description: Learn how to implement network segmentation in a Talos Linux Kubernetes cluster using firewall rules, VLANs, and network policies.

---

Network segmentation is a foundational security practice that limits the blast radius of a compromise by dividing your network into isolated zones. In a Kubernetes environment running on Talos Linux, you can implement segmentation at multiple layers: the node network level, the pod network level, and through Kubernetes-native network policies. This guide covers all three approaches and shows how they work together.

## Why Network Segmentation Matters

In a flat network, any compromised workload can potentially reach every other workload. An attacker who gains access to a single pod could scan the entire cluster network, access databases, reach the Kubernetes API server, or pivot to other infrastructure. Network segmentation limits this lateral movement by enforcing boundaries between different parts of your infrastructure.

For a Talos Linux cluster, the key boundaries you should establish are:

- **Control plane isolation** - The control plane network should be separate from the worker node network
- **etcd isolation** - etcd communication should be restricted to control plane nodes only
- **Workload isolation** - Different application tiers (frontend, backend, database) should be segmented
- **Management network** - The Talos API should be accessible only from a management network

## Node-Level Firewall Configuration

Talos Linux allows you to configure firewall rules at the node level through the machine configuration. These rules apply before any Kubernetes networking comes into play:

```yaml
# machine-config-firewall.yaml
# Configure node-level firewall rules for network segmentation
machine:
  network:
    kubespan:
      enabled: false
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
    # Firewall rules
    rules:
      # Allow Talos API from management network only
      - action: accept
        direction: in
        protocol: tcp
        portRanges:
          - lo: 50000
            hi: 50000
        source:
          network: 10.0.0.0/24  # Management network
      # Allow Kubernetes API from internal network
      - action: accept
        direction: in
        protocol: tcp
        portRanges:
          - lo: 6443
            hi: 6443
        source:
          network: 10.0.0.0/16
      # Allow kubelet communication
      - action: accept
        direction: in
        protocol: tcp
        portRanges:
          - lo: 10250
            hi: 10250
        source:
          network: 10.0.0.0/16
      # Drop everything else from outside
      - action: drop
        direction: in
        source:
          network: 0.0.0.0/0
```

Apply the firewall configuration:

```bash
# Apply firewall rules to control plane nodes
talosctl apply-config --nodes 10.0.1.10 \
  --config-patch @machine-config-firewall.yaml
```

## VLAN-Based Segmentation

For physical or virtual infrastructure, VLANs provide strong network isolation. Talos supports VLAN configuration through its machine configuration:

```yaml
# machine-config-vlans.yaml
# Configure VLAN-based network segmentation
machine:
  network:
    interfaces:
      # Primary interface on management VLAN
      - interface: eth0
        addresses:
          - 10.0.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
        vlans:
          # VLAN for control plane traffic
          - vlanId: 100
            addresses:
              - 10.0.100.10/24
          # VLAN for pod network
          - vlanId: 200
            addresses:
              - 10.0.200.10/24
          # VLAN for storage network
          - vlanId: 300
            addresses:
              - 10.0.300.10/24
```

This creates separate network segments for management, control plane, pod, and storage traffic. Each VLAN can have its own firewall rules and routing policies.

## Separating Control Plane and Worker Networks

For high-security environments, run control plane nodes on a separate network from worker nodes:

```yaml
# controlplane-config.yaml
# Control plane node network configuration
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.10/24  # Control plane network
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
```

```yaml
# worker-config.yaml
# Worker node network configuration
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.2.20/24  # Worker network
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.2.1
```

Configure your network infrastructure (switches, routers, or cloud VPCs) to allow only the necessary traffic between these networks:

- Workers need to reach the Kubernetes API server (port 6443)
- The API server needs to reach kubelets (port 10250)
- etcd traffic (ports 2379-2380) should stay within the control plane network

## Kubernetes Network Policies

At the pod level, use Kubernetes NetworkPolicy resources to enforce segmentation. These require a CNI that supports network policies (Cilium, Calico, or similar):

```yaml
# namespace-isolation.yaml
# Default deny all traffic in the production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Then selectively allow the traffic you need:

```yaml
# allow-frontend-to-backend.yaml
# Allow frontend pods to communicate with backend pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - protocol: TCP
          port: 8080
```

```yaml
# allow-backend-to-database.yaml
# Allow backend pods to reach the database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-database
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - protocol: TCP
          port: 5432
```

## Using Cilium for Advanced Segmentation

Cilium is a popular CNI choice for Talos clusters because it provides advanced network policy features beyond the standard Kubernetes NetworkPolicy:

```yaml
# cilium-l7-policy.yaml
# Cilium Layer 7 policy for HTTP-aware segmentation
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-server
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
              - method: GET
                path: "/api/v1/.*"
              - method: POST
                path: "/api/v1/data"
```

Install Cilium on your Talos cluster:

```bash
# Install Cilium using the CLI
cilium install --helm-set ipam.mode=kubernetes

# Verify Cilium is running
cilium status

# Enable Hubble for network flow visibility
cilium hubble enable --ui
```

## Isolating the Talos API Network

The Talos API is a high-value target because it controls the node itself. Restrict access to the Talos API port (50000) to a dedicated management network:

```yaml
# machine-config-api-isolation.yaml
# Restrict Talos API to management network
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.10/24
      - interface: eth1
        addresses:
          - 192.168.100.10/24  # Management interface
    rules:
      # Only allow Talos API access from management network
      - action: accept
        direction: in
        protocol: tcp
        portRanges:
          - lo: 50000
            hi: 50000
        source:
          network: 192.168.100.0/24
      # Block Talos API from all other networks
      - action: drop
        direction: in
        protocol: tcp
        portRanges:
          - lo: 50000
            hi: 50000
```

## Monitoring Network Segmentation

After implementing segmentation, monitor for violations and unexpected traffic patterns:

```bash
# Use Cilium Hubble to observe network flows
hubble observe --namespace production --verdict DROPPED

# Check for denied connections that might indicate misconfiguration
hubble observe --type drop --last 100

# Monitor traffic between specific labels
hubble observe --from-label "tier=frontend" --to-label "tier=database"
```

Set up alerts for network policy violations:

```yaml
# network-policy-alerts.yaml
# Alert on unexpected network traffic patterns
groups:
  - name: network-segmentation
    rules:
      - alert: NetworkPolicyViolation
        expr: |
          rate(hubble_drop_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of dropped packets detected"
```

## Testing Your Segmentation

Regularly test that your network segmentation is working as expected:

```bash
# Deploy a test pod in the frontend tier
kubectl run test-frontend --image=busybox --labels="tier=frontend" \
  -n production -- sleep 3600

# Try to reach the database from frontend (should be blocked)
kubectl exec -n production test-frontend -- \
  wget -T 5 -q -O- database-service:5432 2>&1 || echo "Blocked as expected"

# Try to reach the backend from frontend (should be allowed)
kubectl exec -n production test-frontend -- \
  wget -T 5 -q -O- backend-service:8080/health 2>&1

# Clean up
kubectl delete pod test-frontend -n production
```

## Conclusion

Network segmentation in a Talos Linux cluster works at multiple layers, from node-level firewall rules to Kubernetes network policies. The strongest approach combines all layers: separate physical or virtual networks for different node roles, Talos firewall rules to protect the management and control plane interfaces, and Kubernetes network policies to enforce workload isolation. Start with a default-deny posture and selectively open the paths you need. Monitor your network flows to verify segmentation is working and to detect any unexpected communication patterns.
