# Validation Summary: How to Set Up Flux CD on IBM Cloud Kubernetes Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IBM Cloud Kubernetes Service (IKS)
- IBM Cloud CLI
- IBM Cloud Container Registry (ICR)
- Kubernetes
- kubectl
- Flux CD
- Flux image automation
- Flux HelmRelease and Kustomization resources
- Flux notification resources
- GitHub bootstrap workflow

## Sources Consulted
- IBM Cloud Kubernetes Service VPC cluster creation CLI documentation: https://cloud.ibm.com/docs/containers?topic=containers-cluster-create-vpc-gen2
- IBM Cloud Kubernetes Service version information: https://cloud.ibm.com/docs/containers?topic=containers-cs_versions
- IBM Cloud Container Registry access documentation: https://cloud.ibm.com/docs/Registry?topic=Registry-registry_access
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux events CLI documentation: https://fluxcd.io/flux/cmd/flux_events/

## Issues Found
- The IKS cluster creation example used Kubernetes `1.28`, which is no longer in IBM Cloud Kubernetes Service's currently supported version set. Updated the example to `1.34`, the documented default supported version as of the review date.
- The prerequisites omitted `jq`, but the commands use `jq -r .apikey` to read the generated IBM Cloud API key. Added `jq` to the prerequisites.
- The Flux bootstrap command configured image automation resources later in the guide, but did not install the image automation controllers. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The Flux image automation workflow needs write access to commit image updates back to Git. Added `--read-write-key` to the bootstrap command.
- The expected Flux pod output did not include the image automation controller pods that are required by the image automation examples. Added `image-automation-controller` and `image-reflector-controller`.
- The ingress HelmRelease was created in the `ingress-nginx` namespace without creating that namespace first. Added a Namespace manifest to the ingress example.
- The application deployment referenced `icr-pull-secret`, but the guide created `icr-secret`, and only in the `flux-system` namespace. Added commands to create `icr-secret` in the `my-app` namespace and updated the deployment to reference that secret.
- The Flux notification Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but Provider and Alert are currently documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The Slack Provider example included a `channel` field while using a webhook-style Secret reference. Removed the channel field to match the documented webhook-style provider configuration.

## Review Notes
- The IBM Cloud Container Registry API key example creates a user API key. For production, IBM's documentation recommends service ID API keys for automation so access can be scoped and rotated independently.
- The guide now uses Kubernetes `1.34`, which is current on the validation date. Future reviews should re-check IBM Cloud Kubernetes Service supported versions because this lifecycle changes regularly.
