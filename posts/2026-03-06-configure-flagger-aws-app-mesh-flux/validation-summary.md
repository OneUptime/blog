# Validation Summary: How to Configure Flagger with AWS App Mesh and Flux

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- AWS App Mesh
- AWS App Mesh Controller for Kubernetes
- Amazon EKS
- Kubernetes
- Flagger
- Flux CD
- HelmRelease and HelmRepository resources
- Prometheus
- Envoy metrics
- GitOps canary deployments

## Sources Consulted
- AWS App Mesh end-of-support notice: https://aws.amazon.com/app-mesh
- AWS App Mesh service mesh documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html
- AWS App Mesh and Kubernetes getting started guide: https://docs.aws.amazon.com/eks/latest/userguide/appmesh-getting-started.html
- AWS App Mesh Controller sidecar injection reference: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/injector/
- AWS App Mesh Controller API specification: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/api_spec/
- AWS App Mesh Envoy metrics documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy-metrics.html
- Flagger App Mesh canary deployment tutorial: https://fluxcd.io/flagger/tutorials/appmesh-progressive-delivery/
- Flagger install documentation: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger upgrade guide: https://docs.flagger.app/main/dev/upgrade-guide
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The Mesh selector used `appmesh.k8s.aws/sidecarInjectorWebhook: enabled` while the namespace text said the namespace was associated with the mesh via `mesh: demo-mesh`. Updated the Mesh `namespaceSelector` to match `mesh: demo-mesh`, which aligns with AWS App Mesh controller guidance and the namespace manifest.
- The Prometheus scrape config rewrote Envoy targets only when a `prometheus.io/port` pod annotation existed, but the example pods do not set that annotation. Changed the relabeling to rewrite the discovered pod address directly to Envoy admin port `9901`.
- The custom MetricTemplate queried `kubernetes_namespace` and `kubernetes_pod_name`, but the scrape config did not preserve those Kubernetes discovery labels. Added relabeling rules to populate those labels.
- The Canary example used `spec.service.meshName` as App Mesh-specific configuration. Flagger's upgrade guide says this field is deprecated and no longer used for `provider: appmesh:v1beta2`, so it was removed.
- The Canary comment said the URI match matched specific headers. Updated the comment to say it matches by URI.
- The verification commands included `kubectl get virtualroute`, but the AWS App Mesh controller v1beta2 exposes routes embedded under `VirtualRouter`, not as a separate `VirtualRoute` CRD. Removed that command and clarified the virtual router check.

## Review Notes
- AWS App Mesh is officially scheduled for end of support on September 30, 2026, and AWS has stopped onboarding new customers as of September 24, 2024. The post's deprecation warning is appropriate for existing App Mesh users.
- The guide remains technically relevant for existing App Mesh users during the transition period, but future revisions should consider a VPC Lattice or Gateway API based replacement.
