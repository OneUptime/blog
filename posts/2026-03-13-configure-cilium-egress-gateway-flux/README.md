# How to Configure Cilium Egress Gateway with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Cilium, Egress Gateway, Network Security, eBPF

Description: Configure Cilium Egress Gateway for controlled outbound traffic using Flux CD to provide stable source IPs for pods accessing external services.

---

## Introduction

The Cilium Egress Gateway routes outbound traffic from selected pods through a specific gateway node, masquerading with that node's IP address. This solves a critical challenge: cloud firewall rules and external APIs often need to allowlist source IPs, but pod IPs in Kubernetes are ephemeral and change on every restart.

Managing CiliumEgressGatewayPolicy resources through Flux CD ensures your egress routing configuration is version-controlled. Adding a new external service that requires a stable source IP, or assigning a new IP range to a workload, is a pull request operation.

This guide covers configuring the Cilium Egress Gateway using Flux CD for stable-IP egress routing.

## Prerequisites

- Kubernetes cluster with Cilium installed (1.14+) and Egress Gateway feature enabled
- Flux CD v2 bootstrapped to your Git repository
- Dedicated gateway nodes with elastic/static IPs assigned at the cloud provider level

## Step 1: Enable Egress Gateway in Cilium

Add to your Cilium HelmRelease values:

```yaml
# In your existing Cilium HelmRelease values:
# clusters/my-cluster/cilium/helmrelease.yaml
# (partial - add to existing values)
    egressGateway:
      enabled: true
```

Apply the change via Flux:

```bash
flux reconcile helmrelease cilium -n cilium
```

## Step 2: Label Gateway Nodes

Label the nodes that will serve as egress gateways:

```bash
# Label dedicated gateway nodes
kubectl label node gateway-node-01 egress-gateway=true
kubectl label node gateway-node-02 egress-gateway=true
```

## Step 3: Create CiliumEgressGatewayPolicy

```yaml
# clusters/my-cluster/cilium-egress/payment-egress.yaml
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: payment-service-egress
spec:
  # Select pods that should use the egress gateway
  selectors:
    - podSelector:
        matchLabels:
          app: payment-service
          environment: production
  # External destination CIDR (Stripe's IP range)
  destinationCIDRs:
    - 0.0.0.0/0   # Route all traffic from payment-service through gateway
    # Or use specific CIDRs:
    # - 54.187.174.169/32  # api.stripe.com

  # Egress gateway configuration
  egressGateway:
    # Select the node that acts as the gateway
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
    # Use the node's primary interface IP as the masquerade IP
    # Or specify a specific IP with egressIP
    egressIP: 203.0.113.10  # The elastic IP assigned to your gateway node
```

## Step 4: Configure Multiple Egress Policies

```yaml
# clusters/my-cluster/cilium-egress/egress-policies.yaml
# Separate egress policy for the data pipeline team
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: data-pipeline-egress
spec:
  selectors:
    - podSelector:
        matchLabels:
          team: data-platform
          environment: production
  destinationCIDRs:
    - 0.0.0.0/0
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
    egressIP: 203.0.113.11  # Different static IP for data team
---
# Egress for internal services to a specific on-premises CIDR
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: on-prem-egress
spec:
  selectors:
    - podSelector:
        matchLabels:
          needs-on-prem-access: "true"
  # Only apply to on-premises CIDR
  destinationCIDRs:
    - 192.168.0.0/16
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gateway: "true"
    egressIP: 10.0.1.100  # Internal IP for on-prem VPN gateway
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/cilium-egress/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - payment-egress.yaml
  - egress-policies.yaml
---
# clusters/my-cluster/flux-kustomization-cilium-egress.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-egress-gateway
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: cilium
  path: ./clusters/my-cluster/cilium-egress
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Validate Egress Gateway Behavior

```bash
# Apply Flux reconciliation
flux reconcile kustomization cilium-egress-gateway

# Check egress gateway policies
kubectl get ciliumbgpegresspolicies --all-namespaces
# Note: In some versions, use:
kubectl get ciliumbgpegrespolicies --all-namespaces

# Verify traffic is masqueraded with the gateway IP
kubectl exec -n production deploy/payment-service -- \
  curl -s https://api64.ipify.org
# Should return the egress gateway IP (203.0.113.10)

# Check Cilium BPF egress map
kubectl exec -n cilium daemonset/cilium -- \
  cilium bpf egress list

# Use Hubble to observe egress flows
hubble observe \
  --namespace production \
  --pod payment-service \
  --type l3-l4 \
  --last 20
```

## Best Practices

- Assign elastic/static IPs to gateway nodes at the cloud provider level before creating EgressGatewayPolicy resources - the `egressIP` must already be assigned to the node's network interface.
- Use dedicated gateway nodes (with the `egress-gateway: "true"` label) that are sized appropriately to handle the egress bandwidth of all matched pods.
- Create separate egress policies for different teams or services so each can have its own stable IP, enabling fine-grained firewall rules at the external service level.
- Apply `destinationCIDRs` as specifically as possible rather than using `0.0.0.0/0` - routing all traffic through the gateway node adds latency for internal cluster traffic.
- Monitor gateway node bandwidth and CPU usage - all matched pods' external traffic flows through the gateway node, which can become a bottleneck under heavy load.

## Conclusion

Cilium Egress Gateway managed through Flux CD provides a GitOps-controlled, stable-IP egress solution for Kubernetes workloads. Teams can declare which pods require stable source IPs, which external destinations are affected, and which gateway IP to use - all through version-controlled CiliumEgressGatewayPolicy resources that Flux applies and reconciles automatically.
