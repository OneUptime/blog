# Validation Summary: How to Troubleshoot Cloud Controller Manager IAM and API Permission Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes cloud-controller-manager (CCM)
- Kubernetes authorization and RBAC
- Kubernetes ServiceAccounts and impersonation
- Kubernetes status subresources
- Kubernetes Lease-based leader election
- `kubectl`, JSONPath, and `jq`
- Cloud IAM and workload identity federation
- Cloud provider audit logging
- HTTP and JWT error semantics

## Sources Consulted
- Kubernetes Cloud Controller Manager concepts and authorization: https://kubernetes.io/docs/concepts/architecture/cloud-controller/#authorization
- Kubernetes Cloud Controller Manager Administration: https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes authorization modes and request attributes: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes RBAC resource and subresource rules: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources
- Kubernetes user impersonation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes Leases and leader election: https://kubernetes.io/docs/concepts/architecture/leases/#leader-election
- Kubernetes CCM leader-migration Lease permissions: https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/#grant-access-to-migration-lease
- Kubernetes `client-go` LeaseLock implementation: https://github.com/kubernetes/client-go/blob/master/tools/leaderelection/resourcelock/leaselock.go
- Kubernetes cloud-provider interfaces for instances, routes, and load balancers: https://github.com/kubernetes/cloud-provider/blob/master/cloud.go
- Kubernetes ServiceAccounts and token validation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes projected ServiceAccount token volumes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection
- Kubernetes Secret update behavior: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- jq 1.6 optional iterator documentation: https://jqlang.org/manual/v1.6/#array-object-value-iterator
- GKE Workload Identity Federation credential flow: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- AKS Microsoft Entra Workload ID: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Amazon EKS IAM roles for ServiceAccounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS CloudTrail event coverage: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-events.html
- Google Cloud Audit Logs coverage: https://cloud.google.com/logging/docs/audit
- Azure Activity Log coverage: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log
- AWS IAM policy simulator limitations: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html
- RFC 9110, HTTP semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 6585, HTTP 429 semantics: https://www.rfc-editor.org/rfc/rfc6585.html
- RFC 7519, JWT time and audience claims: https://www.rfc-editor.org/rfc/rfc7519.html

## Issues Found
- The post treated RBAC as Kubernetes' only authorization mechanism. Kubernetes supports multiple authorizers, so I changed the opening and error-classification table to refer to Kubernetes API authorization, noting that RBAC is the common implementation and that admission policy can separately reject write requests.
- The `kubectl auth can-i update nodes/status` and `update services/status` commands did not test status subresources. In `kubectl auth can-i`, `TYPE/NAME` denotes a named object, so those commands tested Nodes or Services named `status`. I changed them to use `--subresource=status` and added the documented `patch` checks for `nodes/status` and `services/status`.
- The `--as` examples omitted the requirement that the caller be authorized to impersonate the ServiceAccount. I added that prerequisite so an impersonation denial is not mistaken for a CCM authorization result.
- The Lease checks omitted `create`, which the standard LeaseLock needs when the shared leader-election Lease does not exist. The original name-less `get` and `update` checks could also report `no` for a valid least-privilege Role restricted with `resourceNames`. I added `create`, introduced an actual Lease-name placeholder for `get` and `update`, expanded the policy comparison to include namespaced Roles and RoleBindings, and clarified that replicas coordinate through a shared Lease.
- The `jq` filter used `.spec.volumes[]`, which fails with `Cannot iterate over null` for a valid Pod with no volumes. I changed it to the optional iterator `.spec.volumes[]?`.
- The post stated that cloud IAM denials should appear in audit logs and required an allowed audit record during verification. Audit coverage varies: some event categories are optional, some read operations are not logged by default, and retention or exclusions can remove records. I qualified the investigation, verification, and conclusion to use available audit data where the action is audited.
- The cloud-permission bullets presented one universal set of resource APIs. Provider implementations choose their underlying calls; for example, the Kubernetes Routes interface defines list, create, and delete but no universal update operation, and Service implementations do not all manage separate listeners, security groups, or health checks. I made the requirements explicitly provider- and feature-dependent while preserving the controller capabilities that must be satisfied.
- The identity diagnostics did not explicitly require the CCM's credential context, which could cause an operator's local identity to be reported instead. I added that requirement.
- The federated workload-identity checklist assumed an admission webhook and a token file in the CCM container. GKE can instead expose credentials through its node-local metadata server, while other providers use projected token files and webhooks. I made webhook requirements conditional and changed the check to cover either a token file or metadata endpoint. I also corrected the clock-skew check to cover API server hosts that issue tokens and nodes running the CCM.
- The claim that an IAM simulator or `can-i` result is necessary was too strong; simulators are not universal and neither check proves end-to-end reconciliation. I changed the statement to say that these checks can help but are not sufficient.

## Review Notes
- The post does not pin a Kubernetes or provider version. It was reviewed against the current Kubernetes v1.36 documentation, current upstream `client-go` and cloud-provider interfaces, and local `kubectl` v1.34.1 help. Provider release manifests and maintained policies remain the authoritative source for provider-added controllers and resources.
- All six links in the post's Official Documentation section resolve to the intended current Kubernetes pages.
- The remaining shell commands, JSONPath expression, `jq` object construction, controller descriptions, status-subresource separation, Secret rotation guidance, and HTTP error table are technically sound. The HTTP 404 and 429 guidance was cross-checked against RFC 9110 and RFC 6585.
- Example values such as `CCM_POD`, `ACTUAL_CCM_LEASE`, and `kube-system` must be replaced with the deployment's actual Pod, Lease, and namespace where they differ.
