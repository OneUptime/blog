# How to Explain the Calico REST API to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, REST API, Team Communication, Automation, calicoctl

Description: A practical guide for explaining Calico's REST API concepts to engineering teams, covering use cases, authentication, and when REST API access is preferable to calicoctl.

---

## Introduction

Most Calico users never need to call the REST API directly — `kubectl` and `calicoctl` cover the vast majority of use cases. But for teams building automation, custom controllers, or CI/CD integrations, understanding the Calico REST API unlocks programmatic control of network policy without external CLI dependencies.

Explaining the REST API to your team means helping them understand when it is the right tool, how authentication works, and how to use it safely for automation.

## Prerequisites

- A Calico cluster with the API server deployed
- Team familiarity with REST APIs in general
- Understanding of Kubernetes service accounts and RBAC

## When to Use the REST API vs. calicoctl vs. kubectl

Frame the tool selection for your team:

| Tool | Best For |
|---|---|
| `kubectl` | Interactive management, GitOps (ArgoCD, Flux) |
| `calicoctl` | Calico-specific operations, BGP status, IPAM inspection |
| REST API | CI/CD automation, custom controllers, monitoring integrations |

The REST API is the right choice when you need to:
- Manage Calico resources from a CI/CD pipeline without installing kubectl or calicoctl
- Build a custom controller that watches and responds to Calico resource changes
- Integrate Calico policy management into an existing REST API gateway or service mesh control plane

## The Key Concept: It's Just the Kubernetes API

The most important thing to explain is that the Calico REST API is not a separate service:

> "The Calico REST API is just the Kubernetes API server serving the `projectcalico.org/v3` API group. You authenticate the same way you authenticate to Kubernetes — service account tokens, kubeconfig, OIDC. You use the same RBAC. You call the same HTTPS endpoint. It behaves exactly like any other Kubernetes API resource."

This is a huge simplification for teams already familiar with the Kubernetes API.

## Live Demonstration: REST API in Action

Show the team that `kubectl` and raw REST calls return the same data:

```bash
# Start kubectl proxy
kubectl proxy --port=8080 &

# kubectl approach
kubectl get globalnetworkpolicies.projectcalico.org

# REST API approach (same data)
curl -s http://localhost:8080/apis/projectcalico.org/v3/globalnetworkpolicies | \
  jq '.items[].metadata.name'
```

Both return the same list. The kubectl command is just a wrapper around the REST call.

## Explaining Authentication for Automation

For engineers building CI/CD integrations:

> "In your CI/CD pipeline, create a Kubernetes service account with only the permissions it needs — typically create/update/delete for NetworkPolicy in specific namespaces. Use `kubectl create token` to generate a short-lived token for each pipeline run. Pass that token in the Authorization header. This is more secure than shipping a kubeconfig file with a long-lived credential."

Example workflow:
```bash
# In CI/CD pipeline setup (one-time):
kubectl create serviceaccount ci-policy-manager -n ci-system
kubectl create rolebinding ci-policy-manager \
  --clusterrole=calico-policy-manager \
  --serviceaccount=ci-system:ci-policy-manager \
  -n production

# In CI/CD pipeline run (each run):
TOKEN=$(kubectl create token ci-policy-manager -n ci-system --duration=1h)
curl -s -k -H "Authorization: Bearer $TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/namespaces/production/networkpolicies
```

## Explaining Watches for Custom Controllers

For engineers building custom controllers:

```bash
# Watch for changes to GlobalNetworkPolicies
curl -s -k -H "Authorization: Bearer $TOKEN" \
  "$APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies?watch=true" | \
  while read -r line; do
    echo "Event: $(echo $line | jq -r '.type') - $(echo $line | jq -r '.object.metadata.name')"
  done
```

The watch endpoint returns a stream of change events — your controller can react in real time to policy additions, modifications, or deletions.

## Common Team Questions

**Q: Do I need the Calico API server deployed for REST API access?**
A: Yes — the `projectcalico.org/v3` API group is only available when the Calico API server is deployed. Without it, you can only access `crd.projectcalico.org/v1` resources.

**Q: Is the REST API stable across Calico versions?**
A: The `v3` API is versioned and stable within the Calico 3.x lifecycle. Breaking changes come with major version bumps (e.g., v4). Plan for updates when upgrading Calico major versions.

## Best Practices

- Never hard-code kubeconfig credentials in scripts — use service account tokens generated per pipeline run
- Always validate input before sending to the REST API to avoid 422 validation errors in production pipelines
- Use the `?dryRun=All` query parameter to test policy changes without applying them

## Conclusion

The Calico REST API is the same as the Kubernetes API — same server, same auth, same RBAC — just serving the `projectcalico.org/v3` API group. For teams building automation, explaining it as "Kubernetes API for Calico resources" removes the mystery and makes implementation straightforward. The key practices: use short-lived service account tokens, minimal RBAC, and always test with `dryRun` before applying in production.
