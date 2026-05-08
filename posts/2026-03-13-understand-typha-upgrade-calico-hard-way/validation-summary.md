# Validation Summary: Understanding Typha Upgrades in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Typha
- Felix / calico-node
- calicoctl
- Kubernetes Deployments and DaemonSets
- kubectl
- Prometheus metrics

## Sources Consulted
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico hard-way Typha installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico calicoctl version command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico/Tigera recommended Typha Prometheus metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/

## Issues Found
- The post used `calicoctl version --client`, but the official `calicoctl version` reference does not document a `--client` flag. Changed it to `calicoctl version`.
- The post described `calicoctl` as matching the cluster's Calico API version. The official command output reports client and cluster Calico versions, so this was changed to say the cluster's Calico version.
- The post checked `typha_connections_active`, but the documented Typha metric for active streaming client connections is `typha_connections_streaming`. Updated both metric checks.
- The post claimed the sample GlobalNetworkPolicy verified policy enforcement and propagation. The commands only apply, read, and delete a policy object, so the wording was changed to API write/read validation.
- The post stated each Typha pod replacement takes about 45-60 seconds. This is environment-dependent, so the comment was changed to say timing depends on readiness and cluster conditions.

## Review Notes
The guide intentionally describes a manual, manifest-style component upgrade. Current Calico documentation recommends operator-based upgrades for many installations and, for raw manifest installations, documents applying the updated manifest as the supported upgrade path. The post remains useful as a low-level operational guide, but readers should still consult the release notes and installation-specific upgrade path for their Calico version.
