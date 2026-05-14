# Validation Summary: How to Use Sealed Secrets with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bitnami Sealed Secrets
- Flux CD
- Kubernetes Secrets
- HelmRelease and HelmRepository custom resources
- Kustomize
- kubeseal CLI
- kubectl CLI
- SOPS

## Sources Consulted
- Bitnami Sealed Secrets official README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets Helm chart repository index: https://bitnami-labs.github.io/sealed-secrets/index.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- SOPS official documentation: https://getsops.io/docs/

## Issues Found
- The comparison table stated that Sealed Secrets offline encryption requires cluster access. This was inaccurate because Sealed Secrets supports fetching the public certificate once with `kubeseal --fetch-cert` and sealing later with `kubeseal --cert` without live cluster access. Changed the table entry to "Works with a previously fetched certificate."

## Review Notes
- The Flux API versions shown (`source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1`) match current Flux documentation.
- The Sealed Secrets Helm repository URL and chart name are current, and the `fullnameOverride: sealed-secrets-controller` value aligns the Helm chart's controller name with kubeseal's default controller name expectation.
- Flux's Kustomization decryption provider is SOPS-only, so the post is correct that no Flux `decryption` block is needed for SealedSecret resources.
- The Sealed Secrets public certificate is not secret, but teams should ensure they use the certificate for the intended cluster and refresh stored copies periodically because Sealed Secrets renews certificates.
