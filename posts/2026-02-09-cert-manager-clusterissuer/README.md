# How to Configure cert-manager ClusterIssuer for Cluster-Wide Certificate Authority

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Certificates

Description: Learn how to configure cert-manager ClusterIssuer resources for cluster-wide certificate management and understand the differences between Issuer and ClusterIssuer configurations.

---

When managing certificates in Kubernetes with cert-manager, you have two options for defining certificate authorities: Issuer and ClusterIssuer. While Issuer resources are namespace-scoped and only serve certificates within a single namespace, ClusterIssuer resources are cluster-scoped and can issue certificates for any namespace in your cluster.

This distinction matters significantly in multi-namespace environments. Creating an Issuer in each namespace leads to duplication and management overhead. ClusterIssuers provide a central point of configuration that all namespaces can reference, simplifying certificate management across your entire cluster.

## Understanding ClusterIssuer Scope

A ClusterIssuer is a cluster-scoped resource that defines a certificate authority accessible from any namespace. This makes it ideal for shared services like Let's Encrypt, HashiCorp Vault, or internal CAs that multiple teams and applications use across different namespaces.

The key benefit is configuration once, use everywhere. You define the certificate authority details (ACME server, credentials, solvers) in a single ClusterIssuer, and then Certificate resources in any namespace can reference it. This reduces duplication and ensures consistent configuration.

## Creating a Basic ClusterIssuer

Let's start with a simple Let's Encrypt ClusterIssuer using HTTP-01 challenges. Unlike namespace-scoped Issuers, ClusterIssuers don't specify a namespace in their metadata:

```yaml
# letsencrypt-cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  # No namespace field - ClusterIssuers are cluster-scoped
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory

    # Email for ACME registration notifications
    email: certificates@example.com

    # Secret for ACME account private key
    # This secret will be created in the cert-manager namespace
    privateKeySecretRef:
      name: letsencrypt-prod-account-key

    # HTTP-01 challenge solver configuration
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply the ClusterIssuer:

```bash
kubectl apply -f letsencrypt-cluster-issuer.yaml

# Check ClusterIssuer status
kubectl get clusterissuer

# View detailed status
kubectl describe clusterissuer letsencrypt-prod
```

The ClusterIssuer should show a "Ready" condition. The ACME account private key secret is created in the cert-manager namespace (typically cert-manager), regardless of where certificates are requested.

## Using ClusterIssuer from Any Namespace

Once you have a ClusterIssuer, any namespace can request certificates from it. The only difference is specifying "ClusterIssuer" as the kind:

```yaml
# Certificate in namespace "production"
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: production
spec:
  secretName: app-tls-secret
  issuerRef:
    # Reference the ClusterIssuer
    name: letsencrypt-prod
    kind: ClusterIssuer  # Important: specify ClusterIssuer, not Issuer
  dnsNames:
  - app.example.com
```

```yaml
# Certificate in namespace "staging"
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-app-tls
  namespace: staging
spec:
  secretName: test-app-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer  # Same ClusterIssuer, different namespace
  dnsNames:
  - test.example.com
```

Both certificates use the same ClusterIssuer but create secrets in their respective namespaces. This provides clean isolation while sharing configuration.

## ClusterIssuer with Multiple Solvers

In production environments, you often need multiple challenge types. For example, use HTTP-01 for public-facing services and DNS-01 for internal services or wildcard certificates. Configure multiple solvers in a single ClusterIssuer:

```yaml
# multi-solver-cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-multi
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-multi-account-key
    solvers:
    # HTTP-01 solver for standard domains
    - http01:
        ingress:
          class: nginx
      # Only use this solver for specific domains
      selector:
        dnsNames:
        - "*.public.example.com"
        - "public.example.com"

    # DNS-01 solver for wildcard certificates and internal domains
    - dns01:
        route53:
          region: us-east-1
          # Use IAM role for authentication (recommended)
          role: arn:aws:iam::123456789012:role/cert-manager-route53
      selector:
        dnsZones:
        - "internal.example.com"
        - "*.example.com"
```

cert-manager automatically selects the appropriate solver based on the certificate's DNS names and the selector configuration. This enables flexible certificate management without creating multiple ClusterIssuers.

## ClusterIssuer with Service Account Tokens

When using cloud provider DNS for DNS-01 challenges, leverage service account tokens instead of storing credentials as secrets. This is more secure and integrates with cloud IAM systems:

```yaml
# aws-clusterissuer-with-irsa.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-aws
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-aws-account-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          # Reference service account with IRSA annotations
          # The cert-manager pod uses this service account
          # and inherits AWS credentials from the role
```

For this to work, annotate the cert-manager service account with the IAM role:

```bash
# Annotate cert-manager service account for IRSA
kubectl annotate serviceaccount cert-manager -n cert-manager \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/cert-manager-route53
```

This approach follows cloud security best practices by avoiding long-lived credentials stored as Kubernetes secrets.

## ClusterIssuer for Internal Certificate Authority

Not all certificates need to come from public CAs. For internal services, create a ClusterIssuer backed by your organization's internal CA:

```yaml
# internal-ca-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    # Reference to the CA certificate and private key secret
    # This secret must exist in the cert-manager namespace
    secretName: internal-ca-key-pair
```

First, create the CA secret in the cert-manager namespace:

```bash
# Create a self-signed CA (or use your existing CA)
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -out ca.crt -days 3650 \
  -subj "/CN=Internal CA/O=Example Org"

# Create the secret in cert-manager namespace
kubectl create secret tls internal-ca-key-pair \
  --cert=ca.crt \
  --key=ca.key \
  -n cert-manager
```

Now any namespace can request certificates signed by your internal CA using this ClusterIssuer.

## ClusterIssuer with Vault Integration

For enterprise environments using HashiCorp Vault as a PKI backend, configure a ClusterIssuer to issue certificates from Vault:

```yaml
# vault-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    # Vault server URL
    server: https://vault.example.com

    # Path to the PKI secrets engine
    path: pki/sign/example-dot-com

    # Kubernetes authentication method
    auth:
      kubernetes:
        # Vault authentication path
        mountPath: /v1/auth/kubernetes
        # Kubernetes service account for authentication
        role: cert-manager
        secretRef:
          # Secret containing service account token
          name: cert-manager-vault-token
          key: token
```

This ClusterIssuer enables cert-manager to request certificates from Vault's PKI secrets engine, allowing centralized certificate management with Vault's audit logging and policy controls.

## Managing Multiple ClusterIssuers

In practice, you'll often maintain multiple ClusterIssuers for different purposes:

```bash
# List all ClusterIssuers
kubectl get clusterissuer

# Example output:
# NAME                     READY   AGE
# letsencrypt-prod         True    30d
# letsencrypt-staging      True    30d
# internal-ca              True    30d
# vault-issuer             True    15d
```

Common patterns include:
- letsencrypt-staging: for testing certificate issuance
- letsencrypt-prod: for production public certificates
- internal-ca: for internal service-to-service communication
- vault-issuer: for enterprise PKI integration

Applications choose the appropriate ClusterIssuer based on their requirements. Public-facing services use Let's Encrypt, while internal services use the internal CA.

## RBAC Considerations

ClusterIssuers are cluster-scoped resources that require cluster-level permissions to create and modify. Regular users typically don't have these permissions, which is appropriate for security.

Create a dedicated role for managing ClusterIssuers:

```yaml
# clusterissuer-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: clusterissuer-admin
rules:
- apiGroups: ["cert-manager.io"]
  resources: ["clusterissuers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Bind this role only to platform administrators:

```yaml
# clusterissuer-admin-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: clusterissuer-admin-binding
subjects:
- kind: User
  name: platform-admin@example.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: clusterissuer-admin
  apiGroup: rbac.authorization.k8s.io
```

Application teams can request certificates using ClusterIssuers without permission to modify the ClusterIssuers themselves.

## Monitoring ClusterIssuer Health

Monitor ClusterIssuer status to detect configuration issues early:

```bash
# Check all ClusterIssuers
kubectl get clusterissuer -o wide

# Watch for status changes
kubectl get clusterissuer -w

# Describe specific ClusterIssuer for detailed status
kubectl describe clusterissuer letsencrypt-prod
```

The status section shows:
- Ready condition: indicates if the issuer is functional
- ACME account URL: for ACME issuers
- Error messages: if configuration is invalid

Set up alerts when ClusterIssuers transition to not ready state. This indicates a problem affecting certificate issuance across your entire cluster.

## Migration from Issuer to ClusterIssuer

If you have existing Issuer resources and want to migrate to ClusterIssuers, follow this process:

1. Create equivalent ClusterIssuer resources
2. Update Certificate resources to reference ClusterIssuers
3. Test certificate renewal with new ClusterIssuers
4. Delete old Issuer resources

The migration doesn't affect existing certificates. They continue working with their current secrets. Only new issuance and renewal operations use the ClusterIssuers.

```bash
# Update a certificate to use ClusterIssuer
kubectl patch certificate app-tls -n production --type='json' \
  -p='[{"op": "replace", "path": "/spec/issuerRef/kind", "value":"ClusterIssuer"}]'
```

## Best Practices

Use descriptive names for ClusterIssuers that indicate their purpose and environment (letsencrypt-prod, letsencrypt-staging, internal-ca).

Document ClusterIssuer usage in your platform documentation. Application teams need to know which ClusterIssuer to use for different scenarios.

Implement monitoring and alerting for ClusterIssuer health. Since ClusterIssuers serve the entire cluster, their failure affects all applications.

Use namespace selectors in solver configurations when different namespaces require different challenge methods.

Regularly review ClusterIssuer configurations. As your infrastructure evolves, ensure ClusterIssuers reflect current requirements and security policies.

## Conclusion

ClusterIssuers provide centralized certificate authority configuration for Kubernetes clusters. They eliminate duplication, simplify management, and enable consistent certificate policies across all namespaces. Whether using Let's Encrypt, internal CAs, or enterprise PKI systems like Vault, ClusterIssuers offer a clean abstraction that scales from small clusters to large multi-tenant environments.
