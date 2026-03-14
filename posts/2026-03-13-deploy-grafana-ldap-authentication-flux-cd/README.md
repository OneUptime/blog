# Deploy Grafana with LDAP Authentication Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Grafana, LDAP, Authentication, Observability, HelmRelease

Description: Learn how to configure Grafana with LDAP authentication on Kubernetes using Flux CD.

---

## Introduction

Integrating Grafana with an LDAP directory such as Active Directory or OpenLDAP centralizes user management and removes the need for local accounts. Users log in with their existing corporate credentials, and group membership maps directly to Grafana roles.

Managing LDAP credentials and the LDAP configuration file as Flux-reconciled Kubernetes Secrets ensures that sensitive data never sits in plain text in your cluster. Combined with a HelmRelease, the entire Grafana deployment-including its authentication configuration-lives in Git.

This guide shows how to structure the Flux resources, reference an LDAP config file from a Secret, and validate the integration end-to-end.

## Prerequisites

- A running Kubernetes cluster with Flux CD bootstrapped
- Access to an LDAP server (Active Directory, OpenLDAP, FreeIPA, etc.)
- LDAP bind DN and password
- Flux SOPS or Sealed Secrets for Secret encryption
- `flux` and `kubectl` CLIs installed

## Step 1: Create the Encrypted LDAP Secret

Store the LDAP bind password as a Kubernetes Secret. Use SOPS to encrypt it before committing.

```yaml
# clusters/my-cluster/grafana/ldap-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-ldap-secret
  namespace: monitoring
type: Opaque
stringData:
  # LDAP bind password - encrypt this file with SOPS before committing
  bindPassword: "changeme"
  # Full ldap.toml configuration file mounted into the Grafana pod
  ldap.toml: |
    [[servers]]
    host = "ldap.corp.example.com"
    port = 636
    use_ssl = true
    bind_dn = "cn=grafana-bind,ou=service-accounts,dc=corp,dc=example,dc=com"
    bind_password = "${GRAFANA_LDAP_BIND_PASSWORD}"
    search_filter = "(sAMAccountName=%s)"
    search_base_dns = ["ou=users,dc=corp,dc=example,dc=com"]

    [servers.attributes]
    name    = "givenName"
    surname = "sn"
    email   = "mail"

    [[servers.group_mappings]]
    group_dn = "cn=grafana-admins,ou=groups,dc=corp,dc=example,dc=com"
    org_role = "Admin"

    [[servers.group_mappings]]
    group_dn = "cn=grafana-editors,ou=groups,dc=corp,dc=example,dc=com"
    org_role = "Editor"

    [[servers.group_mappings]]
    group_dn = "*"
    org_role = "Viewer"
```

## Step 2: Create the HelmRepository

Point Flux at the official Grafana Helm chart repository.

```yaml
# clusters/my-cluster/grafana/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

## Step 3: Deploy Grafana with LDAP Enabled via HelmRelease

Configure the HelmRelease to mount the LDAP config from the Secret and enable LDAP auth.

```yaml
# clusters/my-cluster/grafana/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: grafana
      version: ">=7.0.0 <8.0.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    # Enable LDAP authentication and disable the built-in login form
    grafana.ini:
      auth.ldap:
        enabled: true
        config_file: /etc/grafana/ldap.toml
        allow_sign_up: true

    # Mount the ldap.toml from the Secret into the container
    extraSecretMounts:
      - name: ldap-config
        secretName: grafana-ldap-secret
        mountPath: /etc/grafana/ldap.toml
        subPath: ldap.toml
        readOnly: true

    # Expose the bind password as an environment variable
    envValueFrom:
      GRAFANA_LDAP_BIND_PASSWORD:
        secretKeyRef:
          name: grafana-ldap-secret
          key: bindPassword
```

## Step 4: Create the Kustomization

Wire all resources with a Flux Kustomization that enforces health checks.

```yaml
# clusters/my-cluster/grafana/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/grafana
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: grafana
      namespace: monitoring
```

## Best Practices

- Always encrypt LDAP credentials with SOPS or Sealed Secrets before committing to Git.
- Use `use_ssl: true` and verify the LDAP server certificate in production.
- Map at least three Grafana roles (Admin, Editor, Viewer) to LDAP groups to avoid granting excessive permissions.
- Test the LDAP connection with `grafana-cli admin reset-admin-password` after deployment to confirm connectivity.
- Store the `ldap.toml` inside a Secret (not a ConfigMap) so Kubernetes RBAC controls access.

## Conclusion

Deploying Grafana with LDAP authentication via Flux CD gives you a fully GitOps-managed observability stack where user access is governed by your corporate directory. Sensitive credentials remain encrypted in Git and are injected at runtime, maintaining both security and auditability.
