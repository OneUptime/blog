# Validation Summary: How to Sleep and Wake an Idle vCluster Without Breaking Ingress Wakeups

## Status

validated

## Post Type

Technical operations guide / Kubernetes cost-optimization tutorial

## Technologies Covered

- vCluster 0.36 Auto Sleep and the vCluster CLI
- vCluster Platform 4.11 sleep mode and management API
- Kubernetes Deployments, StatefulSets, Services, namespaces, and label selectors
- Kubernetes Ingress and ingress controllers
- Kubernetes Gateway API v1.5, GatewayClass, Gateway, and HTTPRoute
- Gateway API HTTP request mirroring

## Sources Consulted

- [vCluster 0.36: Auto Sleep configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sleep)
- [vCluster 0.36: Manual sleep and wakeup](https://www.vcluster.com/docs/vcluster/manage/sleep-wakeup)
- [vCluster 0.36 CLI: `vcluster create`](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster 0.36 CLI: `vcluster platform sleep vcluster`](https://www.vcluster.com/docs/vcluster/cli/vcluster_platform_sleep_vcluster)
- [vCluster 0.36 CLI: `vcluster platform wakeup vcluster`](https://www.vcluster.com/docs/vcluster/cli/vcluster_platform_wakeup_vcluster)
- [vCluster 0.36: Ingress synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/ingresses)
- [vCluster 0.36: Gateway API synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/gateway-api)
- [vCluster 0.36: Gateway API prerequisites and routing models](https://www.vcluster.com/docs/vcluster/key-features/gateway-api)
- [vCluster Platform 4.11: Auto sleep and inactivity detection](https://www.vcluster.com/docs/platform/use-platform/virtual-clusters/key-features/sleep-mode)
- [vCluster Platform 4.11: Annotations and labels reference](https://www.vcluster.com/docs/platform/reference/platform-annotations)
- [vCluster Platform: Access the management API](https://www.vcluster.com/docs/platform/api/use-api)
- [vCluster Platform 4.11: Connected-cluster context troubleshooting](https://www.vcluster.com/docs/platform/troubleshoot/connected-cluster-connectivity)
- [vCluster Platform 4.11: Platform upgrade and project-namespace prefix](https://www.vcluster.com/docs/platform/maintenance/upgrade-migrate/upgrade)
- [vCluster v0.36.0 tagged configuration schema](https://github.com/loft-sh/vcluster/blob/v0.36.0/chart/values.schema.json)
- [vCluster v0.36.0 tagged Platform sleep command](https://github.com/loft-sh/vcluster/blob/v0.36.0/cmd/vclusterctl/cmd/platform/sleep/vcluster.go)
- [Gateway API: HTTP request mirroring](https://gateway-api.sigs.k8s.io/guides/user-guides/http-request-mirroring/)
- [Gateway API v1.5 specification](https://gateway-api.sigs.k8s.io/reference/api-spec/1.5/spec/)
- [Kubernetes: ingress-nginx retirement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)

## Issues Found

- The post described the no-agent case as “standalone,” but vCluster 0.36 uses Standalone for a distinct control-plane deployment mode that is outside this guide's containerized Shared Nodes scope. Changed the wording to distinguish agentless instances from Platform-agent-connected instances.
- The `VirtualClusterInstance` inspection command used the connected host context even though that resource belongs to the Platform management API. It also hard-coded the legacy `loft-p-` project prefix even though Platform 4.x defaults to `p-`. Added `vcluster platform connect management`, changed the example to `p-PROJECT`, retained the host context only for the connected-cluster namespace, and documented legacy or custom prefixes.
- The Gateway API section assumed that a host `HTTPRoute` existed but omitted that Gateway API synchronization is disabled by default. Added the vCluster 0.36 `sync.toHost.gatewayApi.httpRoutes.enabled` configuration and stated that an imported control-plane Gateway/GatewayClass or synchronized tenant-created Gateway must also be configured.
- The Gateway API prerequisites did not specify the vCluster 0.36 requirement for Gateway API CRDs v1.5.0 or later, and the feature-status check was vague. Added the CRD version requirement and the exact `.status.supportedFeatures[].name` value `HTTPRouteRequestMirror`.
- The manual-sleep explanation categorically said that a manually sleeping Platform cluster never wakes automatically. vCluster 0.36 documents `vcluster connect` as a wake path, while `--prevent-wakeup` controls whether that wake is temporarily or indefinitely blocked. Corrected the wording and separated what a manual restoration test proves from the full inactivity-plus-ingress-wakeup test.

## Review Notes

- The original `sleep.auto.afterInactivity`, `sleep.auto.exclude.selector.labels`, and `sync.toHost.ingresses.enabled` fields are valid against the vCluster 0.36.0 chart schema. The shown `vcluster create` flags and Platform sleep/wakeup commands are also valid for vCluster 0.36.
- Omitting the legacy top-level `pro: true` field is correct in vCluster 0.36; Enterprise feature use is inferred, and the old switch is documented in the tagged source as no longer intended for users.
- The Enterprise-only, pre-production, containerized Shared Nodes, agentless-versus-agent-managed control-plane, direct-API activity-tracking, ingress-controller exclusion, cold-start, and annotation claims are technically correct for the stated versions.
- Gateway API `RequestMirror` is an Extended feature, so serving an HTTPRoute does not by itself prove that a controller supports the mirror rule Platform needs for HTTP wakeup.
- The dedicated manual-sleep guide and the broader Auto Sleep page contain inconsistent wording about automatic wakeup. The corrected post uses the behavior supported by the CLI: explicit wakeup always remains available, `vcluster connect` can wake the cluster by default, and `--prevent-wakeup` can block that convenience wake.
- The post's ingress-nginx deprecation warning is correct. Upstream ingress-nginx reached retirement in March 2026, strengthening the recommendation to choose another maintained controller or Gateway API for new deployments.
- All external links in the post resolved to the intended official documentation during validation.
