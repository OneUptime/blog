# Validation Summary: How to Set Up ArgoCD with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Argo CD
- Argo CD ApplicationSet
- OpenID Connect (OIDC)
- ingress-nginx
- `kubectl`
- `argocd` CLI

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Installation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD ApplicationSet Cluster generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD User Management / existing OIDC provider configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Rancher Generic OIDC configuration: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-generic-oidc
- Kubernetes Ingress concept: https://kubernetes.io/docs/concepts/services-networking/ingress/
- `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The ingress example used a single `ingress-nginx` resource with only `backend-protocol: "HTTPS"`. Argo CD documents that a single-host `ingress-nginx` setup should use SSL passthrough because Argo CD serves both HTTPS and gRPC on the same port. I updated the example to use the documented single-host SSL-passthrough pattern, including the `ssl-passthrough` annotation, `force-ssl-redirect`, the `https` service port, and the `argocd-server-tls` secret name expected by Argo CD.
- The ApplicationSet example selected clusters by `environment: production` and templated `metadata.labels.cloud`, but the earlier `argocd cluster add` command did not assign those labels. I added `--label environment=production` and `--label cloud=aws` so the later selector and value-file template resolve correctly.
- The single-application example targeted a hard-coded `destination.server` URL that did not match the earlier use of `argocd cluster add --name rancher-production`. I changed the application destination to `name: rancher-production`, which is the documented Argo CD way to target a registered cluster by its configured name.
- The OIDC example said Argo CD should use “the same OIDC provider as Rancher” but pointed the issuer at the Rancher URL itself and omitted `argocd-cm.data.url`, which Argo CD documents as part of the OIDC config. I corrected the example to use the same external OIDC provider as Rancher, added the required Argo CD external URL, and updated the secret key reference to match the revised example.

## Review Notes
- The installation commands are valid, but Argo CD’s getting-started docs recommend pinning a release tag instead of using the floating `stable` manifest in production.
- The ApplicationSet example uses the legacy fasttemplate-style placeholders (`{{name}}`, `{{metadata.labels.cloud}}`). This remains valid, but current Argo CD documentation increasingly uses `goTemplate: true` with Go-template syntax for new examples.
- The SSL-passthrough ingress example requires `ingress-nginx` to be started with `--enable-ssl-passthrough`.
