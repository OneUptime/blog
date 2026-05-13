# Validation Summary: How to Deploy Flux CD on KubeEdge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- KubeEdge
- Kubernetes
- Kustomize
- Sealed Secrets
- Prometheus Operator
- kube-state-metrics
- GitOps for edge computing

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux server-side reconciliation deprecation note: https://fluxcd.io/blog/2021/09/server-side-reconciliation-is-coming/
- KubeEdge Device CRDs documentation: https://kubeedge.io/docs/concept/device/device_crds/
- KubeEdge Device CRD definitions: https://github.com/kubeedge/kubeedge/tree/master/build/crds/devices
- KubeEdge CloudCore and EdgeCore configuration documentation: https://kubeedge.io/docs/setup/config/
- KubeEdge MetaManager documentation: https://kubeedge.io/en/docs/architecture/edge/metamanager/
- KubeEdge Edged documentation: https://kubeedge.io/docs/architecture/edge/edged/
- KubeEdge Mapper documentation: https://kubeedge.io/docs/concept/device/mapper/
- Kubernetes node assignment documentation: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The Flux Kustomization example used `spec.validation: client`. This field was deprecated in earlier Flux APIs and removed from `kustomize.toolkit.fluxcd.io/v1`, so I removed it.
- The KubeEdge DeviceModel example used the older nested property type format. Current `devices.kubeedge.io/v1beta1` DeviceModel properties use fields such as `type`, `accessMode`, and `unit` directly, so I updated the example.
- The KubeEdge device instance example used `kind: DeviceInstance` and top-level `propertyVisitors`. Current KubeEdge `v1beta1` examples use `kind: Device`, with visitors defined under `spec.properties[].visitors` and protocol under `spec.protocol`, so I corrected the manifest.
- The introduction and best practices said EdgeCore caches workload state or images. KubeEdge MetaManager stores metadata locally, while image reuse is handled by the container runtime, so I corrected those statements.

## Review Notes
- The Sealed Secrets command is syntactically valid, but clusters installed with the Helm chart may need `--controller-name sealed-secrets` unless the controller name was overridden to `sealed-secrets-controller`.
- The Prometheus alert assumes kube-state-metrics is scraped and that edge nodes follow the `edge-.*` naming convention used in the examples.
