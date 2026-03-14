# How to Avoid Common Mistakes with Kubernetes Egress with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Egress, CNI, Troubleshooting, Best Practices, Network Policy

Description: Common egress configuration mistakes in Calico deployments and how to prevent them, from broken DNS egress to IP allowlist drift.

---

## Introduction

Egress policy mistakes in Calico are uniquely painful because they often manifest as intermittent connectivity failures — workloads that reach some external endpoints but not others, or that worked last week but broke when an external API changed its IP address. These failures are not immediately obvious as network policy issues.

This post covers the five most common egress mistakes, including the one mistake that breaks almost every first-time egress policy implementation: forgetting to allow DNS egress.

## Prerequisites

- A Calico cluster with egress NetworkPolicy applied or planned
- `kubectl` and `calicoctl` access for diagnostics
- Understanding of how DNS resolution works in Kubernetes

## Mistake 1: Forgetting DNS Egress in Deny-All Policies

This is the most common egress mistake. When a deny-all egress policy is applied, DNS resolution fails because the policy blocks UDP/TCP port 53 to the cluster's CoreDNS service. Applications then fail with hostname resolution errors, which look like network connectivity failures but are actually DNS failures.

**Symptom**: Applications fail with errors like `Could not resolve host: my-service.default.svc.cluster.local`.

**Fix**: Always include a DNS egress allow rule alongside any deny-all policy:

```yaml
egress:
- ports:
  - port: 53
    protocol: UDP
  - port: 53
    protocol: TCP
- to:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: kube-system
```

## Mistake 2: IP-Based Policies for Dynamic External APIs

Using CIDR-based egress policies for external SaaS APIs breaks silently when those APIs rotate their IP addresses (which happens routinely with CDN-backed services).

**Symptom**: External API calls fail intermittently, and the failure correlates with no code change. Usually noticed weeks or months after the policy was applied.

**Diagnosis**:
```bash
# Check if the external API's current IPs match the policy CIDR
kubectl exec test-pod -- nslookup api.stripe.com
# Compare the resolved IPs against your NetworkPolicy CIDR list
```

**Fix**: Use FQDN-based policies (Calico Cloud/Enterprise) for external SaaS endpoints, or switch to Open Source and accept that IP-based policies require active maintenance for dynamic endpoints.

## Mistake 3: Egress Policy Missing ICMP

ICMP traffic is used for `ping`, traceroute, and MTU path discovery. Deny-all egress policies that do not explicitly allow ICMP break these diagnostic tools and can also interfere with TCP's path MTU discovery mechanism.

**Fix**: Allow ICMP explicitly if diagnostic tools or MTU discovery are required:

```yaml
egress:
- action: Allow
  protocol: ICMP
  destination:
    nets:
    - 0.0.0.0/0
```

## Mistake 4: Egress Gateway Not Covering All Namespaces

When deploying egress gateways, teams sometimes configure them only for specific namespaces and forget that other namespaces still use node SNAT. This creates inconsistent source IPs — some traffic comes from the gateway IP, some from node IPs — breaking external firewall rules.

**Symptom**: External service receives requests from multiple different source IPs, some of which are not in the allowlist.

**Fix**: Explicitly configure which namespaces use the egress gateway vs. SNAT, and document the expected source IP for each namespace.

## Mistake 5: Not Auditing Egress Before Applying Deny-All

Applying a deny-all egress policy without first auditing what external endpoints your workloads actually communicate with is the most dangerous operational mistake. It will immediately break legitimate workload connectivity and require emergency rollback.

**Prevention workflow**:

1. Enable Calico flow logs (Cloud/Enterprise) or network logging on nodes
2. Run workloads for at least one week to capture all regular and periodic external connections
3. Build allow rules for each observed legitimate destination
4. Apply deny-all policy in a test namespace first and confirm no legitimate traffic is blocked
5. Roll out namespace by namespace

```bash
# Observe current egress with calicoctl (Enterprise)
calicoctl get flowlogs --output=json | jq '.[] | select(.action=="allow") | .destName'
```

## Best Practices

- Always add DNS egress allow rules before any deny-all egress policy
- Use `netshoot` pod to diagnose egress failures: `kubectl exec debug-pod -- curl -v <endpoint>`
- Audit egress for at least one week before applying deny-all policy
- Set up monitoring alerts for denied egress traffic to catch policy gaps after rollout

## Conclusion

The most common Calico egress mistakes are forgotten DNS egress rules, IP-based policies for dynamic endpoints, missing ICMP allowances, incomplete egress gateway coverage, and applying deny-all without prior traffic auditing. Building a pre-enforcement audit workflow and including DNS egress in every policy template prevents the majority of these incidents.
