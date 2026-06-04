# Validation Summary: How to Deploy Linkerd with High-Availability Control Plane on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Kubernetes
- Linkerd CLI
- Linkerd Helm chart values
- Pod anti-affinity
- PodDisruptionBudgets
- HorizontalPodAutoscaler
- Prometheus metrics

## Sources Consulted
- Linkerd High Availability documentation: https://linkerd.io/docs/features/ha/
- Linkerd CLI install reference: https://linkerd.io/docs/reference/cli/install/
- Linkerd CLI upgrade reference: https://linkerd.io/docs/reference/cli/upgrade/
- Linkerd CLI multicluster reference: https://linkerd.io/2.17/reference/cli/multicluster/
- Linkerd Helm installation documentation: https://linkerd.io/docs/tasks/install-helm/
- Linkerd control plane chart values and HA values: https://github.com/linkerd/linkerd2/tree/main/charts/linkerd-control-plane
- Linkerd proxy metrics reference: https://linkerd.io/docs/reference/proxy-metrics/
- Linkerd certificate rotation and expiry documentation: https://linkerd.io/docs/tasks/automatically-rotating-control-plane-tls-credentials/
- Kubernetes pod affinity and anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The Linkerd values file used invalid or ineffective chart keys for component-specific replicas and resources. Replaced nested `identity.replicas`, `destination.replicas`, `proxyInjector.replicas`, and nested `resources` values with current Linkerd chart keys: `controllerReplicas`, `identityResources`, `destinationResources`, and `proxyInjectorResources`.
- The identity issuer scheme was set to `kubernetes.io/tls`, but Linkerd's default issuer scheme is `linkerd.io/tls`. Updated the value.
- The HA webhook failure policy was set to `Ignore`, but Linkerd HA mode uses `Fail` to prevent annotated workloads from being admitted without proxy injection. Updated the value and kept HA mode explicit with `highAvailability: true`.
- The install command skipped CRD installation and did not use Linkerd's documented `--ha` flag. Added `linkerd install --crds` and changed the install command to `linkerd install --ha --values ...`.
- The manual anti-affinity snippet reversed Linkerd's HA defaults and was written as an incomplete Deployment manifest. Converted it to a Deployment affinity fragment and corrected the rule semantics: required anti-affinity by hostname, preferred spreading by zone.
- The resource sizing examples used `controllerResources` generically for all scale cases. Updated the examples to `destinationResources`, which matches the component most directly affected by service discovery scale.
- The PodDisruptionBudget section implied PDBs must be created manually even though Linkerd can create them via chart values. Added that caveat and kept the manual manifests for externally managed PDBs.
- The monitoring command referenced `svc/linkerd-prometheus` in the `linkerd` namespace. Current Linkerd uses the Viz extension Prometheus service in `linkerd-viz`, so the command now installs Viz and port-forwards `svc/prometheus`.
- Several Prometheus metric names in the post were not verified as current Linkerd metrics. Replaced them with documented proxy certificate metrics: `identity_cert_refresh_count` and `identity_cert_expiration_timestamp_seconds`.
- The multicluster section overstated multicluster as a standby control plane for another cluster. Clarified that multicluster mirrors services and does not make one control plane a live fallback for another.
- The certificate expiry alert used an unverified issuer expiry metric. Replaced it with the documented proxy certificate expiration metric.
- The backup section referenced `linkerd-config`, which is not the current control plane configuration backup target for CLI-managed installs. Replaced it with `linkerd-identity-trust-roots` and `linkerd-config-overrides`.
- The failure testing section claimed new deployments use cached config. Corrected it to state that new deployments may fail to inject proxies or obtain identity certificates while the control plane is unavailable.
- The upgrade example used an unsupported `linkerd upgrade --version stable-2.14.0` pattern and a stale fixed version. Replaced it with `linkerd upgrade --ha`, which is documented for preserving/enabling HA mode during upgrades.

## Review Notes
The post is now technically aligned with current Linkerd documentation at the time of review. Some sizing guidance remains illustrative rather than officially prescribed; operators should still tune requests and limits from observed production metrics.
