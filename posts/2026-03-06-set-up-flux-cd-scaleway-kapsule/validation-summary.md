# Validation Summary: How to Set Up Flux CD on Scaleway Kapsule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Scaleway Kapsule
- Scaleway Container Registry
- Scaleway CLI
- Kubernetes
- Docker registry authentication
- HelmRelease and HelmRepository resources
- Flux image automation
- cert-manager
- NGINX Ingress Controller
- Scaleway Load Balancer annotations
- Flux notification Provider and Alert resources

## Sources Consulted
- Scaleway CLI K8s documentation: https://cli.scaleway.com/k8s/
- Scaleway Kubernetes version support policy: https://www.scaleway.com/en/docs/containers/kubernetes/reference-content/version-support-policy/
- Scaleway Container Registry quickstart: https://www.scaleway.com/en/docs/container-registry/quickstart/
- Scaleway Registry CLI documentation: https://cli.scaleway.com/registry/
- Scaleway CLI config documentation: https://cli.scaleway.com/config/
- Scaleway IAM CLI documentation: https://cli.scaleway.com/iam/
- Scaleway Kubernetes Load Balancer documentation: https://www.scaleway.com/en/docs/kubernetes/reference-content/kubernetes-load-balancer/
- Scaleway Load Balancer annotations documentation: https://www.scaleway.com/en/docs/kubernetes/reference-content/using-load-balancer-annotations/
- Scaleway Cloud Controller Manager annotation reference: https://github.com/scaleway/scaleway-cloud-controller-manager/blob/master/docs/loadbalancer-annotations.md
- Scaleway CSI storage documentation: https://www.scaleway.com/en/docs/kubernetes/api-cli/managing-storage/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- ingress-nginx installation documentation: https://kubernetes.github.io/ingress-nginx/deploy/

## Issues Found
- The cluster creation command pinned Kubernetes `1.29.1`, which is no longer a supported/current Scaleway Kapsule creation target. Changed it to `version=latest` to follow Scaleway's current version guidance and avoid creating a cluster with an unavailable version.
- The post used `scw iam api-key list` to retrieve `secret_key`, but Scaleway IAM only displays API secret keys when they are created. Changed the examples to read the configured CLI secret with `scw config get secret-key`.
- The Docker login command passed the secret via `--password`, which is less safe and not the form shown in Scaleway Container Registry documentation. Changed it to pipe the secret into `docker login --password-stdin`.
- The post used `jq` without listing it as a prerequisite. Added `jq` to the prerequisites.
- The Kubernetes image pull secret was created only in `flux-system`, but the sample Deployment runs in the `api-service` namespace. Added creation of the same `scr-credentials` secret in `api-service` and made both secret commands apply idempotently.
- The Flux bootstrap command did not install the image automation controllers, but later steps define `ImageRepository`, `ImagePolicy`, and `ImageUpdateAutomation` resources. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The Flux bootstrap command did not grant write access for image automation commits when using deploy-key based GitHub bootstrap. Added `--read-write-key=true`.
- The NGINX ingress Load Balancer annotations mixed HTTP forwarding and HTTP health-check annotations with a TLS-capable ingress Service. Removed those annotations and kept Scaleway's supported proxy protocol settings, adding the hostname and forwarded-header settings shown in Scaleway's ingress guidance.
- The Flux notification resources used `notification.toolkit.fluxcd.io/v1` for Provider and Alert, but the current Provider and Alert API is `v1beta3`. Updated both API versions.
- The Slack notification example referenced a secret but did not show the required `address` key for a legacy incoming webhook. Added a placeholder Secret manifest with `stringData.address`.

## Review Notes
- The custom `b_ssd` StorageClass is still technically valid but represents Scaleway's legacy Block Storage class. For new production workloads, Scaleway's newer `sbs_5k` or `sbs_15k` classes may be preferable.
- The sample app still uses placeholder values such as `api.example.com`, `admin@example.com`, image names, and Slack webhook URL, which must be replaced by readers before use.
