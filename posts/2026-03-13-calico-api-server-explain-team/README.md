# How to Explain the Calico API Server to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, API Server, CNI, Team Communication

Description: A practical guide for explaining Calico's API server concepts to engineering teams, covering why it exists and how it changes the resource management workflow.

---

## Introduction

Explaining the Calico API server to a team requires addressing one fundamental question first: "Why does Calico need its own API server when Kubernetes already has one?" The answer is about server-side defaulting, validation, and workflow unification - the aggregated Calico API server exposes Calico resources through Kubernetes' standard API machinery. For new Calico installations, also note that native `projectcalico.org/v3` CRDs are now available as the forward-looking path for managing the same APIs with `kubectl`.

This post gives you the framing and live demonstrations to explain the Calico API server clearly to developers, SREs, and platform engineers.

## Prerequisites

- A Calico cluster with the API server deployed
- `kubectl` and `calicoctl` configured
- Understanding of Kubernetes CRDs and API aggregation

## The Core Concept: Extending kubectl

Start with the outcome that matters to your team:

> "The Calico API server means you can manage Calico network policies using `kubectl` the same way you manage deployments and services. You don't need a separate tool (`calicoctl`) for most resource management work. You can use GitOps tools, RBAC, and audit logging for Calico resources the same way you do for everything else in Kubernetes."

Demonstrate this:

```bash
# With Calico API server - kubectl works natively

kubectl get networkpolicies.projectcalico.org -n production
kubectl apply -f calico-policy.yaml  # Uses projectcalico.org/v3
kubectl describe globalnetworkpolicies.projectcalico.org default-deny

# Also still works:
calicoctl get networkpolicies -n production
```

Both commands show the same resources. The API server enables the `kubectl` interface.

## Why Calico Has Its Own API Server

For developers and SREs who ask "why not just use CRDs?":

> "Historically, Calico used the aggregated API server to expose the full Calico API (`projectcalico.org/v3`) with the same defaulting and validation semantics that `calicoctl` provided. For example, in API-server mode, creating an IPPool with a CIDR that overlaps an existing pool is rejected synchronously. Native `projectcalico.org/v3` CRDs now let `kubectl` manage Calico resources without the aggregated API server, but Calico documents some behavioral differences, such as asynchronous IPPool CIDR overlap validation."

The practical difference in API-server mode: when you create an invalid Calico resource (for example, an IPPool with overlapping CIDRs or a policy with invalid selector syntax), the API server can return a clear error immediately rather than accepting the resource and surfacing the problem later through another controller or status path.

## The RBAC Integration Story

For platform engineers managing access control:

> "With the Calico API server, you can use Kubernetes RBAC to control who can create or modify Calico network policies. You can give application team members access to read policies in their namespace but not write them, or give a security team read-only access to GlobalNetworkPolicies. Native v3 CRDs also use Kubernetes RBAC, with the caveat that Calico's tier RBAC for GET, LIST, and WATCH is not enforced in native-CRD mode because admission webhooks cannot intercept read operations."

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

> "Every Calico policy change made through `kubectl` and the Kubernetes API path goes through the Kubernetes API server. This means policy creation, modification, or deletion can appear in the Kubernetes audit log - who made the change, when, and from where - when audit logging is configured to record those requests. This is essential for compliance audit trails."

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
A: Policy enforcement continues normally - Felix programs policy from Calico datastore state, not from the API server request path. The API server is only in the path for resource management operations, not for enforcement.

## Best Practices

- For existing API-server-mode clusters, keep the Calico API server monitored; for new installations, evaluate native `projectcalico.org/v3` CRDs because the aggregated API server is deprecated
- Use Kubernetes RBAC to control Calico resource access just as you do for native Kubernetes resources
- Include Calico API server health in your cluster monitoring

## Conclusion

The Calico API server enables unified `kubectl` management, Kubernetes RBAC integration, and audit logging for Calico resources. It is most impactful for teams that care about access control (who can create policies), compliance (audit trail for policy changes), and workflow consistency (no separate CLI tool for networking). Understanding these benefits helps the team make an informed decision about deploying and relying on the Calico API server.
