# Validation Summary: How to Configure RBAC RoleBindings with Subject Groups for LDAP Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC RoleBindings and ClusterRoleBindings
- Kubernetes OIDC authentication
- Dex LDAP connector
- LDAP group membership
- kubectl and kubectl-oidc-login
- Kubernetes audit policies
- Kubernetes Python client

## Sources Consulted
- Kubernetes Authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Client Authentication v1 reference: https://kubernetes.io/docs/reference/config-api/client-authentication.v1/
- Kubernetes kube-apiserver Audit Configuration v1 reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- kubectl-oidc-login / kubelogin documentation: https://github.com/int128/kubelogin
- Official Kubernetes Python client documentation: https://github.com/kubernetes-client/python

## Issues Found
- The introduction implied that the Kubernetes API server authenticates directly against LDAP. Updated it to clarify that the identity provider authenticates against LDAP and issues group-bearing tokens to Kubernetes.
- The introduction claimed access is immediately revoked after LDAP group removal. Updated it to account for OIDC token lifetime; Kubernetes authorizes based on the group claims in the presented token until that token is refreshed or expires.
- Dex LDAP `groupSearch` examples used top-level `userAttr` and `groupAttr`. Updated them to the current Dex `userMatchers` format.
- The kube-apiserver flag value `--oidc-groups-prefix=ldap:` was unquoted in YAML. Quoted it to avoid YAML parsing ambiguity around the trailing colon.
- The kubectl exec credential example used `client.authentication.k8s.io/v1beta1`. Updated it to `client.authentication.k8s.io/v1` and added `--exec-interactive-mode=IfAvailable`.
- The kubectl-oidc-login examples did not request the Dex `groups` scope. Added `--oidc-extra-scope=groups` so group claims are included.
- The troubleshooting section piped `kubectl oidc-login get-token` output through JWT-decoding `jq`, but kubelogin documents `setup` for dumping ID token claims. Updated the command to use `kubectl oidc-login setup`.
- The nested LDAP group section mentioned nested lookup support but did not configure it. Added Dex `recursionGroupAttr: member` under `userMatchers`.
- The Python Kubernetes client example did not load in-cluster configuration and would fail on repeated CronJob runs after the ConfigMap already existed. Updated it to call `config.load_incluster_config()` and patch the ConfigMap on HTTP 409 conflicts.
- The audit policy attempted to match all LDAP groups using `userGroups: ["ldap:*"]`, but Kubernetes audit policy `userGroups` values are literal group names, not glob patterns. Removed that matcher and left log analysis to filter LDAP-prefixed groups with `jq`.

## Review Notes
- The examples still use placeholder domains, secrets, deployment manifests, and images; those need to be replaced in a real environment.
- The CronJob example needs a service account with RBAC permissions to create and patch the `ldap-groups` ConfigMap in the `auth` namespace.
- Kubernetes now also supports structured authentication configuration for JWT authenticators; the documented `--oidc-*` flags remain valid, but clusters using `--authentication-config` must not combine it with `--oidc-*` flags.
