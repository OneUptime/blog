# Validation Summary: How to Deploy the Cert-Manager Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- cert-manager
- Helm
- ACME / Let's Encrypt
- AWS Route53 DNS01
- Kubernetes Ingress TLS

## Sources Consulted
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager v1.14 release notes: https://cert-manager.io/docs/releases/release-notes/release-notes-1.14/
- cert-manager v1.14 HTTP01 solver documentation: https://cert-manager.io/v1.14-docs/configuration/acme/http01/
- cert-manager v1.14 Route53 DNS01 documentation: https://cert-manager.io/v1.14-docs/configuration/acme/dns01/route53/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager CA issuer documentation: https://cert-manager.io/v1.8-docs/configuration/ca/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD compare options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/

## Issues Found
- The CRD Application pointed directly at `cert-manager/cert-manager` `deploy/crds`, but cert-manager marks that directory as development source and recommends using released CRD artifacts or generated manifests. Changed the example to download `cert-manager.crds.yaml` from the v1.14.5 release, commit it to the user's GitOps repository, and point Argo CD at that committed manifest path.
- The examples pinned cert-manager `v1.14.0`, but the official v1.14 release notes advise skipping v1.14.0 because of known release issues. Updated the Helm chart target revision and CRD artifact reference to `v1.14.5`, the latest v1.14 patch version used in the official v1.14 install docs.
- The HTTP01 examples used `http01.ingress.class: nginx`. cert-manager v1.14 supports this field, but the docs recommend `ingressClassName` for most ingress controllers and reserve `class` mainly for ingress-gce. Updated nginx examples to use `ingressClassName: nginx`.
- The Route53 IRSA Helm note only showed the service account annotation. cert-manager's Route53 documentation also calls out the required pod filesystem permissions for the projected service account token. Added the chart `securityContext.fsGroup: 1001` value to the commented IRSA example.
- The troubleshooting section recommended globally excluding all Secrets from Argo CD, which would stop Argo CD from managing every Secret in the cluster. Replaced it with resource annotations using `argocd.argoproj.io/compare-options: IgnoreExtraneous` and `argocd.argoproj.io/sync-options: Prune=false`, plus a warning not to globally exclude all Secrets unless that is intentional.

## Review Notes
All YAML snippets were syntax-checked after edits. The guide remains version-specific to cert-manager v1.14.x; future updates should revisit the Helm CRD value names because current cert-manager chart documentation has moved toward newer CRD settings in later releases.
