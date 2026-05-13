# Validation Summary: How to Configure Network Policies to Allow Flux Registry Access Only

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Flux source-controller
- Flux image-reflector-controller
- Flux OCIRepository, HelmRepository, and ImageRepository resources
- Container registries, including Docker Hub, GitHub Container Registry, Amazon ECR, Google Artifact Registry, and Azure Container Registry
- kubectl, flux CLI, dig, curl, and jq

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux CLI `flux reconcile source oci`: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Flux CLI `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux CLI `flux reconcile image repository`: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux install manifests for current controller pod labels: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- GitHub IP address documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses
- GitHub Meta API documentation: https://docs.github.com/en/rest/meta/meta
- AWS IP address ranges documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- AWS IP ranges JSON syntax documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-syntax.html
- Docker registry authentication documentation: https://docs.docker.com/reference/api/registry/auth/

## Issues Found
- The post said Flux source-controller pulls container images. Corrected this to state that source-controller handles OCIRepository artifacts and OCI Helm sources, while image-reflector-controller scans ImageRepository container registries for image automation.
- The registry allow policies selected only `app: source-controller`, but the post also listed ImageRepository resources. Updated the registry policies to select both `source-controller` and `image-reflector-controller` using a Kubernetes label selector expression.
- The post implied Kubernetes NetworkPolicy can be used directly as registry hostname allowlisting. Added the required caveat that standard NetworkPolicy supports IP blocks, pod selectors, and namespace selectors, not DNS/FQDN rules.
- The GitHub Container Registry section used static CIDRs without warning. Added the GitHub Meta API lookup and noted GitHub's warning that IP allowlisting is not recommended and GitHub Packages IPs may not be exhaustive.
- The Amazon ECR IP-range example filtered AWS `EC2` ranges, which is not the right guidance for ECR plus S3-backed layer downloads. Changed the example to use regional `AMAZON` and `S3` ranges.
- The default deny policy can break non-registry Flux use cases such as GitRepository, Bucket, webhook receivers, and notification providers. Added a warning that those need separate egress rules.
- Verification covered source-controller only. Added `flux reconcile image repository` and image-reflector-controller log checks for installations using image automation.
- Troubleshooting referred to "image pull" in a way that blurred Helm OCI sources and image automation repositories. Updated that wording for accuracy.

## Review Notes
The remaining public registry CIDR examples are inherently brittle because standard Kubernetes NetworkPolicy cannot express FQDN-based registry access. The post now calls this out and advises resolving or automating IP updates, but production clusters should prefer CNI-specific FQDN policies or cloud-private registry endpoints where available.
