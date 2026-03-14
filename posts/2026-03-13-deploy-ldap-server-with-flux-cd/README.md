# How to Deploy LDAP Server with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenLDAP, LDAP, Directory Services, Identity

Description: Deploy OpenLDAP server to Kubernetes using Flux CD for GitOps-managed directory services supporting user and group management.

---

## Introduction

OpenLDAP is the de facto open-source implementation of the Lightweight Directory Access Protocol (LDAP). Organizations use LDAP directories to store user accounts, groups, organizational units, and access policies that are consumed by dozens of downstream services-from email servers and VPNs to Kubernetes RBAC and CI/CD platforms.

Running OpenLDAP on Kubernetes makes your directory service available cluster-wide without a separate virtual machine. Flux CD ensures the deployment is reproducible: from the initial schema to the admin credentials, everything is declared in Git and reconciled automatically. Combined with a web-based LDAP browser like phpLDAPadmin, teams gain a complete self-hosted directory solution.

This guide deploys OpenLDAP and phpLDAPadmin using the Bitnami Helm chart managed by Flux CD.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- Persistent storage available
- An Ingress controller (for phpLDAPadmin access)
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace openldap

# Admin and config passwords for OpenLDAP
kubectl create secret generic openldap-secrets \
  --namespace openldap \
  --from-literal=adminpassword=LdapAdmin1! \
  --from-literal=configpassword=LdapConfig1!
```

## Step 2: Add the Bitnami Helm Repository

```yaml
# clusters/my-cluster/openldap/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  url: https://charts.bitnami.com/bitnami
  interval: 12h
```

## Step 3: Deploy OpenLDAP

```yaml
# clusters/my-cluster/openldap/openldap-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: openldap
  namespace: openldap
spec:
  interval: 10m
  chart:
    spec:
      chart: openldap
      version: ">=4.0.0 <5.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    # Base domain for the LDAP directory
    global:
      ldapDomain: "example.com"

    # Admin credentials from secret
    auth:
      adminUsername: admin
      adminPassword: ""
      configAdminUsername: admin
      configAdminPassword: ""
      existingSecret: openldap-secrets
      adminPasswordKey: adminpassword
      configPasswordKey: configpassword

    # TLS configuration
    tls:
      enabled: false   # Enable with a TLS secret for production

    # Persistent storage for LDAP data
    persistence:
      enabled: true
      size: 10Gi

    # Pre-populate the directory with seed data
    customLdifFiles:
      01-base-structure.ldif: |
        # Organizational units
        dn: ou=users,dc=example,dc=com
        objectClass: organizationalUnit
        ou: users

        dn: ou=groups,dc=example,dc=com
        objectClass: organizationalUnit
        ou: groups

      02-sample-group.ldif: |
        # Engineering group
        dn: cn=engineering,ou=groups,dc=example,dc=com
        objectClass: groupOfNames
        cn: engineering
        description: Engineering team
        member: uid=jdoe,ou=users,dc=example,dc=com

    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

## Step 4: Deploy phpLDAPadmin

```yaml
# clusters/my-cluster/openldap/phpldapadmin-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: phpldapadmin
  namespace: openldap
spec:
  interval: 10m
  dependsOn:
    - name: openldap
  chart:
    spec:
      chart: phpldapadmin
      version: ">=0.1.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    # Connect to the OpenLDAP service
    ldap:
      uri: ldap://openldap:389
      base: dc=example,dc=com
      bindDN: cn=admin,dc=example,dc=com

    ingress:
      enabled: true
      ingressClassName: nginx
      hostname: ldap-admin.example.com
      tls: true

    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 128Mi
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/openldap/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: openldap
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/openldap
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: openldap
      namespace: openldap
```

## Step 6: Verify and Add Users

```bash
# Check Flux reconciliation
flux get helmreleases -n openldap --watch

# Test LDAP connectivity from within the cluster
kubectl run ldap-test --rm -it --restart=Never \
  --image=alpine:3.19 -- sh -c \
  "apk add openldap-clients && ldapsearch -H ldap://openldap.openldap.svc.cluster.local:389 \
   -D 'cn=admin,dc=example,dc=com' -w LdapAdmin1! -b 'dc=example,dc=com'"
```

To add a user via `ldapadd`:

```bash
kubectl exec -n openldap $(kubectl get pod -n openldap -l app.kubernetes.io/name=openldap -o name | head -1) -- \
  ldapadd -H ldapi:/// -D "cn=admin,dc=example,dc=com" -w LdapAdmin1! << 'EOF'
dn: uid=jdoe,ou=users,dc=example,dc=com
objectClass: inetOrgPerson
cn: John Doe
sn: Doe
uid: jdoe
userPassword: {SSHA}hashedpasswordhere
mail: jdoe@example.com
EOF
```

## Step 7: Integrate with Keycloak or Authentik

Both Keycloak and Authentik support LDAP user federation. Point them to:

- **URL**: `ldap://openldap.openldap.svc.cluster.local:389`
- **Bind DN**: `cn=admin,dc=example,dc=com`
- **Users DN**: `ou=users,dc=example,dc=com`
- **Groups DN**: `ou=groups,dc=example,dc=com`

## Best Practices

- Enable TLS (`tls.enabled: true`) with a cert-manager-issued certificate for encrypted LDAP (LDAPS) connections.
- Back up the LDAP database regularly using `slapd`'s `slapcat` command and store exports in object storage.
- Use `customLdifFiles` in the Helm values to seed initial organizational units, groups, and service accounts declaratively.
- Restrict access to phpLDAPadmin using OAuth2 Proxy to prevent unauthorized access to the directory.
- For high-availability, consider deploying OpenLDAP in multi-master replication mode or using a managed LDAP service.

## Conclusion

OpenLDAP is now deployed on Kubernetes and managed by Flux CD. Your directory service is version-controlled: schema changes, organizational unit additions, and seed data are all managed through the Helm values in Git. Downstream services across the cluster can authenticate users and look up group memberships against the LDAP server using its cluster-internal DNS name.
