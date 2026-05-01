# Validation Summary: How to Install Epinio on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Epinio
- Kubernetes
- Helm
- cert-manager
- ingress-nginx
- Paketo Buildpacks
- Ruby
- Sinatra

## Sources Consulted
- Epinio installation docs: https://docs.epinio.io/installation/install_epinio
- Epinio system requirements: https://docs.epinio.io/references/system_requirements/global
- Epinio certificate issuers: https://docs.epinio.io/howtos/other/certificate_issuers
- Epinio authorization docs: https://docs.epinio.io/references/authorization
- Epinio CLI installation docs: https://docs.epinio.io/installation/install_epinio_cli
- Epinio login command reference: https://docs.epinio.io/references/commands/cli/epinio_login
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio Helm chart values: https://raw.githubusercontent.com/epinio/helm-charts/main/chart/epinio/values.yaml
- Epinio Helm chart README: https://raw.githubusercontent.com/epinio/helm-charts/main/chart/epinio/README.md
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- ingress-nginx IngressClass guidance: https://kubernetes.github.io/ingress-nginx/user-guide/k8s-122-migration/
- Paketo Ruby buildpack reference: https://paketo.io/docs/reference/ruby-reference/
- Paketo Ruby sample app: https://github.com/paketo-buildpacks/samples/tree/main/ruby/puma

## Issues Found
- The prerequisites overstated Kubernetes support as `v1.24+` and omitted required cluster conditions. I corrected this to the current Epinio-supported Kubernetes range (`v1.20-v1.28`) and added the need for a wildcard-enabled domain, a default `IngressClass`, and a default `StorageClass`.
- The cert-manager example used an older CRD flag. I updated it to `--set crds.enabled=true`, which matches the current cert-manager Helm installation guidance.
- The ingress-nginx installation did not make its `IngressClass` the default, which can prevent Epinio ingress resources from being handled as written. I added `--set controller.ingressClassResource.default=true`.
- The production values example for external S3 storage was incorrect for the current Epinio chart. I added `seaweedfs.enabled: false`, added the required `global.tlsIssuerEmail`, and corrected `s3.accessKeyId` to `s3.accessKeyID`.
- The login section attempted to read a plaintext admin password from an `epinio-creds` secret. Current Epinio installs create default users `admin` and `epinio` with password `password`, and user secrets store hashed credentials. I replaced the login example accordingly and switched the verification command to `epinio settings show`.
- The Ruby test app was incomplete for Paketo Ruby buildpack detection and launch. I added a `Gemfile`, a `config.ru`, enabled Puma in the Sinatra app, and made the push path explicit with `epinio push --name hello-world --path .`.

## Review Notes
- The post is now technically consistent with the current Epinio 1.13.x documentation and chart layout, but it remains version-specific because Epinio currently documents Kubernetes support only through v1.28.
- cert-manager's own docs now recommend installing from its OCI chart. I kept the repository-based flow because Epinio's official install docs and chart README still document that approach, while updating the Helm value to the current form.
