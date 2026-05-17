# Validation Summary: How to Configure LDAP Authentication for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machineconfig, talosctl)
- Kubernetes (kube-apiserver OIDC authentication, webhook token authentication, RBAC)
- Dex (dexidp/dex v2.39.0) as an OIDC-LDAP bridge
- LDAP / OpenLDAP / FreeIPA / Active Directory
- kubelogin (kubectl oidc-login plugin)
- cert-manager (referenced for Ingress TLS)
- ldapsearch (openldap-clients)

## Sources Consulted
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex configuration reference: https://dexidp.io/docs/configuration/
- Talos Linux machine configuration reference (apiServerConfig, extraArgs, extraVolumes): https://www.talos.dev/latest/reference/configuration/
- Kubernetes OpenID Connect Tokens authenticator flags: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens
- Kubernetes webhook token authentication: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#webhook-token-authentication
- Kubernetes client-go exec credential plugins (`client.authentication.k8s.io`): https://kubernetes.io/docs/reference/access-authn-authz/authentication/#client-go-credential-plugins
- kubelogin (int128/kubelogin) documentation: https://github.com/int128/kubelogin
- Kubernetes RBAC API objects (ClusterRoleBinding, RoleBinding): https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Bitnami OpenLDAP container image: https://github.com/bitnami/containers/tree/main/bitnami/openldap

## Issues Found
No technical issues found.

All technical claims, configuration schemas, and commands were verified:
- Dex LDAP connector fields (`host`, `bindDN`, `bindPW`, `userSearch`, `groupSearch.userMatchers` with `userAttr`/`groupAttr`, `rootCA`, etc.) match the documented schema.
- Talos `cluster.apiServer.extraArgs` accepts kube-apiserver flag names without the `--` prefix (kebab-case), and `extraVolumes` uses the lowercase `readonly` field — both correctly used.
- All kube-apiserver OIDC flags referenced (`oidc-issuer-url`, `oidc-client-id`, `oidc-username-claim`, `oidc-username-prefix`, `oidc-groups-claim`, `oidc-groups-prefix`, `oidc-ca-file`) are valid.
- The `talosctl patch machineconfig --patch @file.yaml -n <node>` syntax is correct.
- The kubelogin exec credential plugin invocation (`command: kubectl`, args starting with `oidc-login get-token`) works because kubelogin installs as the `kubectl-oidc_login` plugin.
- RBAC subjects with `kind: Group` and `name: "ldap:..."` correctly correspond to the configured `oidc-groups-prefix: "ldap:"`.
- `kubectl auth whoami` is GA since Kubernetes 1.28.
- The `bitnami/openldap` image bundles OpenLDAP client utilities (including `ldapsearch`).

## Review Notes
- The kubeconfig exec config uses `client.authentication.k8s.io/v1beta1`. The `v1` API has been stable since Kubernetes 1.26 and is preferred for new deployments. `v1beta1` continues to be supported in current Kubernetes versions and remains the API used throughout kubelogin's own documentation, so this was left as-is.
- The Approach 2 webhook example references an external `webhook-config.yaml` file and a generic `your-registry/ldap-authn-webhook:latest` image without providing concrete contents — this is intentional template content rather than a runnable example, but readers may need to consult their webhook authenticator's own docs (e.g., kubernetes-ldap-authn) to flesh it out.
- For Talos, files referenced by `extraVolumes.hostPath` typically need to be provisioned via the `machine.files` section of the machine configuration since Talos has a read-only root filesystem; the post does not show that step but it is outside the strict scope of the snippet shown.
- Starting in Kubernetes 1.30, the structured authentication configuration (`--authentication-config`) is available as an alternative to the individual `--oidc-*` flags for OIDC. The flag-based approach shown in the post remains fully supported but may be worth mentioning in a future revision.
