# Validation Summary: How to Debug vCluster Syncer Lag, Watch Timeouts, and `403 Forbidden` API Calls

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- vCluster 0.36 on shared Kubernetes nodes
- Kubernetes API LIST/WATCH behavior and API health endpoints
- Kubernetes RBAC, ServiceAccounts, impersonation, and admission control
- `kubectl` troubleshooting commands
- vCluster logging, synchronization, and generated Helm RBAC

## Sources Consulted

- [vCluster synchronization documentation](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster ConfigMap synchronization documentation](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/core/config-maps)
- [vCluster annotations and labels reference](https://www.vcluster.com/docs/vcluster/reference/annotations)
- [vCluster control-plane logging](https://www.vcluster.com/docs/vcluster/manage/logging)
- [vCluster debug logging](https://www.vcluster.com/docs/vcluster/learn-how-to/control-plane/container/enable-debug-logging)
- [vCluster RBAC configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/rbac)
- [vCluster service replication documentation](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/networking/replicate-services)
- [vCluster v0.36.0 chart defaults and templates](https://github.com/loft-sh/vcluster/tree/v0.36.0/chart)
- [vCluster v0.36.0 ConfigMap syncer implementation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/configmaps/to_host_syncer.go)
- [vCluster v0.36.0 host-client configuration](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/setup/config/config.go)
- [Kubernetes API concepts: watches and resource versions](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes authorization overview](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes Event API migration notes](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event-v125)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)

## Issues Found

- A standalone ConfigMap is not synced with vCluster 0.36 defaults because `sync.toHost.configMaps.all` is `false`. Added the documented `vcluster.loft.sh/force-sync=true` annotation so the canary actually appears on the control plane cluster.
- The host ConfigMap command selected managed objects but did not expose the original tenant metadata it claimed to use. Scoped the management label to the `team-a` release and added YAML output so the original-name and original-namespace annotations are visible.
- Event sorting used deprecated `.lastTimestamp`. Replaced it with the current `kubectl events --all-namespaces` command.
- The post treated `SyncWarning` and `SyncError` as deterministic policy failures. Clarified that their messages can also represent API, authorization, or transient reconciliation errors and must be classified from the event text.
- Log commands did not select the vCluster `syncer` container, making them ambiguous when sidecars or plugins are present. Added `-c syncer` to both current and previous log commands.
- Watch handling implied that every disconnect requires a relist and treated an idle reconnected watch with no object events as failed. Clarified that a client can resume from the last resource version, while `410 Gone` requires a fresh LIST, and changed the failure signal to unsuccessful LIST/WATCH re-establishment.
- The host API path was described as using in-cluster DNS. vCluster 0.36 uses in-cluster client configuration based on the Kubernetes Service address, so the guidance now checks that route and only includes DNS when the configured endpoint is a hostname.
- The post stated that every `403 Forbidden` was an authorization denial. Added the distinction that admission policies and webhooks can also return 403, and clarified that `kubectl auth can-i` tests only authorization.
- The managed ServiceAccount failure mode implied that selecting a custom account alone loses permissions. Clarified that the failure occurs when automatic RBAC is disabled and the managed account lacks equivalent permissions.
- Corrected the cluster-wide extra-rule path from `clusterRole.extraRules` to `rbac.clusterRole.extraRules`, and clarified cross-namespace service replication can require both read and write permissions.

## Review Notes

- The post is intentionally version-specific. vCluster 0.36 chart defaults and tagged source were checked in addition to the current official documentation.
- The remaining commands and configuration fields were verified as valid, including the readiness endpoints, impersonated `kubectl auth can-i` checks, JSON logging, and the `DEBUG` environment variable.
- All external links in the post resolved successfully on the validation date.
