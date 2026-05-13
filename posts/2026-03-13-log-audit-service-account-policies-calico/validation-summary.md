# Validation Summary: How to Log and Audit Calico Service Account-Based Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Calico service account-based policy matching
- Calico FelixConfiguration flow log settings
- Calico Cloud / Enterprise file-based flow logs
- Calico Open Source Goldmane / Whisker flow logs
- Kubernetes audit policy
- Kubernetes workloads and ServiceAccounts

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico Cloud FelixConfiguration resource reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Open Source flow log enablement with Goldmane / Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source flow log data types: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Cloud flow log data types: https://docs.tigera.io/calico-cloud/observability/elastic/flow/datatypes
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The introduction and diagram stated or implied that every Calico flow log directly includes the source service account. Current Calico flow log docs show source workload, namespace, labels, policy context, and action fields, but not a guaranteed source service account field. I changed the wording to describe an identity-aware trail that correlates source workload, matching service account-based policies, and Kubernetes audit data.
- The prerequisites treated flow logging as a generic Calico v3.26+ feature. Current Calico Open Source uses Goldmane / Whisker for flow logs, while the file-based Felix flow log settings used by the post are documented for Calico Cloud / Enterprise. I added that edition-specific caveat.
- The FelixConfiguration patch used `flowLogsEnabled`, which is not the documented file-flow-log setting. I changed it to `flowLogsFileEnabled` and added `flowLogsFileIncludeLabels` and `flowLogsFileIncludePolicies` so the resulting logs contain useful workload and policy context.
- The policy example used `source.serviceAccountSelector`, which is not the Calico EntityRule schema. Rule-level service account matching uses `source.serviceAccounts.names` or `source.serviceAccounts.selector`. I changed the example to `source.serviceAccounts.selector` and used the documented `projectcalico.org/name` label to match by service account name.
- The Kubernetes audit policy omitted `update` for ServiceAccounts and only watched Deployments for workload service account assignment changes. I added `update` and included Pods plus common workload controllers in the `apps` and `batch` API groups.
- The correlation command searched for a non-documented `src_service_account` field under `/var/log/calico/flow-logs`. I changed it to parse denied Calico file-flow-log entries from the documented default `/var/log/calico/flowlogs` directory by source namespace and workload name.
- The conclusion said audit logs show who was granted a service account, which would require auditing RBAC binding changes in addition to ServiceAccounts and workload specs. I changed it to say the audit trail shows service account changes and workload service account assignments.

## Review Notes
- Calico Open Source flow logs in Goldmane / Whisker are documented as tech preview in the current docs.
- For a fuller compliance audit, a future version could also audit Role, ClusterRole, RoleBinding, and ClusterRoleBinding changes because those determine what permissions a ServiceAccount has.
