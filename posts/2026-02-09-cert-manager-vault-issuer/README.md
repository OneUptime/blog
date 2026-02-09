# How to Configure cert-manager with HashiCorp Vault as a Certificate Issuer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to integrate cert-manager with HashiCorp Vault PKI engine to issue and manage TLS certificates with enterprise-grade security and audit capabilities.

---

HashiCorp Vault provides enterprise-grade secrets management with powerful PKI capabilities. When integrated with cert-manager, Vault becomes a centralized certificate authority for your Kubernetes clusters, offering fine-grained access control, comprehensive audit logging, and policy-driven certificate management.

Unlike Let's Encrypt which issues certificates for public domains, Vault PKI is ideal for internal certificates, service-to-service authentication, and environments requiring custom certificate authorities. You control the entire PKI hierarchy, certificate policies, and validation rules.

This guide shows how to configure cert-manager to request certificates from Vault's PKI secrets engine, enabling automated internal certificate management with enterprise security controls.

## Prerequisites and Setup

You need:
- A Kubernetes cluster with cert-manager installed
- HashiCorp Vault deployed (in or outside Kubernetes)
- Vault PKI secrets engine configured
- Vault authentication method configured for Kubernetes

## Configuring Vault PKI Engine

First, set up Vault's PKI secrets engine. This example creates a simple PKI hierarchy:

```bash
# Enable PKI secrets engine
vault secrets enable pki

# Configure max TTL (10 years for root CA)
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA certificate
vault write pki/root/generate/internal \
  common_name="Example Internal Root CA" \
  ttl=87600h

# Configure CA certificate URLs
vault write pki/config/urls \
  issuing_certificates="https://vault.example.com:8200/v1/pki/ca" \
  crl_distribution_points="https://vault.example.com:8200/v1/pki/crl"
```

Create an intermediate CA (recommended for production):

```bash
# Enable intermediate PKI engine
vault secrets enable -path=pki_int pki

# Configure max TTL (5 years for intermediate)
vault secrets tune -max-lease-ttl=43800h pki_int

# Generate CSR for intermediate CA
vault write -format=json pki_int/intermediate/generate/internal \
  common_name="Example Intermediate CA" \
  | jq -r '.data.csr' > pki_intermediate.csr

# Sign the intermediate CSR with root CA
vault write -format=json pki/root/sign-intermediate \
  csr=@pki_intermediate.csr \
  format=pem_bundle \
  ttl=43800h \
  | jq -r '.data.certificate' > intermediate.cert.pem

# Import signed certificate
vault write pki_int/intermediate/set-signed \
  certificate=@intermediate.cert.pem
```

Create a role for certificate issuance:

```bash
# Create a role that defines certificate parameters
vault write pki_int/roles/example-dot-com \
  allowed_domains="example.com" \
  allow_subdomains=true \
  max_ttl="720h" \
  key_type="rsa" \
  key_bits=2048 \
  require_cn=false
```

This role allows certificates for example.com and its subdomains with a maximum TTL of 30 days.

## Configuring Vault Kubernetes Authentication

cert-manager needs to authenticate with Vault. The Kubernetes auth method allows pods to authenticate using their service account tokens:

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure Kubernetes authentication
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

Create a Vault policy for cert-manager:

```bash
# Create policy allowing certificate issuance
vault policy write cert-manager - <<EOF
path "pki_int/sign/example-dot-com" {
  capabilities = ["create", "update"]
}

path "pki_int/issue/example-dot-com" {
  capabilities = ["create", "update"]
}
EOF
```

Create a Kubernetes auth role binding the policy to cert-manager's service account:

```bash
# Create role binding service account to policy
vault write auth/kubernetes/role/cert-manager \
  bound_service_account_names=cert-manager \
  bound_service_account_namespaces=cert-manager \
  policies=cert-manager \
  ttl=1h
```

Now cert-manager's service account can authenticate to Vault and request certificates.

## Creating a Vault Issuer

Configure an Issuer that uses Vault as the certificate authority:

```yaml
# vault-issuer.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-issuer
  namespace: default
spec:
  vault:
    # Vault server URL
    server: https://vault.example.com:8200

    # Path to PKI role for certificate signing
    path: pki_int/sign/example-dot-com

    # Kubernetes authentication configuration
    auth:
      kubernetes:
        # Vault Kubernetes auth mount path
        mountPath: /v1/auth/kubernetes

        # Kubernetes auth role name
        role: cert-manager

        # Service account to use for authentication
        serviceAccountRef:
          name: cert-manager
```

Apply the Issuer:

```bash
kubectl apply -f vault-issuer.yaml

# Check Issuer status
kubectl get issuer vault-issuer -n default
kubectl describe issuer vault-issuer -n default
```

For cluster-wide access, create a ClusterIssuer instead:

```yaml
# vault-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/example-dot-com
    auth:
      kubernetes:
        mountPath: /v1/auth/kubernetes
        role: cert-manager
        # For ClusterIssuer, specify the namespace of service account
        secretRef:
          name: cert-manager-vault-token
          key: token
```

## Requesting Certificates from Vault

Request a certificate using the Vault Issuer:

```yaml
# app-certificate-vault.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-vault-cert
  namespace: default
spec:
  # Secret to store certificate
  secretName: app-vault-tls

  # Certificate parameters
  duration: 720h # 30 days
  renewBefore: 240h # 10 days

  # Reference to Vault Issuer
  issuerRef:
    name: vault-issuer
    kind: Issuer

  # Certificate subject
  commonName: app.example.com
  dnsNames:
  - app.example.com
  - app.internal.example.com

  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always
```

Apply the certificate:

```bash
kubectl apply -f app-certificate-vault.yaml

# Monitor certificate issuance
kubectl get certificate app-vault-cert -w

# Check certificate details
kubectl describe certificate app-vault-cert

# View the secret
kubectl get secret app-vault-tls -o yaml
```

cert-manager authenticates to Vault using the Kubernetes auth method, requests a certificate from the specified PKI path, and stores it in the secret.

## Using Vault CA Bundle

Applications often need to trust certificates issued by your Vault CA. Configure cert-manager to include the CA certificate:

```yaml
# certificate-with-ca-bundle.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-with-ca
  namespace: default
spec:
  secretName: app-with-ca-tls
  issuerRef:
    name: vault-issuer
    kind: Issuer
  commonName: app.example.com
  dnsNames:
  - app.example.com

  # Include CA certificate in secret
  secretTemplate:
    annotations:
      cert-manager.io/allow-direct-injection: "true"
```

The resulting secret contains:
- tls.crt: the issued certificate
- tls.key: the private key
- ca.crt: the CA certificate chain

Applications can use ca.crt to trust certificates issued by the same Vault CA.

## Advanced Vault Configuration

### Using AppRole Authentication

For production, consider AppRole authentication instead of Kubernetes auth:

```bash
# Enable AppRole auth
vault auth enable approle

# Create AppRole for cert-manager
vault write auth/approle/role/cert-manager \
  token_policies="cert-manager" \
  token_ttl=1h \
  token_max_ttl=4h

# Get RoleID
vault read auth/approle/role/cert-manager/role-id

# Generate SecretID
vault write -f auth/approle/role/cert-manager/secret-id
```

Create a secret with AppRole credentials:

```bash
kubectl create secret generic vault-approle \
  --from-literal=roleId=<role-id> \
  --from-literal=secretId=<secret-id> \
  -n cert-manager
```

Configure the Issuer to use AppRole:

```yaml
# vault-issuer-approle.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-approle-issuer
  namespace: default
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/example-dot-com
    auth:
      appRole:
        path: /v1/auth/approle
        roleId: <role-id>
        secretRef:
          name: vault-approle
          key: secretId
```

### Using Token Authentication

For testing or simple setups, use direct token authentication:

```bash
# Create a token with cert-manager policy
vault token create -policy=cert-manager -period=24h

# Create secret with token
kubectl create secret generic vault-token \
  --from-literal=token=<vault-token> \
  -n cert-manager
```

Configure Issuer with token auth:

```yaml
# vault-issuer-token.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-token-issuer
  namespace: default
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/example-dot-com
    auth:
      tokenSecretRef:
        name: vault-token
        key: token
```

Token auth is simpler but requires token renewal management.

## Configuring TLS for Vault Connection

If your Vault server uses TLS (recommended), configure cert-manager to trust Vault's certificate:

```yaml
# vault-issuer-tls.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-tls-issuer
  namespace: default
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/example-dot-com

    # CA bundle to trust Vault's TLS certificate
    caBundle: <base64-encoded-ca-cert>

    auth:
      kubernetes:
        mountPath: /v1/auth/kubernetes
        role: cert-manager
        serviceAccountRef:
          name: cert-manager
```

Get the CA bundle:

```bash
# Get Vault's CA certificate and encode it
kubectl get secret vault-tls -n vault -o jsonpath='{.data.ca\.crt}'
```

## Multiple PKI Paths and Roles

For different certificate types, create multiple Issuers pointing to different Vault roles:

```yaml
# Short-lived certificates for services
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-short-lived
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/short-lived
    auth:
      kubernetes:
        mountPath: /v1/auth/kubernetes
        role: cert-manager
---
# Long-lived certificates for infrastructure
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-long-lived
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/long-lived
    auth:
      kubernetes:
        mountPath: /v1/auth/kubernetes
        role: cert-manager
```

Applications choose the appropriate issuer based on their certificate lifetime requirements.

## Monitoring and Troubleshooting

Check Vault audit logs for certificate issuance activity:

```bash
# Enable Vault audit logging
vault audit enable file file_path=/vault/logs/audit.log

# View certificate issuance events
tail -f /vault/logs/audit.log | grep pki_int
```

Debug cert-manager Vault integration:

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager | grep vault

# Verify service account can authenticate
kubectl exec -it -n cert-manager deployment/cert-manager -- /bin/sh
vault login -method=kubernetes role=cert-manager
```

Common issues:
- Authentication failures: check Kubernetes auth configuration and service account bindings
- Permission errors: verify Vault policies grant required PKI operations
- Role not found: ensure PKI role exists and matches the path in Issuer configuration

## Best Practices

Use intermediate CAs instead of signing certificates directly with the root CA. This limits blast radius if the intermediate CA is compromised.

Implement appropriate certificate TTLs based on security requirements. Shorter TTLs improve security but increase renewal frequency.

Enable Vault audit logging to track all certificate operations for compliance and security monitoring.

Use Kubernetes auth or AppRole instead of tokens for production. Service account tokens or AppRole provide better security than long-lived tokens.

Configure multiple Vault Issuers for different trust domains or certificate policies. This enables policy-driven certificate management.

## Conclusion

Integrating cert-manager with HashiCorp Vault provides enterprise-grade certificate management with fine-grained access control and comprehensive audit trails. Vault's PKI engine combined with cert-manager's automation creates a powerful platform for managing internal certificates at scale.

This integration is essential for organizations requiring strict certificate governance, custom CAs, or compliance with specific security standards. The combination of Vault's security features with cert-manager's Kubernetes-native automation delivers production-ready internal PKI.
