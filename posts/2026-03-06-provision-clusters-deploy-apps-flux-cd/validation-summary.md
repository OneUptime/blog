# Validation Summary: How to Provision Clusters and Deploy Apps with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization and HelmRelease resources
- Kubernetes Cluster API
- Cluster API Provider AWS
- Kubernetes manifests, Deployments, Services, and probes
- Helm repositories and charts
- Kustomize overlays and JSON patches
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide and API reference: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Cluster API version support: https://main.cluster-api.sigs.k8s.io/reference/versions
- Cluster API kubeconfig secret documentation: https://main.cluster-api.sigs.k8s.io/developer/core/controllers/cluster
- Cluster API Provider AWS CRD reference: https://cluster-api-aws.sigs.k8s.io/crd/
- Kubernetes release information: https://kubernetes.io/releases
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- cert-manager Helm installation and supported releases: https://cert-manager.io/docs/installation/helm/ and https://cert-manager.io/docs/releases/
- Artifact Hub chart metadata for kube-prometheus-stack: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The prerequisites implied that either Cluster API or Crossplane would work with the shown manifests, but the examples are Cluster API-specific. Updated the wording to say Cluster API is used for the examples and Crossplane would require adapting the provisioning manifests.
- The description and conclusion described Flux as the single control plane, which was too broad once workload-cluster Flux controllers are installed. Reworded this to a single GitOps workflow.
- The Cluster API resources were in the `default` namespace while the Flux remote-cluster Kustomizations were in `flux-system`. Flux expects the referenced kubeconfig Secret to exist in the Kustomization namespace, and Cluster API creates the kubeconfig Secret in the Cluster namespace. Moved the CAPI resources to `flux-system` so `staging-east-kubeconfig` is available to the Flux Kustomizations.
- The post described Step 3 as auto-bootstrapping Flux on workload clusters, but the YAML did not install Flux before applying HelmRelease resources to the workload cluster. Added an explicit workload-cluster Flux bootstrap Kustomization and made infrastructure deployment depend on it.
- The `gitops: flux` label comment claimed it triggered automatic Flux bootstrap, but no controller or selector in the post used it that way. Changed the comment to describe it as an optional selection label.
- The HelmRelease examples referenced `jetstack` and `prometheus-community` HelmRepository objects that were not defined. Added the required `source.toolkit.fluxcd.io/v1` HelmRepository resources.
- The cert-manager chart version `1.16.x` is end-of-life as of the validation date. Updated it to `v1.20.2` and added `crds.enabled: true`, matching current cert-manager Helm installation guidance.
- The kube-prometheus-stack chart version `65.x` is outdated. Updated it to `84.5.0`, the current chart version found during review.
- The CAPI example used Kubernetes `v1.31.0`, which is end-of-life as of the validation date. Updated both control plane and worker versions to the supported `v1.33.11` patch release.
- The "Adding a New Cluster" section implied that copying only the cluster definition file would also deploy infrastructure and apps. Clarified that matching Flux Kustomizations, or fleet automation that generates them, are also required.

## Review Notes
The examples are now technically consistent for a management-cluster Flux model that bootstraps workload-cluster Flux and then applies manifests to CAPI-created workload clusters through kubeconfig Secrets. In a production implementation, readers should still pin chart versions intentionally, review chart upgrade notes, and add provider-specific CAPI resources such as failure domains, identity, networking, and AMI configuration for their AWS environment.
