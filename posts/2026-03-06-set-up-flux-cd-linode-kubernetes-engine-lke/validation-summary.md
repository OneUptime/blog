# Validation Summary: How to Set Up Flux CD on Linode Kubernetes Engine (LKE)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linode Kubernetes Engine (LKE)
- Linode CLI
- Kubernetes
- Flux CD
- GitHub Container Registry (GHCR)
- Harbor
- NGINX Ingress Controller
- Linode NodeBalancer annotations
- Flux image automation
- kube-prometheus-stack
- Flux notifications

## Sources Consulted
- Akamai/Linode LKE overview: https://techdocs.akamai.com/cloud-computing/docs/linode-kubernetes-engine
- Akamai/Linode LKE CLI workflow examples: https://www.linode.com/docs/guides/migrating-from-aws-eks-to-linode-kubernetes-engine-lke/
- Akamai/Linode LKE CLI command reference: https://techdocs.akamai.com/cloud-computing/docs/lke-commands
- Linode Block Storage CSI driver documentation: https://linode.github.io/linode-blockstorage-csi-driver/
- Linode Cloud Controller Manager service annotations: https://linode.github.io/linode-cloud-controller-manager/docs/configuration/annotations.html
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux image automation API documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Harbor Helm chart documentation: https://github.com/goharbor/harbor-helm
- ingress-nginx Helm chart listing: https://artifacthub.io/packages/helm/ingress-nginx/ingress-nginx
- kube-prometheus-stack Helm chart values: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The LKE cluster command used Kubernetes `1.29`, which is outdated for current LKE examples. Updated the snippet to check available LKE versions and use a `KUBERNETES_VERSION` variable set to `1.32`.
- The cluster ID lookup used `linode-cli lke clusters-list --label`, while official LKE workflow examples filter the JSON output with `jq`. Updated the command to use `jq -r '.[] | select(.label == "flux-cluster") | .id'`.
- The GHCR credentials were used before `GITHUB_TOKEN` and `GITHUB_USER` were exported. Moved the exports before the secret creation.
- The sample workload referenced `imagePullSecrets` in the `web-app` namespace, but the pull secret was only created in `flux-system`. Added creation of the same Docker registry secret in the `web-app` namespace.
- The Flux bootstrap command omitted the image automation controllers even though the guide later creates image automation resources. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The Flux bootstrap command did not grant write access for image automation commits. Added `--read-write-key`.
- The storage section attempted to create a `linode-block-storage-retain` StorageClass that LKE already provides. Replaced the duplicate StorageClass manifest with commands to verify the LKE-provided storage classes.
- The kube-prometheus-stack HelmRelease used an old `56.x` chart constraint. Updated it to `85.x`, matching the current chart series found during review.
- The Prometheus values contained duplicate `prometheus` keys, which would cause YAML parsing to keep only the latter key and drop the Flux ServiceMonitor configuration. Merged `additionalServiceMonitors` and `prometheusSpec` under one `prometheus` key.
- The Flux notification resources used `notification.toolkit.fluxcd.io/v1`, while the current official notification examples use `v1beta3`. Updated the Provider and Alert manifests to `v1beta3`.
- The Slack notification Provider referenced a missing `slack-webhook` Secret. Added a Secret manifest with the expected `address` key for Slack incoming webhook configuration.

## Review Notes
- I could not run `linode-cli` or `flux` locally because they are not installed in the workspace environment, so CLI checks were verified against official command references and current official documentation.
- The Linode NodeBalancer annotations, Flux image policy marker format, Flux ImageRepository/ImagePolicy/ImageUpdateAutomation API versions, HelmRepository/HelmRelease API versions, and Harbor exposure values were checked and found to be consistent with the referenced documentation.
