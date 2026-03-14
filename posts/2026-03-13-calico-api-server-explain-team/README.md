# How to Explain the Calico API Server to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, API Server, Team Communication, calicoctl, kubectl, CNI

Description: A practical guide for explaining Calico's API server concepts to engineering teams, covering why it exists and how it changes the resource management workflow.

---

## Introduction

Explaining the Calico API server to a team requires addressing one fundamental question first: "Why does Calico need its own API server when Kubernetes already has one?" The answer is about resource richness, validation, and workflow unification — the Calico API server exposes a richer, more validated version of Calico resources through Kubernetes' standard API machinery.

This post gives you the framing and live demonstrations to explain the Calico API server clearly to developers, SREs, and platform engineers.

## Prerequisites

- A Calico cluster with the API server deployed
- `kubectl` and `calicoctl` configured
- Understanding of Kubernetes CRDs and API aggregation

## The Core Concept: Extending kubectl

Start with the outcome that matters to your team:

> "The Calico API server means you can manage Calico network policies using `kubectl` the same way you manage deployments and services. You don't need a separate tool (`calicoctl`) for network policy work. You can use GitOps tools, RBAC, and audit logging for Calico resources the same way you do for everything else in Kubernetes."

Demonstrate this:

```bash
# With Calico API server — kubectl works natively
kubectl get networkpolicies.projectcalico.org -n production
kubectl apply -f calico-policy.yaml  # Uses projectcalico.org/v3
kubectl describe globalnetworkpolicies.projectcalico.org default-deny

# Also still works:
calicoctl get networkpolicies -n production
```

Both commands show the same resources. The API server enables the `kubectl` interface.

## Why Calico Has Its Own API Server

For developers and SREs who ask "why not just use CRDs?":

> "Kubernetes CRDs are great for basic resources but have limitations. The full Calico API (`projectcalico.org/v3`) has richer validation rules, better selector expression parsing, and additional resource types that don't map cleanly to CRDs. The Calico API server implements the full Calico specification in Go code, not just a YAML schema — it can validate things like 'this CIDR doesn't overlap with that one' that CRD schema validation can't."

The practical difference: when you write an invalid Calico policy (e.g., overlapping CIDRs, invalid selector syntax), the API server returns a clear error immediately rather than accepting the resource and failing silently later.

## The RBAC Integration Story

For platform engineers managing access control:

> "With the Calico API server, you can use Kubernetes RBAC to control who can create or modify Calico network policies. You can give application team members access to read policies in their namespace but not write them, or give a security team read-only access to GlobalNetworkPolicies. Without the API server, Calico resource access control is all-or-nothing via direct datastore access."

Show the RBAC configuration:

```yaml
# Allow a team to read but not write GlobalNetworkPolicies
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-reader
rules:
- apiGroups: ["projectcalico.org"]
  resources: ["globalnetworkpolicies", "networkpolicies"]
  verbs: ["get", "list", "watch"]
```

## The Audit Logging Story

For compliance and security teams:

> "Every Calico policy change goes through the Kubernetes API server when the Calico API server is enabled. This means every policy creation, modification, or deletion appears in the Kubernetes audit log — who made the change, when, and from where. This is essential for compliance audit trails."

Check audit log integration:
```bash
# In the API server audit log (location depends on cluster setup)
# Look for entries with apiGroup: projectcalico.org
grep "projectcalico" /var/log/kubernetes/audit.log | tail -5
```

## Common Questions

**Q: Do I still need calicoctl if the API server is enabled?**
A: Not for most operations. `calicoctl` provides some additional CLI features (like `calicoctl node status` and `calicoctl ipam show`) that don't have `kubectl` equivalents, but all resource management can be done via `kubectl`.

**Q: What happens to existing policies if the Calico API server goes down?**
A: Policy enforcement continues normally — Felix reads from the Kubernetes CRDs and datastore, not from the API server. The API server is only in the path for resource management operations, not for enforcement.

## Best Practices

- Enable the Calico API server in production to get RBAC and audit logging support
- Use Kubernetes RBAC to control Calico resource access just as you do for native Kubernetes resources
- Include Calico API server health in your cluster monitoring

## Conclusion

The Calico API server enables unified `kubectl` management, Kubernetes RBAC integration, and audit logging for Calico resources. It is most impactful for teams that care about access control (who can create policies), compliance (audit trail for policy changes), and workflow consistency (no separate CLI tool for networking). Understanding these benefits helps the team make an informed decision about deploying and relying on the Calico API server.
