# Validation Summary: How to Implement Cross-Cluster Service Discovery with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD and ApplicationSets
- Kubernetes Services and DNS
- ExternalDNS
- CoreDNS forwarding
- Kubernetes Multi-Cluster Services API
- Istio multi-cluster service mesh
- Linkerd multi-cluster service mirroring

## Sources Consulted
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet git generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Kubernetes DNS and Service debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- ExternalDNS TTL annotation documentation: https://kubernetes-sigs.github.io/external-dns/v0.15.0/docs/ttl/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- SIG Multicluster MCS API overview: https://multicluster.sigs.k8s.io/concepts/multicluster-services-api/
- SIG Multicluster ServiceExport documentation: https://multicluster.sigs.k8s.io/api-types/service-export/
- Istio multi-cluster installation documentation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio deployment models documentation: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Linkerd multi-cluster reference documentation: https://linkerd.io/2-edge/reference/multicluster/

## Issues Found
- The Deployment example for `order-service` was not a valid `apps/v1` Deployment because it omitted `spec.selector`, matching pod labels, and a container image. Added the required selector, labels, and image field.
- The CoreDNS forwarding example used a `coredns-custom` ConfigMap shape that is not the generic upstream CoreDNS configuration format. Replaced it with a standard `kube-system/coredns` ConfigMap using the `Corefile` key and valid `forward` plugin server blocks.
- The CoreDNS section incorrectly suggested using an ExternalDNS annotation on a `ClusterIP` Service to create a remote cluster-local DNS name. Replaced this with a standard ClusterIP Service and explained using the remote cluster's service FQDN when that cluster has a distinct cluster domain.
- The MCS section implied users should create `ServiceImport` resources manually. Updated the text to state that MCS controllers create `ServiceImport` resources from exported services, while users manage `ServiceExport` resources in Git.
- The ApplicationSet example for managing MCS resources referenced `{{path.metadata.annotations.*}}`, which is not produced by the git directory generator. Replaced it with a cluster generator pattern that uses `{{server}}` and a per-cluster export path.
- The standalone Istio `Application` used `{{server}}`, but a plain Argo CD `Application` does not have an ApplicationSet template context. Replaced it with `https://kubernetes.default.svc`.

## Review Notes
- The MCS API defines the resources, but production behavior depends on the selected MCS implementation and controller.
- Linkerd and Istio multi-cluster behavior depends on network topology, trust configuration, gateways, and exported-service settings; the post now remains accurate at the overview and manifest-pattern level.
