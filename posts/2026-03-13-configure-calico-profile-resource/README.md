# Configure Calico Profile Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Profiles, Configuration, Security

Description: How to configure Calico Profile resources to define reusable policy rule sets and labels applied to workload endpoints, enabling policy inheritance patterns for consistent security postures across...

---

## Introduction

Calico Profile resources group workload endpoints so they can inherit shared labels and, for legacy configurations, profile policy rules. Profiles are automatically created for Kubernetes namespaces and are used to propagate namespace-level labels to all endpoints within that namespace. Understanding Profile configuration is important when working with non-Kubernetes workloads, legacy deployments, or when troubleshooting how label inheritance affects policy evaluation.

In Kubernetes deployments, Profiles are primarily managed automatically - but understanding their structure helps with advanced troubleshooting and non-Kubernetes Calico deployments.

## Prerequisites

- Calico installed
- `calicoctl` with cluster admin access
- Understanding of Calico policy evaluation order (NetworkPolicies and GlobalNetworkPolicies take precedence over profiles; a `Pass` action can jump to profile processing)

## Step 1: View Existing Profiles

```bash
# List all profiles

calicoctl get profiles

# In Kubernetes, profiles correspond to namespaces
calicoctl get profile kns.production -o yaml
```

Profile names for Kubernetes namespaces follow the pattern `kns.<namespace-name>`.

## Step 2: Understand Profile Structure

```yaml
apiVersion: projectcalico.org/v3
kind: Profile
metadata:
  name: kns.production
spec:
  # Labels applied to all endpoints in this profile
  labelsToApply:
    pcns.projectcalico.org/name: production
  # Ingress/egress rules (deprecated; prefer NetworkPolicy or GlobalNetworkPolicy)
  ingress:
    - action: Allow
      source:
        selector: pcns.projectcalico.org/name == 'production'
  egress:
    - action: Allow
```

## Step 3: Create a Custom Profile for Non-Kubernetes Workloads

For bare-metal or VM workloads managed directly by Calico (not Kubernetes):

```yaml
apiVersion: projectcalico.org/v3
kind: Profile
metadata:
  name: database-servers
spec:
  labelsToApply:
    role: database
    tier: data
  ingress:
    - action: Allow
      source:
        selector: "role == 'application'"
      destination:
        ports: [5432]
    - action: Deny
  egress:
    - action: Allow
      destination:
        selector: "role == 'application'"
    - action: Allow
      destination:
        nets: [10.0.0.1/32]  # Internal DNS
        ports: [53]
    - action: Deny
```

```bash
calicoctl apply -f database-servers-profile.yaml
```

## Step 4: Apply Profile to a WorkloadEndpoint

```bash
# Apply the profile to a specific workload endpoint
calicoctl get workloadendpoint --all-namespaces -o yaml | grep -A5 "db-server"

# Patch the workload endpoint to use the profile
calicoctl patch workloadendpoint db-server-eth0 --namespace <namespace> \
  --patch='{"spec":{"profiles":["database-servers"]}}'
```

```mermaid
graph LR
    A[WorkloadEndpoint] -->|profiles field| B[Profile: database-servers]
    B -->|labelsToApply| C[Adds role=database to endpoint]
    B -->|ingress rules| D[Allow from application tier]
    B -->|egress rules| E[Allow to application tier + DNS]
    C -->|enables| F[Policy selectors match this endpoint]
```

## Step 5: Verify Profile Application

```bash
# Verify profile exists and has correct spec
calicoctl get profile database-servers -o yaml

# Verify workload endpoint is using the profile
calicoctl get workloadendpoint -A -o yaml | grep -B5 "database-servers"
```

## Conclusion

Calico Profile resources provide label inheritance and legacy default policy rules for workload endpoints. In Kubernetes deployments, profiles are auto-managed for namespaces and rarely need manual configuration. For non-Kubernetes workloads or advanced policy designs, profiles enable reusable labels and legacy policy rules that can be assigned to multiple workload endpoints. The key operational detail is that NetworkPolicies and GlobalNetworkPolicies take precedence over Profile rules, making profile rules suitable for legacy default allow/deny fallbacks rather than primary security controls.
