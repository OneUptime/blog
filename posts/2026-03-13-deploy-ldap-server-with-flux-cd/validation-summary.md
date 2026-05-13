# Validation Summary: How to Deploy LDAP Server with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- OpenLDAP
- phpLDAPadmin
- LDAP / LDIF
- Keycloak
- authentik

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease v2 specification: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Helm OpenLDAP chart repository index: https://jp-gouin.github.io/helm-openldap/index.yaml
- Helm OpenLDAP chart README and values: https://github.com/jp-gouin/helm-openldap
- phpLDAPadmin subchart values in helm-openldap: https://github.com/jp-gouin/helm-openldap/tree/master/charts/phpldapadmin
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- authentik LDAP source documentation: https://docs.goauthentik.io/users-sources/sources/protocols/ldap/
- OpenLDAP Administrator Guide: https://www.openldap.org/doc/admin25/guide.html

## Issues Found
- The post referenced `openldap` and `phpldapadmin` charts from the Bitnami Helm repository, but those chart entries are not present in the current Bitnami chart index. Updated the guide to use the `jp-gouin/openldap-stack-ha` chart repository, whose current chart includes phpLDAPadmin and uses an OpenLDAP container image.
- The OpenLDAP `HelmRelease` used Bitnami-style values such as `auth.existingSecret`, `auth.adminPasswordKey`, and `tls.enabled` that do not apply to the replacement chart. Updated the values to `global.existingSecret`, `global.adminUser`, `global.configUser`, and `initTLSSecret`.
- The Kubernetes Secret keys were incompatible with the chart's expected keys. Updated the `kubectl create secret generic` command to create `LDAP_ADMIN_PASSWORD` and `LDAP_CONFIG_ADMIN_PASSWORD`.
- The `customLdifFiles` example omitted the root LDAP entry, which the chart notes must be supplied when using custom LDIF bootstrap files. Added `00-root.ldif` for `dc=example,dc=com`.
- The post deployed phpLDAPadmin as a separate HelmRelease using a chart that does not exist in the configured repository. Changed Step 4 to explain that phpLDAPadmin is configured as a subchart through the OpenLDAP HelmRelease and moved the ingress values into that release.
- The Flux Kustomization example was named `clusters/my-cluster/openldap/kustomization.yaml`, which conflicts with Kustomize's own `kustomization.yaml` file role in the reconciled path. Renamed the Flux resource example to `clusters/my-cluster/openldap-sync.yaml`.
- The `ldapadd` command used `ldapi:///` and lacked `kubectl exec -i` for stdin. Updated it to execute against `ldap://localhost:1389` inside the selected OpenLDAP pod and pass stdin correctly.
- The OpenLDAP pod selector used `app.kubernetes.io/name=openldap`, which does not match the chart's component label for the StatefulSet. Updated it to `app.kubernetes.io/component=openldap`.

## Review Notes
- Local `helm`, `flux`, and `kubectl` binaries were not installed, so CLI verification was performed against official command references and chart source files. YAML snippets in the post were parsed successfully after the edits.
- The article still uses an imperative `kubectl create secret` step for credentials. For a stricter GitOps workflow, future revisions could use SOPS, Sealed Secrets, or External Secrets, but the current command and chart reference are technically valid.
