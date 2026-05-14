# Validation Summary: How to Set Up Flux CD on Civo Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Civo Kubernetes
- K3s
- Kubernetes
- Flux CD
- Flux Helm Controller
- Flux Kustomize Controller
- Flux Image Automation Controller
- Flux Notification Controller
- ingress-nginx
- cert-manager
- Civo Volumes and Load Balancers
- GitHub/GHCR

## Sources Consulted
- Civo Kubernetes cluster creation documentation: https://www.civo.com/docs/kubernetes/create-a-cluster
- Civo CLI repository documentation: https://github.com/civo/cli
- Civo Kubernetes volumes documentation: https://www.civo.com/docs/kubernetes/config/kubernetes-volumes
- Civo load balancer documentation: https://www.civo.com/docs/networking/load-balancers
- Civo internal load balancer Kubernetes annotation documentation: https://www.civo.com/docs/networking/internal-load-balancer
- Civo Kubernetes API documentation: https://www.civo.com/api/kubernetes
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux image automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager GitOps/Flux installation documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx Helm chart repository: https://kubernetes.github.io/ingress-nginx

## Issues Found
- The Civo CLI command for listing Kubernetes sizes was shown as `civo kubernetes size list`. Civo's CLI documentation lists this as `civo kubernetes size`, so the command was corrected.
- The cert-manager Helm values used `installCRDs: true`, which is historical. The current cert-manager Helm documentation recommends `crds.enabled=true`, including for Flux GitOps installs, so the HelmRelease values were updated to `crds.enabled: true`.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for those resources; `v1` is currently used for `Receiver`. Both notification manifests were corrected.
- The post described the upstream Helm chart examples as installing Civo Marketplace apps. Since the examples install upstream add-ons through Flux, wording was adjusted to describe them as platform add-ons and equivalent add-ons rather than literal Civo Marketplace installations.

## Review Notes
- The Civo `civo-volume` storage class, Flux `kustomize.toolkit.fluxcd.io/v1` Kustomizations, Flux image automation marker syntax, GitHub bootstrap flags, Kubernetes Deployment/Service/Ingress resources, and the Civo kubeconfig command are consistent with current official documentation.
- Civo documentation notes that Flannel and Talos Linux support are being deprecated, while Civo API documentation still lists Flannel as the default CNI for K3s clusters. Future updates should revisit the K3s/CNI section if Civo changes its defaults.
