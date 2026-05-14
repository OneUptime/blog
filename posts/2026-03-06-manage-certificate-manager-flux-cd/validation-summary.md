# Validation Summary: How to Manage Certificate Manager with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- cert-manager
- Kubernetes
- Helm
- Let's Encrypt ACME
- AWS Route53 DNS01 solver
- Prometheus Operator monitoring resources

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Helm chart values: https://github.com/cert-manager/cert-manager/blob/v1.20.2/deploy/charts/cert-manager/values.yaml
- cert-manager continuous deployment and Flux documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager Route53 DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get`: https://fluxcd.io/flux/cmd/flux_get/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes `kubectl get` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Let's Encrypt staging environment documentation: https://letsencrypt.org/docs/staging-environment/
- Let's Encrypt ACME protocol updates: https://letsencrypt.org/docs/acme-protocol-updates/

## Issues Found
- The HelmRelease used cert-manager chart version `1.15.x`, which is no longer a currently supported cert-manager release. Updated the example to `1.20.x` based on cert-manager's current supported release table.
- The Helm values used deprecated `installCRDs: true`. Updated the example to use `crds.enabled: true`, which is the current cert-manager Helm value for installing CRDs.
- The Route53 DNS01 examples implied IRSA authentication but only showed a `route53.region` field and a commented `role` field. Updated the Helm values to show the cert-manager ServiceAccount annotation pattern for EKS IRSA, and changed the solver examples to `route53: {}` for ambient credentials.
- The Flux layout applied cert-manager custom resources in the same reconciliation path as the HelmRelease that installs the CRDs. Split the repository paths and Flux Kustomization examples into `controller` and `config`, with `cert-manager-config` depending on `cert-manager`, so ClusterIssuers and Certificates are applied only after the CRDs and controller are ready.
- The Ingress example used `cert-manager.io/acme-challenge-type`, which is not a current supported ingress-shim annotation. Removed it and left the supported `cert-manager.io/cluster-issuer` annotation.
- The monitoring alert path was outside the reconciled config path after splitting the repository structure. Updated it to `infrastructure/cert-manager/config/monitoring/alerts.yaml`.

## Review Notes
The PrometheusRule example assumes the Prometheus Operator CRDs are already installed. The wildcard Certificate uses Emberstack Reflector annotations, so secret reflection also requires Reflector or equivalent tooling to be installed.
