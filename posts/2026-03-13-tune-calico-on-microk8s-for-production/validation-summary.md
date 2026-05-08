# Validation Summary: How to Tune Calico on MicroK8s for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s
- Kubernetes
- Calico
- Calico FelixConfiguration
- Prometheus metrics
- Kubernetes Services, ConfigMaps, and DaemonSets
- kubectl and calicoctl

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Configure resource requests and limits: https://docs.tigera.io/calico/latest/reference/configure-resources
- MicroK8s documentation: Addons: https://microk8s.io/docs/addons
- MicroK8s documentation: Command reference: https://microk8s.io/docs/command-reference
- Kubernetes documentation: Service: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kubectl commands: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The MTU ConfigMap patch omitted `--type merge`. Calico's manifest-based MTU documentation shows a merge patch for `calico-config`, so the command was updated to use `--type merge`.
- The Felix metrics Service used a normal ClusterIP Service and omitted `targetPort`. Calico's manifest-based monitoring example exposes Felix metrics with a headless Service and `targetPort: 9091`, so the Service manifest was updated accordingly.
- The MicroK8s Prometheus section claimed the addon installs Prometheus and Grafana and can scrape Felix metrics automatically. Current MicroK8s documentation describes the addon as deploying the Prometheus Operator, and Calico documentation still requires scrape configuration, so the sentence was corrected.
- The DaemonSet resource patch targeted `containers/0`, which depends on container ordering. The snippet was changed to a strategic merge patch keyed by the `calico-node` container name, matching Kubernetes patch behavior for container lists.

## Review Notes
- The FelixConfiguration fields used in the post are valid Calico configuration fields, but `bpfEnabled: false` and `ipv6Support: false` are environment-specific choices rather than universal production defaults.
- Calico's current documentation notes that MTU auto-detection is enabled by default. Explicit MTU configuration is still valid when operators need to override or pin the detected value.
