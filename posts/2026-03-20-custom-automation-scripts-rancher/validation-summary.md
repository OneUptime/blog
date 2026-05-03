# Validation Summary: How to Create Custom Automation Scripts for Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (v3 management API + K8s proxy at `/k8s/clusters/<id>/...`)
- Kubernetes (Namespaces, Jobs, Pods, NetworkPolicies, RBAC ClusterRoleBindings, CronJob `batch/v1`)
- Python (`requests` library, custom API client class)
- Bash / kubectl (jsonpath output, field-selectors, xargs)
- YAML (Kubernetes CronJob manifests, Secret references)

## Sources Consulted
- [Rancher API — Projects](https://ranchermanager.docs.rancher.com/api/workflows/projects)
- [Rancher Project Resource Quotas — Resource Quota Type Reference](https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/resource-quota-types)
- [Rancher Project Resource Quotas — How they work](https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas)
- [Kubernetes — Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes — CronJob (`batch/v1` GA in 1.21+)](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes — RBAC API (`rbac.authorization.k8s.io/v1`)](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes — NetworkPolicy (`networking.k8s.io/v1`)](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [kubectl jsonpath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kubectl field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)

## Issues Found

1. **Misleading comment about "crash-looping pods" in the bash cleanup script.**
   The script uses `kubectl get pods --field-selector=status.phase=Failed`, but pods in `CrashLoopBackOff` remain in `Running` phase (they have `status.containerStatuses[*].state.waiting.reason=CrashLoopBackOff`). The phase selector only matches pods that have permanently failed (typically with `restartPolicy: Never`). I replaced the comment with one that clarifies this and warns the reader that `CrashLoopBackOff` pods will not be matched.

2. **Header comment on `cleanup_stale_resources.sh` did not describe what the script actually does.**
   The original comment said "Remove pods that have been in failed/completed state for >24h", but the script (a) deletes completed jobs older than 24h and (b) deletes pods in Failed phase with no age filter. I rewrote the header comment to accurately describe both behaviours.

## Review Notes

- `self.session.verify = False  # Set True in production` disables TLS verification by default. The author's inline note acknowledges this should be flipped in production, so it was left as-is, but readers should be aware that the code as written is unsafe without that change.
- `client.get(f'/v3/users?email={member_email}')` relies on filtering Rancher users by an `email` query parameter. Rancher's user objects expose authenticator-supplied identities through `principalIds` rather than a top-level `email` field by default; whether this filter works depends on the auth provider in use. Functionally fine for many setups but worth verifying in your environment.
- `roleTemplateId: 'project-member'` is a valid built-in Rancher project role template ID (others include `project-owner`, `project-readonly`).
- `apiVersion: batch/v1` for CronJob is correct for Kubernetes 1.21+ (GA). Earlier `batch/v1beta1` was removed in 1.25.
- Resource quota field names (`limitsCpu`, `limitsMemory`, `persistentVolumeClaims`) under `resourceQuota.limit` are correct per the Rancher project resource quota schema. Values like `'20'` (cores) are accepted; `'20000m'` is more conventional but both parse.
- `date -d "$completion_time"` requires GNU date (works on Linux; macOS users would need `gdate` from coreutils). Not a bug, just a portability caveat for the Rancher operator audience.
- The K8s proxy paths through Rancher (`/k8s/clusters/<id>/api/v1/...` and `/k8s/clusters/<id>/apis/...`) are the correct way to reach a downstream cluster's Kubernetes API via the Rancher server.
