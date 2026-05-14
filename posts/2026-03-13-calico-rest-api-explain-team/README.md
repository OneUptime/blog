# How to Explain the Calico REST API to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, REST API, CNI, Team Communication

Description: A practical guide for explaining Calico's REST API concepts to engineering teams, covering use cases, authentication, and when REST API access is preferable to calicoctl.

---

## Introduction

Most Calico users never need to call the REST API directly - `kubectl` and `calicoctl` cover the vast majority of use cases. But for teams building automation, custom controllers, or CI/CD integrations, understanding the Calico REST API unlocks programmatic control of network policy without external CLI dependencies.

Explaining the REST API to your team means helping them understand when it is the right tool, how authentication works, and how to use it safely for automation.

## Prerequisites

- A Calico cluster exposing `projectcalico.org/v3` resources, either through the Calico API server or native v3 CRDs
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

The most important thing to explain is that the Calico REST API is exposed through the Kubernetes API endpoint:

> "The Calico REST API is the Kubernetes API endpoint serving the `projectcalico.org/v3` API group. Depending on your Calico installation, those resources are served by the aggregated Calico API server or by native v3 CRDs. You authenticate the same way you authenticate to Kubernetes - service account tokens, kubeconfig, OIDC. You use Kubernetes RBAC. You call the same HTTPS endpoint. It behaves like other Kubernetes API resources from the client side."

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

> "In your CI/CD pipeline, create a Kubernetes service account with only the permissions it needs - typically create/update/delete for NetworkPolicy in specific namespaces. Use `kubectl create token` to generate a short-lived token for each pipeline run. Pass that token in the Authorization header. This is more secure than shipping a kubeconfig file with a long-lived credential."

Example workflow:
```bash
# In CI/CD pipeline setup (one-time):
kubectl create serviceaccount ci-policy-manager -n ci-system
kubectl create role calico-policy-manager \
  --verb=get,list,watch,create,update,patch,delete \
  --resource=networkpolicies.projectcalico.org \
  -n production
kubectl create rolebinding ci-policy-manager \
  --role=calico-policy-manager \
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

The watch endpoint returns a stream of change events - your controller can react in real time to policy additions, modifications, or deletions.

## Common Team Questions

**Q: Do I need the Calico API server deployed for REST API access?**
A: It depends on the installation mode. In API server mode, yes - the `projectcalico.org/v3` API group is served by the Calico API server. In native v3 CRD mode, `projectcalico.org/v3` resources are Kubernetes CRDs and do not require the aggregated Calico API server.

**Q: Is the REST API stable across Calico versions?**
A: The `projectcalico.org/v3` API is versioned. Plan to review Calico release notes and API changes when upgrading Calico, especially across major versions or when moving between API server mode and native v3 CRDs.

## Best Practices

- Never hard-code kubeconfig credentials in scripts - use service account tokens generated per pipeline run
- Always validate input before sending to the REST API to avoid 422 validation errors in production pipelines
- Use the `?dryRun=All` query parameter to test policy changes without applying them

## Conclusion

The Calico REST API is accessed through the Kubernetes API endpoint - same client auth model, same Kubernetes RBAC, and the `projectcalico.org/v3` API group. For teams building automation, explaining it as "Kubernetes API for Calico resources" removes the mystery and makes implementation straightforward. The key practices: use short-lived service account tokens, minimal RBAC, and always test with `dryRun` before applying in production.
