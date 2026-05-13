# How to Configure Cilium Gateway API Addresses Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Gateway API, IP Addresses, Load Balancer

Description: Configure static IP address assignment and address pool management for Cilium Gateway API gateways to control external ingress entry points.

---

## Introduction

Cilium's Gateway API addresses support allows operators to specify exactly which IP addresses are assigned to Gateway resources. This is useful for controlling ingress entry points, pre-registering DNS, and ensuring consistent IP addresses across deployments and upgrades.

Addresses can be assigned statically by requesting a specific IP, or dynamically by letting Cilium LB IPAM allocate an IP from a CiliumLoadBalancerIPPool. By default, the Gateway API controller creates a LoadBalancer Service for each Gateway, and Cilium LB IPAM assigns the Service address when a matching pool exists.

## Prerequisites

- Cilium with Gateway API enabled
- Cilium LB IPAM with a CiliumLoadBalancerIPPool for address allocation

## Configure a Static IP Address

Request a specific IP in the Gateway spec:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: static-ip-gateway
  namespace: default
spec:
  gatewayClassName: cilium
  addresses:
    - type: IPAddress
      value: "203.0.113.10"
  listeners:
    - name: http
      protocol: HTTP
      port: 80
```

## Configure IP Pool

Create a pool for dynamic allocation:

```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: gateway-pool
spec:
  blocks:
    - cidr: "203.0.113.0/28"
```

## Architecture

```mermaid
flowchart TD
    A[Gateway spec.addresses or generated Service] --> B[Cilium Operator]
    B --> C{Address type}
    C -->|Static IP| D[Request specific IP from pool]
    C -->|Dynamic| E[Allocate from CIDR range]
    D --> F[LoadBalancer Service]
    E --> F
    F --> G[IP assigned to Service]
    G --> H[Gateway status.addresses updated]
```

## Verify IP Assignment

```bash
kubectl get gateway static-ip-gateway -n default \
  -o jsonpath='{.status.addresses}'
```

## Multiple Addresses

Gateways can have multiple addresses (e.g., one IPv4 and one IPv6):

```yaml
spec:
  addresses:
    - type: IPAddress
      value: "203.0.113.10"
    - type: IPAddress
      value: "2001:db8::10"
```

## Check Pool Utilization

```bash
kubectl get ciliumloadbalancerippool gateway-pool \
  -o jsonpath='{.status}'
```

## Conclusion

Configuring Cilium Gateway API addresses support gives operators explicit control over ingress IP addresses. Static IPs enable predictable DNS and firewall rule management, while IP pools provide flexible dynamic allocation. Static address requests are managed through the Gateway spec, and assigned addresses are reflected in the Gateway status.
