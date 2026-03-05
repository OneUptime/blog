# How to Manage Istio Configuration Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Secret, Security, Kubernetes, Configuration

Description: How to securely manage secrets used in Istio configuration including TLS certificates, JWT keys, and external service credentials.

---

Istio configuration often involves secrets. TLS certificates for gateways, JWT signing keys for request authentication, credentials for external services referenced in ServiceEntries. These secrets need to be managed carefully because leaking a gateway TLS certificate or a JWT key can have serious security consequences.

The challenge is that Istio expects secrets in specific formats and locations, and you need a workflow that keeps secrets out of git while still making them available to the cluster. Here is how to handle the common scenarios.

## Gateway TLS Certificates

Istio ingress gateways need TLS certificates to terminate HTTPS. The gateway references a Kubernetes secret by name:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: main-tls-cert
      hosts:
        - "*.example.com"
```

The secret `main-tls-cert` must exist in the same namespace as the ingress gateway (typically `istio-system`):

```bash
kubectl create secret tls main-tls-cert \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n istio-system
```

Never commit the certificate and key to git. Use one of the approaches below instead.

## Using cert-manager for Automatic Certificate Management

cert-manager is the best way to handle TLS certificates for Istio gateways. It automatically provisions and renews certificates from Let's Encrypt or your internal CA:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: main-tls-cert
  namespace: istio-system
spec:
  secretName: main-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - "example.com"
```

The Certificate resource tells cert-manager to create a Kubernetes secret named `main-tls-cert` with the TLS certificate and key. The gateway references this same secret name.

Set up the ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certs@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - dns01:
          cloudDNS:
            project: my-gcp-project
```

cert-manager handles renewal automatically, so you never have to worry about expired certificates.

## Using External Secrets Operator

For secrets that are not certificates, like API keys or credentials stored in a vault, use the External Secrets Operator:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: external-api-credentials
  namespace: istio-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: external-api-credentials
    template:
      type: Opaque
      data:
        token: "{{ .token }}"
  data:
    - secretKey: token
      remoteRef:
        key: secret/data/istio/external-api
        property: token
```

Set up the SecretStore to connect to your vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: https://vault.example.com
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: external-secrets
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Managing JWT Signing Keys

Istio's RequestAuthentication uses JWKS (JSON Web Key Sets) for JWT validation. You can reference a remote JWKS endpoint or store keys locally:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

Using a remote JWKS URI is preferred because you do not need to store the keys in the cluster at all. Istio fetches them at runtime.

If you need to use a local JWKS (for example, when the issuer is not reachable from the cluster), store it as a secret:

```bash
kubectl create secret generic jwt-jwks \
  --from-file=jwks.json=path/to/jwks.json \
  -n istio-system
```

Then reference it in the RequestAuthentication:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth-local
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  jwtRules:
    - issuer: "https://internal-auth.example.com"
      jwks: |
        { "keys": [{ ... }] }
```

## Sealed Secrets for GitOps

If you must store secrets in git (for full GitOps), use Sealed Secrets. They are encrypted and can only be decrypted by the controller in your cluster:

```bash
# Install kubeseal CLI
brew install kubeseal

# Create a sealed secret from a regular secret
kubectl create secret tls my-gateway-cert \
  --cert=cert.pem --key=key.pem \
  --dry-run=client -o yaml | \
  kubeseal --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  -o yaml > sealed-gateway-cert.yaml
```

The sealed secret YAML is safe to commit:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-gateway-cert
  namespace: istio-system
spec:
  encryptedData:
    tls.crt: AgBy3i...encrypted...
    tls.key: AgCtr8...encrypted...
  template:
    metadata:
      name: my-gateway-cert
      namespace: istio-system
    type: kubernetes.io/tls
```

## Rotating Secrets

Secret rotation is important for security. Here is how to handle it for different types:

### TLS Certificate Rotation

With cert-manager, rotation is automatic. Without it, you need a process:

```bash
#!/bin/bash
# Rotate gateway TLS certificate

# Create new secret with a temporary name
kubectl create secret tls main-tls-cert-new \
  --cert=new-cert.pem \
  --key=new-key.pem \
  -n istio-system

# Update the gateway to use new secret
kubectl patch gateway main-gateway -n istio-system \
  --type=json \
  -p='[{"op":"replace","path":"/spec/servers/0/tls/credentialName","value":"main-tls-cert-new"}]'

# Wait for Envoy to pick up the new cert (usually within a few seconds)
sleep 10

# Verify the new cert is in use
echo | openssl s_client -connect gateway-ip:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -dates

# Clean up old secret
kubectl delete secret main-tls-cert -n istio-system

# Rename new secret (optional, requires recreating)
kubectl get secret main-tls-cert-new -n istio-system -o yaml | \
  sed 's/main-tls-cert-new/main-tls-cert/' | \
  kubectl apply -f -
kubectl delete secret main-tls-cert-new -n istio-system

# Update gateway back to original name
kubectl patch gateway main-gateway -n istio-system \
  --type=json \
  -p='[{"op":"replace","path":"/spec/servers/0/tls/credentialName","value":"main-tls-cert"}]'
```

## RBAC for Secrets

Restrict who can read Istio-related secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-secrets-reader
  namespace: istio-system
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames:
      - main-tls-cert
      - jwt-jwks
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-secrets-admin
  namespace: istio-system
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Monitoring Secret Health

Set up alerts for expiring certificates and stale secrets:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: secret-health
  namespace: monitoring
spec:
  groups:
    - name: istio-secrets
      rules:
        - alert: TLSCertExpiringSoon
          expr: |
            (certmanager_certificate_expiration_timestamp_seconds - time()) < 7 * 24 * 3600
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "TLS certificate {{ $labels.name }} expires in less than 7 days"
```

Secrets management is one of those areas where doing it right from the start saves enormous headaches later. Use cert-manager for TLS certificates, External Secrets Operator for vault-stored credentials, and never commit plain-text secrets to git. The extra setup is worth the security and automation benefits.
