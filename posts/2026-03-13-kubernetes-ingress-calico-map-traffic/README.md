# How to Map Kubernetes Ingress with Calico to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Ingress, CNI, Traffic Flows, Networking, Network Policy

Description: A concrete walkthrough of real ingress traffic scenarios in a Calico cluster, tracing packets from source to destination through policy enforcement.

---

## Introduction

Understanding how ingress traffic actually flows through Calico's policy enforcement helps you debug connectivity issues and design policies with confidence. The policy model is clear in documentation, but understanding what happens at the packet level - which hooks are evaluated, in what order, and what causes a packet to be dropped - requires tracing real traffic through the system.

This post maps three ingress traffic scenarios to their actual enforcement paths: pod-to-pod ingress, ingress controller to backend, and external load balancer traffic.

## Prerequisites

- A running Calico cluster with ingress policies applied
- Understanding of Calico's NetworkPolicy model
- Basic familiarity with iptables or eBPF (depending on your dataplane)

## How Calico Evaluates Ingress Policy

Before tracing scenarios, understand the evaluation order:

```mermaid
graph TD
    Packet[Incoming Packet] --> Tier[Matching Calico policy tiers\nLowest order first]
    Tier --> Policy[Calico NetworkPolicy or GlobalNetworkPolicy\nWithin each tier by order]
    Policy --> KNP[Kubernetes NetworkPolicy\nAdditive allow rules in default tier]
    KNP --> ACCEPT{Action or no match?}
    ACCEPT -->|Accept| Pod[Delivered to Pod]
    ACCEPT -->|Deny| DROP[Packet dropped]
    ACCEPT -->|No match| DENY2[Implicit deny\nif any policy selects pod]
```

Calico policies are evaluated by tier order, then by policy order within each tier. `Allow` and `Deny` actions are final; `Pass` continues to the next applicable tier. Kubernetes NetworkPolicies are additive allow policies in the default tier, so their relative order does not change the result.

## Scenario 1: Frontend Pod to Backend Pod (Same Namespace)

```mermaid
sequenceDiagram
    participant Frontend as Frontend Pod (app=frontend)
    participant Felix as Felix (on Backend Node)
    participant Backend as Backend Pod (app=backend)

    Frontend->>Felix: TCP SYN to backend:8080
    Felix->>Felix: Check applicable tiers and policies
    Felix->>Felix: Check NetworkPolicy selects backend pod
    Felix->>Felix: Evaluate ingress rules
    Felix->>Felix: Rule: from podSelector app=frontend → Allow
    Felix->>Backend: Deliver packet
    Backend->>Frontend: TCP SYN-ACK (conntrack allows return)
```

Felix programs the ingress enforcement on the receiving node, not the sending node. The return traffic is automatically allowed by connection tracking.

In iptables mode, inspect the enforcement chain:
```bash
# On the node running the backend pod

sudo iptables -L cali-pi-<backend-interface> -n -v
# Shows the allow rule for frontend pods
```

## Scenario 2: Ingress Controller to Backend (Cross-Namespace)

When an NGINX ingress controller pod in the `ingress-nginx` namespace proxies to a backend in the `app` namespace:

```mermaid
graph LR
    Client[External Client] --> LB[Load Balancer]
    LB --> NGINX[NGINX Pod\ningress-nginx ns]
    NGINX --> Felix[Felix enforces\nBackend NetworkPolicy]
    Felix --> Backend[Backend Pod\napp ns]
```

The NetworkPolicy that allows this traffic uses a cross-namespace selector:

```yaml
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: ingress-nginx
    podSelector:
      matchLabels:
        app.kubernetes.io/name: ingress-nginx
  ports:
  - port: 8080
```

Calico Felix on the backend's node evaluates this rule when the packet arrives from the ingress controller pod's IP. The source is the ingress controller pod's IP (the backend receives the actual pod-to-pod traffic after the ingress controller has terminated the external TLS connection).

## Scenario 3: External LoadBalancer Traffic

When traffic arrives from an external load balancer to a NodePort service and then to a backend pod:

```mermaid
graph LR
    EXT[External Client\n198.51.100.1] --> NP[NodePort\nexternalTrafficPolicy: Cluster]
    NP -->|SNAT applied| Felix[Felix: Source sees\nNode IP not client IP]
    Felix --> Pod[Backend Pod]
```

With `externalTrafficPolicy: Cluster` (default), Calico sees the node IP as the ingress source, not the external client IP. This means client-IP-based ingress policies will not work.

With `externalTrafficPolicy: Local` in the standard Linux dataplane, or with Calico eBPF native service handling:
```mermaid
graph LR
    EXT[External Client\n198.51.100.1] --> Felix[Felix: Source is\n198.51.100.1 - real client IP]
    Felix --> Pod[Backend Pod]
```

Now ingress policies can match on the actual client IP for IP-based access control.

## Observing Policy Enforcement in Real Time

Use Calico `Log` policy actions to observe matching ingress traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: log-backend-ingress
  namespace: app
spec:
  selector: app == "backend"
  types:
  - Ingress
  ingress:
  - action: Log
    protocol: TCP
    destination:
      ports:
      - 8080
```

After applying a temporary log rule, watch the node logs for matching policy log entries:

```bash
sudo journalctl -f | grep -i calico
```

## Best Practices

- Remember that ingress policy is enforced at the receiving node, not the sending pod
- For external traffic, check `externalTrafficPolicy` before writing client-IP-based ingress rules
- Use `calicoctl get workloadendpoint -o yaml` to see the endpoint labels, profiles, and interface details that policy selectors use

## Conclusion

Calico ingress enforcement happens on the node receiving the traffic, using rules programmed by Felix. Calico policies are evaluated by tier and policy order, while Kubernetes NetworkPolicies contribute additive allow rules. The evaluation is deterministic and inspectable via iptables chains or eBPF program hooks. Understanding the enforcement location and evaluation order is the foundation for debugging any ingress connectivity issue.
