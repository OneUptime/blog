# Validation Summary: How to Run Kubernetes Locally Using Docker Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop
- Kubernetes
- kubectl
- Kubernetes Deployments, Services, PersistentVolumeClaims, StorageClasses, and Ingress
- ingress-nginx
- Helm
- Kubernetes Dashboard
- PostgreSQL container image

## Sources Consulted
- Docker Desktop Kubernetes documentation: https://docs.docker.com/desktop/use-desktop/kubernetes/
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- Kubernetes Dashboard documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes Dashboard project page: https://github.com/kubernetes/dashboard
- Helm installation documentation: https://helm.sh/docs/intro/install/

## Issues Found
- Docker Desktop Kubernetes enablement was described only as a single checkbox and single-node cluster. Updated the text to match current Docker Desktop behavior, where Docker Desktop 4.51 and later creates clusters from the Kubernetes view and supports both `kubeadm` and `kind` provisioners.
- The local image section overstated that Docker Desktop Kubernetes always shares the same Docker daemon. Updated the wording to scope the shared local-image workflow to the classic `kubeadm` Docker Desktop cluster and note the provisioner/image-store caveat for `kind`.
- `imagePullPolicy: IfNotPresent` was described as preventing registry pulls. Updated the explanation and examples to use `imagePullPolicy: Never` for purely local images, because `IfNotPresent` still pulls if the image is not already present locally.
- The ingress-nginx install URL used older controller version `v1.9.5`. Updated it to the current official manifest URL shown by ingress-nginx documentation, `controller-v1.15.1`.
- The Kubernetes Dashboard section used the removed manifest-based `v2.7.0` installation flow. Updated it to mention that Kubernetes Dashboard is deprecated and unmaintained, and replaced the install/access commands with the current Helm-based installation and `kubectl port-forward` flow from the official Kubernetes documentation.
- The conclusion said Docker Desktop lacks multi-node capabilities. Updated it to reflect Docker Desktop's current `kind` provisioner support for multi-node clusters.

## Review Notes
The Kubernetes manifests use current stable API versions (`apps/v1`, `v1`, and `networking.k8s.io/v1`) and are syntactically consistent. The examples remain local-development oriented and intentionally use a cluster-admin Dashboard service account only for a local demo.
