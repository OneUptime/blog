# Validation Summary: How to Schedule Rolling Restarts with Kubernetes CronJobs and Scoped RBAC

## Status
validated

## Post Type
Technical tutorial / operational guide with Kubernetes manifests and kubectl commands.

## Technologies Covered
- Kubernetes Deployments and rolling updates
- Kubernetes CronJobs and Jobs (`batch/v1`)
- ServiceAccounts and namespaced RBAC (`rbac.authorization.k8s.io/v1`)
- kubectl rollout, authorization checks, Job creation, and logs
- POSIX shell execution and container security contexts

## Sources Consulted
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) — named resource restrictions, list/watch selectors, RoleBindings, and default discovery permissions.
- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) — schedule, time zone, concurrency, missed-start deadline, history limits, suspension, and duplicate scheduling caveats.
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/) — retry limits, restart policy, active deadlines, and failure conditions.
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — template-triggered rollouts, availability, and progress deadlines.
- [kubectl rollout status reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/) — named resource syntax, watch behavior, timeout, and revision tracking.
- [kubectl rollout restart reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/) — restart syntax and inherited options.
- [Upstream rollout status implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/rollout/rollout_status.go) — list and watch requests use a `metadata.name` field selector for the named resource.
- [Upstream restart helper](https://raw.githubusercontent.com/kubernetes/kubectl/master/pkg/polymorphichelpers/objectrestarter.go) — Deployment template annotation updates and rejection of paused Deployments.
- [Upstream rollout status helper](https://raw.githubusercontent.com/kubernetes/kubectl/master/pkg/polymorphichelpers/rollout_status.go) — observed generation, updated/available replicas, and progress deadline failure checks.
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/) — resource/name syntax and service account impersonation.
- [kubectl create job reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/) — creating a Job from a CronJob.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — Job resource log lookup.
- [Configure a security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/) — non-root execution, group ownership, seccomp, capabilities, and read-only root filesystems.
- [Configure ServiceAccounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) — service account selection and in-Pod credentials.
- [Kubernetes volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir) — writable temporary storage using `emptyDir`.
- [Kubernetes version skew policy](https://kubernetes.io/releases/version-skew-policy/#kubectl) — supported kubectl/API server version combinations.
- [Author profile](https://github.com/nawazdhandala) — verified the linked author URL resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post contains substantive, technically relevant implementation guidance.
- Parsed both YAML blocks with PyYAML, covering the ServiceAccount, Role, RoleBinding, and CronJob. Checked the embedded container script with `/bin/sh -n` and both terminal command blocks with `/bin/bash -n`; all syntax checks passed. These are syntax checks, not API-server schema validation or live execution.
- The Role grants the read, list/watch, and patch operations needed for the named Deployment. Upstream status code supplies the required name selector. The post correctly explains that Deployment patch access is broader than restarting and that RBAC does not constrain individual patch fields.
- RBAC permissions are additive: the expected negative authorization checks assume no other applicable bindings grant additional access. The actual service account staging test remains important for validating effective access and the selected kubectl build.
- The precheck, restart, and final status command form a valid fail-fast shell sequence. An error stops subsequent commands. The Job-level deadline covers time outside the rollout watch, while the retry limit prevents ordinary retries after failure; neither setting guarantees exactly-once execution.
- CronJob time zone support is stable from Kubernetes 1.27; `batch/v1` CronJobs are stable from 1.21. The manifest uses stable APIs. Choose a kubectl version within one minor version of the API server, subject to the documented restrictions for mixed-version API servers.
- The upstream `master` source links are moving references. As the post requests, verify the field-selector behavior for the actual pinned kubectl release.
- `rollout status` follows the latest revision by default, including a rollout started by another actor during the wait. The post appropriately describes the precheck as no lock and calls out external coordination when needed.
- The tooling image is explicitly illustrative and must be replaced with a reviewed digest-pinned image that supports the specified UID, shell, kubectl, and filesystem restrictions. Image availability and runtime compatibility were not tested.
- The manual test commands are valid, but log retrieval can need repeating while the Pod starts, and `get job` is a snapshot rather than a completion wait. The post explicitly requires reviewing the Job failure condition and application health. The example CronJob is active on application unless suspended; a controlled test should account for the schedule as instructed.
- All external Markdown links were checked. No production commands were executed, no cluster resources were changed, and no live rollout or authorization test was performed. Application readiness, capacity, shutdown behavior, admission policies, and cluster-specific permissions require the staging verification described in the post.
