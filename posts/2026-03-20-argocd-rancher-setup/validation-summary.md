# Validation Summary: How to Set Up ArgoCD with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Rancher
- Kubernetes
- Helm
- ingress-nginx
- OpenID Connect (OIDC)
- GitOps

## Sources Consulted
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD user management and OIDC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD getting started guide for initial admin password: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo Helm chart README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Rancher OIDC provider documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/configure-oidc-provider

## Issues Found
- The Helm install example used `applicationSet.replicaCount`, but the current Argo Helm chart uses `applicationSet.replicas`. I corrected the value key.
- The Helm install example described a high-availability setup but omitted `redis-ha.enabled=true`, which is part of the chart's documented HA configuration. I added it.
- The ingress example mixed SSL passthrough with a comment that said to disable SSL redirect and used annotations that did not match Argo CD's documented `ingress-nginx` passthrough example. I replaced the annotations with the documented passthrough pattern and switched the backend service port to `name: https`.
- The Application manifest targeted the downstream cluster with a placeholder server URL that did not match the cluster registered in Step 4. Since the post registers the cluster with `--name production-cluster`, I changed the Application destination to `name: production-cluster`.
- The Rancher SSO example used the wrong issuer path (`/v1/oidc`) and implied a static client ID. Rancher's OIDC provider uses `/oidc`, requires the `oidc-provider` feature, and generates the client ID for the OIDC app. I updated the text and snippet accordingly.
- The Rancher SSO snippet requested `email` and `groups` scopes by default, but Rancher's OIDC provider documentation defaults client scopes to `openid`, `profile`, and `offline_access`. I updated the requested scopes to match the documented provider defaults.
- The Best Practices section referenced `ClusterV3`, which is not the Rancher cluster resource name. I corrected it to Rancher cluster resources under `clusters.management.cattle.io`.

## Review Notes
- The `argocd login` example is valid as written, but real deployments may also need flags such as `--insecure` or `--grpc-web` depending on the ingress and certificate setup.
- The OIDC snippet remains a partial ConfigMap fragment, not a full end-to-end Rancher `OIDCClient` and Argo CD secret setup. That is acceptable for the post's scope, but a future revision could add the full secret wiring and redirect URI details.
