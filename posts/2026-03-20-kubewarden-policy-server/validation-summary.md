# Validation Summary: How to Configure Kubewarden Policy Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes
- PolicyServer CRD
- ClusterAdmissionPolicy
- Helm
- OCI registries
- TLS and certificate management

## Sources Consulted
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden quick start: https://docs.kubewarden.io/quick-start
- Kubewarden architecture: https://docs.kubewarden.io/explanations/architecture
- Kubewarden certificate rotation: https://docs.kubewarden.io/explanations/certificates
- Kubewarden production deployments: https://docs.kubewarden.io/howtos/production-deployments
- Kubewarden private registries for PolicyServers: https://docs.kubewarden.io/howtos/policy-servers/private-registry
- Kubewarden custom CAs for PolicyServers: https://docs.kubewarden.io/howtos/policy-servers/custom-cas
- Kubewarden upgrade path: https://docs.kubewarden.io/reference/upgrade-path
- Kubewarden defaults chart values: https://github.com/kubewarden/helm-charts/blob/main/charts/kubewarden-defaults/values.yaml
- Kubernetes Docker config secrets: https://kubernetes.io/docs/concepts/configuration/secret/#docker-config-secrets

## Issues Found
- The post treated `PolicyServer` as namespaced. I removed `metadata.namespace` from all `PolicyServer` manifests and removed `-n kubewarden` from `kubectl get/describe/patch policyserver` commands because the CRD is cluster-scoped. I kept `-n kubewarden` where the post inspects backing pods, services, and deployments, because those workloads run in the Kubewarden installation namespace.
- The HA example used `spec.resources.requests` and `spec.resources.limits`, but the current `PolicyServer` spec exposes top-level `spec.requests` and `spec.limits`. I corrected the YAML to use the supported fields.
- The anti-affinity example matched the deprecated `app` label for scheduling. I updated it to match the supported `kubewarden/policy-server` label used by PolicyServer pods in current documentation.
- The TLS section was inaccurate. Current Kubewarden versions manage webhook TLS certificates in the controller and no longer require cert-manager for PolicyServer webhook certificates. The original `volumes` and `volumeMounts` fields are not part of the `PolicyServer` spec, so I replaced that example with the supported `spec.sourceAuthorities` configuration for trusting custom registry CAs.
- Several image and policy versions were stale. I updated the `policy-server` examples to the current Kubewarden stack version used by the official `kubewarden-defaults` chart (`v1.35.0`) and updated the `pod-privileged` policy example to the current charted tag (`v1.0.10`).
- The monitoring section pointed metrics checks at `svc/kubewarden-controller-metrics`, which is not the PolicyServer service. I corrected the example to port-forward `svc/policy-server-default` when PolicyServer metrics are enabled.
- The upgrade section referenced the wrong deployment name. I corrected the rollout target from `kubewarden-policy-server-default` to `policy-server-default`, which matches the controller’s generated deployment name.
- The architecture explanation implied the controller directly loads policy Wasm into memory. I corrected the wording to reflect current behavior: the controller updates PolicyServer configuration and webhook routing, while the `policy-server` downloads and loads policy modules.

## Review Notes
- PolicyServer metrics are not enabled by default in a standard `kubewarden-defaults` installation; the monitoring command works only when metrics are enabled for the PolicyServer.
- Kubewarden recommends keeping the `policy-server` image tag aligned with the rest of the Kubewarden stack during upgrades.
