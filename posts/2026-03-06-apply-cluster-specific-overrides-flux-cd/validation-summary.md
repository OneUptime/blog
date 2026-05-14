# Validation Summary: How to Apply Cluster-Specific Overrides with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization custom resources
- Flux CD HelmRelease custom resources
- Kustomize overlays and patches
- Kubernetes Deployment, Ingress, ConfigMap, and Secret manifests
- AWS Load Balancer Controller
- Google Kubernetes Engine Ingress
- kubectl, kustomize, and jq command-line usage

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- GKE Ingress documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- AWS Load Balancer Controller annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller IngressClass documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/

## Issues Found
- The introduction claimed the guide covered "all" techniques available. I changed this to "common techniques" because Flux and Kustomize provide additional mechanisms not covered in the post.
- The GCP Ingress override used `spec.ingressClassName: gce`. Current GKE documentation states that GKE Ingress uses the `kubernetes.io/ingress.class` annotation and does not use `ingressClassName` to select the GKE Ingress controller. I added `kubernetes.io/ingress.class: gce` and set `ingressClassName: null` in the patch so the base `nginx` class is removed.
- The Helm override section said to use cluster-specific values files, but the example patches inline `spec.values` on a Flux HelmRelease. I changed the sentence to describe patching HelmRelease values.
- The `diff` verification command referenced `gcp-us-central` without the `clusters/` prefix. I corrected it to `clusters/gcp-us-central`.
- The status verification command used `flux get kustomization ... -o json`, which does not match the documented Flux CLI command form or options. I changed it to `kubectl get kustomizations.kustomize.toolkit.fluxcd.io apps -n flux-system -o json | jq '.status'`.

## Review Notes
The local environment did not have `kustomize`, `flux`, or `kubectl` installed, so CLI verification was performed against official command documentation instead of local `--help` output. The remaining examples use current Flux `kustomize.toolkit.fluxcd.io/v1` and Helm `helm.toolkit.fluxcd.io/v2` APIs and align with the referenced official documentation.
