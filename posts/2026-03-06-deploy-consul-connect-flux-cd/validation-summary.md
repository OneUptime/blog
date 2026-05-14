# Validation Summary: How to Deploy Consul Connect with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease and Kustomization APIs
- Kubernetes manifests and kubectl
- HashiCorp Consul
- Consul Connect / Consul service mesh
- Consul Helm chart
- Consul Kubernetes CRDs: ServiceIntentions, ServiceDefaults, ProxyDefaults

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reference for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI reference for `flux reconcile kustomization --with-source`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- HashiCorp Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- HashiCorp Consul on Kubernetes annotations reference: https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label
- HashiCorp Consul Kubernetes injection guide: https://developer.hashicorp.com/consul/docs/connect/k8s/inject
- HashiCorp Consul ServiceIntentions reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul ServiceDefaults reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-defaults
- HashiCorp Consul ProxyDefaults reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/proxy-defaults
- HashiCorp Consul Helm chart repository index: https://helm.releases.hashicorp.com/index.yaml
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl/

## Issues Found
- The Kubernetes prerequisite was stricter than the Consul Helm chart requires. Changed `v1.25 or later` to `v1.22 or later`, matching the chart repository `kubeVersion` requirement for the referenced chart line.
- The Flux Kustomization example used `clusters/my-cluster/consul/kustomization.yaml` as a Flux custom resource inside the same path Flux reconciles. Flux only auto-generates a Kustomize file when no `kustomization.yaml` exists, so this could break reconciliation. Renamed the Flux custom resource example and added standard Kustomize `kustomization.yaml` files for the reconciled directories.
- Consul configuration-entry CRs were shown in the same reconciliation path as the HelmRelease that installs their CRDs. Split the example into `consul-install` and `consul-config` Flux Kustomizations and added `dependsOn` so CRDs are installed before CR instances are applied.
- The Flux health checks used `consul-consul-server` and `consul-consul-connect-injector`. With `global.name: consul`, the Consul chart renders these as `consul-server` and `consul-connect-injector`. Updated the resource names.
- The workload example enabled Consul ACLs but used the default pod service account. Consul documentation requires the registered service name to match the pod ServiceAccount when ACLs are enabled. Added a `web-app` ServiceAccount, `serviceAccountName: web-app`, and an explicit `connect-service` annotation.
- The upstream annotation used the older unlabeled `api-service:8081` form. Updated it to the documented labeled format `api-service.svc:8081`.
- The ServiceIntentions metadata name did not match the destination service example. Renamed it to `api-service` for consistency with Consul's documented examples.
- The ProxyDefaults example described `envoy_extra_static_clusters_json` as access logging. Replaced it with the documented `accessLogs.enabled: true` field.
- The ProxyDefaults example used the `consul` namespace. Updated it to `default`, matching the documented global ProxyDefaults metadata namespace example.
- Monitoring and troubleshooting commands referenced the old single Kustomization name. Updated them to `consul-install` and `consul-config`.

## Review Notes
The YAML snippets parse successfully. Local `helm`, `flux`, and `kubectl` binaries were not available in the workspace, so CLI and rendered chart behavior were checked against official documentation, the HashiCorp Helm repository index, and the downloaded Consul chart template sources.
