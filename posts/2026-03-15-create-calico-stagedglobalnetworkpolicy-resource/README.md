# How to Create the Calico StagedGlobalNetworkPolicy Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedGlobalNetworkPolicy, Kubernetes, Networking, Security, Network Policy, DevOps

Description: Learn how to create Calico StagedGlobalNetworkPolicy resources to test and preview network policies before enforcing them in production.

---

## Introduction

The StagedGlobalNetworkPolicy resource in Calico lets you preview the effect of a network policy without actually enforcing it. Staged policies are evaluated against traffic but only log their verdicts rather than allowing or denying packets. This gives you confidence that a new policy will behave as expected before you promote it to an enforced GlobalNetworkPolicy.

Deploying network policies in production is risky. A misconfigured rule can block legitimate traffic and cause outages. Staged policies eliminate this risk by providing an audit trail of what the policy would have done without affecting any actual traffic flow.

This guide covers creating StagedGlobalNetworkPolicy resources, understanding their evaluation behavior, and promoting them to enforced policies after validation.

## Prerequisites

- A Kubernetes cluster with Calico Enterprise or Calico Cloud (staged policies require the enterprise features)
- `kubectl` and `calicoctl` configured with cluster admin access
- Calico flow logs enabled to observe staged policy verdicts
- Familiarity with Calico GlobalNetworkPolicy syntax

## Understanding Staged Policies

A StagedGlobalNetworkPolicy has the same spec as a GlobalNetworkPolicy but with key differences in behavior:

- Traffic matching a staged policy is logged but not enforced
- Staged policies appear in flow logs with a staged verdict
- They can be promoted to enforced GlobalNetworkPolicy when validated
- Multiple staged policies can be tested simultaneously

## Creating a Basic Staged Policy

Start with a simple staged policy that would deny all ingress to a set of pods:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: staged.deny-unauthorized-ingress
spec:
  tier: default
  order: 100
  selector: app == "web-frontend"
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        selector: app == "api-gateway"
      protocol: TCP
      destination:
        ports: [8080, 8443]
    - action: Deny
```

Apply the staged policy:

```bash
calicoctl apply -f staged-policy.yaml
```

## Creating a Staged Default-Deny Policy

Test a cluster-wide default deny before enforcing it:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: staged.default-deny-all
spec:
  tier: default
  order: 1000
  selector: all()
  types:
    - Ingress
    - Egress
  ingress:
    - action: Deny
  egress:
    - action: Deny
```

This is the safest way to test a default-deny posture. The flow logs will show every connection that would be blocked, allowing you to create Allow rules before enforcing the deny.

## Creating a Staged Policy with Namespace Selectors

Test policies that span namespaces:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: staged.isolate-production
spec:
  tier: security
  order: 50
  namespaceSelector: environment == "production"
  types:
    - Ingress
    - Egress
  ingress:
    - action: Allow
      source:
        namespaceSelector: environment == "production"
    - action: Deny
  egress:
    - action: Allow
      destination:
        namespaceSelector: environment == "production"
    - action: Allow
      protocol: UDP
      destination:
        nets: ["10.96.0.10/32"]
        ports: [53]
    - action: Deny
```

This staged policy would isolate production namespaces from non-production while allowing DNS resolution.

## Creating a Staged Policy for CIDR-Based Rules

Test external traffic restrictions:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: staged.restrict-external-egress
spec:
  tier: default
  order: 200
  selector: app == "backend-api"
  types:
    - Egress
  egress:
    - action: Allow
      destination:
        nets: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        nets: ["203.0.113.0/24"]
        ports: [443]
    - action: Deny
```

This allows internal traffic, DNS, and HTTPS to a specific external range while denying all other egress.

## Creating a Staged Policy with Service Account Rules

Use service accounts as policy selectors:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: staged.sa-based-access
spec:
  tier: default
  order: 150
  selector: all()
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        serviceAccounts:
          names: ["monitoring-agent", "log-collector"]
      protocol: TCP
      destination:
        ports: [9090, 9100]
    - action: Pass
```

The Pass action delegates to the next policy in the chain rather than making a final verdict.

## Reviewing Staged Policy Impact

After deploying staged policies, review their impact through flow logs:

```bash
# Check flow logs for staged policy verdicts
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 | grep -i staged

# Use calicoctl to list staged policies
calicoctl get stagedglobalnetworkpolicies -o wide
```

Look for entries that show what the staged policy would have allowed or denied. Use this data to refine rules before promoting.

## Promoting a Staged Policy

Once validated, convert the staged policy to an enforced one:

```bash
# Export the staged policy
calicoctl get stagedglobalnetworkpolicy staged.deny-unauthorized-ingress -o yaml > enforced-policy.yaml
```

Edit the file to change the kind and remove the `staged.` prefix from the name:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-unauthorized-ingress
spec:
  tier: default
  order: 100
  selector: app == "web-frontend"
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        selector: app == "api-gateway"
      protocol: TCP
      destination:
        ports: [8080, 8443]
    - action: Deny
```

Apply the enforced policy and delete the staged version:

```bash
calicoctl apply -f enforced-policy.yaml
calicoctl delete stagedglobalnetworkpolicy staged.deny-unauthorized-ingress
```

## Verification

Verify your staged policies are correctly deployed and being evaluated:

```bash
# List all staged policies
calicoctl get stagedglobalnetworkpolicies

# View details of a specific staged policy
calicoctl get stagedglobalnetworkpolicy staged.default-deny-all -o yaml

# Check that the policy tier exists
calicoctl get tiers

# Generate test traffic and check flow logs
kubectl exec -n default deploy/test-client -- wget -qO- --timeout=5 http://web-frontend:8080
```

## Troubleshooting

- If staged policies do not appear in flow logs, verify that Calico flow logging is enabled in the FelixConfiguration
- Staged policies must use valid tier names. Check available tiers with `calicoctl get tiers`
- The naming convention `staged.` prefix is recommended but not enforced. Use consistent naming to distinguish staged from enforced policies
- If the staged policy selector matches no endpoints, it will have no observable effect. Verify selectors with `calicoctl get workloadendpoints -o wide`
- StagedGlobalNetworkPolicy requires Calico Enterprise or Calico Cloud. Open-source Calico does not support staged policies

## Conclusion

StagedGlobalNetworkPolicy resources provide a safe way to test network policies before enforcement. By deploying policies in staged mode first, reviewing flow logs for their predicted impact, and only promoting validated policies, you eliminate the risk of accidental traffic disruption. Make staged policy testing a standard part of your network policy deployment workflow to maintain reliable production connectivity.
