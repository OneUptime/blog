# How to configure Vault PKI secrets engine for certificate management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, PKI, TLS Certificates, Kubernetes, Certificate Management

Description: Master Vault's PKI secrets engine to automate TLS certificate issuance, rotation, and management for Kubernetes applications without external certificate authorities.

---

Managing TLS certificates manually is error-prone and time-consuming. Vault's PKI secrets engine acts as a certificate authority, dynamically generating certificates on demand with automatic expiration. This guide shows you how to set up Vault PKI for complete certificate lifecycle management in Kubernetes.

## Understanding Vault PKI

Vault's PKI engine can function as both a root CA and intermediate CA. It generates certificates, private keys, and certificate bundles dynamically based on defined roles and policies. Certificates are automatically issued with appropriate subject alternative names, key usage, and expiration times.

The PKI workflow operates like this: enable PKI secrets engine and generate root CA, create intermediate CA for operational use, define certificate roles with constraints, applications request certificates from Vault, Vault generates and returns certificate with private key, and certificates expire automatically without manual intervention.

## Setting Up Root CA

Initialize the PKI secrets engine:

```bash
# Enable PKI at root path
vault secrets enable pki

# Tune maximum lease TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root certificate
vault write -field=certificate pki/root/generate/internal \
  common_name="My Root CA" \
  ttl=87600h > root_ca.crt

# View the root certificate
openssl x509 -in root_ca.crt -text -noout

# Configure CA and CRL URLs
vault write pki/config/urls \
  issuing_certificates="http://vault.vault.svc.cluster.local:8200/v1/pki/ca" \
  crl_distribution_points="http://vault.vault.svc.cluster.local:8200/v1/pki/crl"
```

## Creating Intermediate CA

Use an intermediate CA for issuing certificates:

```bash
# Enable PKI for intermediate
vault secrets enable -path=pki_int pki

# Tune TTL
vault secrets tune -max-lease-ttl=43800h pki_int

# Generate intermediate CSR
vault write -format=json pki_int/intermediate/generate/internal \
  common_name="My Intermediate CA" \
  | jq -r '.data.csr' > pki_intermediate.csr

# Sign intermediate certificate with root CA
vault write -format=json pki/root/sign-intermediate \
  csr=@pki_intermediate.csr \
  format=pem_bundle \
  ttl=43800h \
  | jq -r '.data.certificate' > intermediate.cert.pem

# Set the signed certificate
vault write pki_int/intermediate/set-signed \
  certificate=@intermediate.cert.pem

# Configure URLs for intermediate CA
vault write pki_int/config/urls \
  issuing_certificates="http://vault.vault.svc.cluster.local:8200/v1/pki_int/ca" \
  crl_distribution_points="http://vault.vault.svc.cluster.local:8200/v1/pki_int/crl"
```

## Creating Certificate Roles

Define roles that control certificate properties:

```bash
# Role for application servers
vault write pki_int/roles/app-server \
  allowed_domains="app.example.com,*.app.example.com" \
  allow_subdomains=true \
  max_ttl="720h" \
  key_usage="DigitalSignature,KeyEncipherment" \
  ext_key_usage="ServerAuth"

# Role for client certificates
vault write pki_int/roles/app-client \
  allowed_domains="client.example.com" \
  allow_subdomains=true \
  max_ttl="720h" \
  key_usage="DigitalSignature" \
  ext_key_usage="ClientAuth"

# Role for service mesh
vault write pki_int/roles/service-mesh \
  allowed_domains="*.svc.cluster.local" \
  allow_subdomains=true \
  allow_glob_domains=true \
  max_ttl="168h" \
  key_usage="DigitalSignature,KeyEncipherment" \
  ext_key_usage="ServerAuth,ClientAuth"

# Wildcard role for development
vault write pki_int/roles/dev-wildcard \
  allowed_domains="*.dev.example.com" \
  allow_subdomains=true \
  allow_wildcard_certificates=true \
  max_ttl="168h"
```

## Issuing Certificates

Generate certificates using defined roles:

```bash
# Issue certificate for specific domain
vault write pki_int/issue/app-server \
  common_name="api.app.example.com" \
  ttl="720h"

# Issue with specific format
vault write -format=json pki_int/issue/app-server \
  common_name="api.app.example.com" \
  alt_names="api.app.example.com,www.api.app.example.com" \
  ttl="720h" > cert_bundle.json

# Extract components
cat cert_bundle.json | jq -r '.data.certificate' > server.crt
cat cert_bundle.json | jq -r '.data.private_key' > server.key
cat cert_bundle.json | jq -r '.data.issuing_ca' > ca.crt

# Verify certificate
openssl x509 -in server.crt -text -noout
openssl verify -CAfile ca.crt server.crt
```

## Integrating with Kubernetes Applications

Create a policy for certificate access:

```bash
vault policy write pki-issue - <<EOF
# Allow issuing certificates
path "pki_int/issue/app-server" {
  capabilities = ["create", "update"]
}

# Allow reading CA certificate
path "pki_int/ca" {
  capabilities = ["read"]
}
EOF

# Create Kubernetes auth role
vault write auth/kubernetes/role/app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=pki-issue \
  ttl=1h
```

## Using Vault Agent for Certificate Injection

Automatically inject certificates into pods:

```yaml
# app-with-tls.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-tls
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "app"

        # Inject TLS certificate
        vault.hashicorp.com/agent-inject-secret-tls.crt: "pki_int/issue/app-server"
        vault.hashicorp.com/agent-inject-template-tls.crt: |
          {{- with secret "pki_int/issue/app-server" "common_name=api.app.example.com" "ttl=720h" -}}
          {{ .Data.certificate }}
          {{- end -}}

        # Inject private key
        vault.hashicorp.com/agent-inject-secret-tls.key: "pki_int/issue/app-server"
        vault.hashicorp.com/agent-inject-template-tls.key: |
          {{- with secret "pki_int/issue/app-server" "common_name=api.app.example.com" "ttl=720h" -}}
          {{ .Data.private_key }}
          {{- end -}}

        # Inject CA certificate
        vault.hashicorp.com/agent-inject-secret-ca.crt: "pki_int/issue/app-server"
        vault.hashicorp.com/agent-inject-template-ca.crt: |
          {{- with secret "pki_int/issue/app-server" "common_name=api.app.example.com" "ttl=720h" -}}
          {{ .Data.issuing_ca }}
          {{- end -}}

        # Set file permissions
        vault.hashicorp.com/agent-inject-perms: "0600"
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: nginx:latest
        volumeMounts:
        - name: tls-config
          mountPath: /etc/nginx/ssl
          readOnly: true
      volumes:
      - name: tls-config
        emptyDir: {}
```

## Implementing Certificate Rotation

Automate certificate renewal before expiration:

```go
package main

import (
    "crypto/tls"
    "io/ioutil"
    "log"
    "time"

    vault "github.com/hashicorp/vault/api"
)

type CertManager struct {
    client     *vault.Client
    role       string
    commonName string
    certPath   string
    keyPath    string
    ttl        string
}

func (cm *CertManager) authenticate() error {
    jwt, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
    if err != nil {
        return err
    }

    params := map[string]interface{}{
        "jwt":  string(jwt),
        "role": "app",
    }

    secret, err := cm.client.Logical().Write("auth/kubernetes/login", params)
    if err != nil {
        return err
    }

    cm.client.SetToken(secret.Auth.ClientToken)
    return nil
}

func (cm *CertManager) issueCertificate() error {
    params := map[string]interface{}{
        "common_name": cm.commonName,
        "ttl":         cm.ttl,
    }

    secret, err := cm.client.Logical().Write("pki_int/issue/"+cm.role, params)
    if err != nil {
        return err
    }

    // Save certificate
    cert := secret.Data["certificate"].(string)
    if err := ioutil.WriteFile(cm.certPath, []byte(cert), 0600); err != nil {
        return err
    }

    // Save private key
    key := secret.Data["private_key"].(string)
    if err := ioutil.WriteFile(cm.keyPath, []byte(key), 0600); err != nil {
        return err
    }

    log.Println("Certificate issued successfully")
    return nil
}

func (cm *CertManager) checkAndRenew() {
    ticker := time.NewTicker(24 * time.Hour)
    defer ticker.Stop()

    for range ticker.C {
        // Load current certificate
        cert, err := tls.LoadX509KeyPair(cm.certPath, cm.keyPath)
        if err != nil {
            log.Printf("Error loading certificate: %v", err)
            cm.issueCertificate()
            continue
        }

        // Parse certificate to check expiration
        x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
        if err != nil {
            log.Printf("Error parsing certificate: %v", err)
            continue
        }

        // Renew if less than 7 days remaining
        daysRemaining := time.Until(x509Cert.NotAfter).Hours() / 24
        if daysRemaining < 7 {
            log.Printf("Certificate expiring in %.1f days, renewing", daysRemaining)
            cm.issueCertificate()
        }
    }
}

func main() {
    config := vault.DefaultConfig()
    config.Address = "http://vault.vault.svc.cluster.local:8200"

    client, err := vault.NewClient(config)
    if err != nil {
        log.Fatal(err)
    }

    cm := &CertManager{
        client:     client,
        role:       "app-server",
        commonName: "api.app.example.com",
        certPath:   "/etc/ssl/certs/server.crt",
        keyPath:    "/etc/ssl/private/server.key",
        ttl:        "720h",
    }

    cm.authenticate()
    cm.issueCertificate()

    // Start renewal checker
    go cm.checkAndRenew()

    // Your application logic
    select {}
}
```

## Creating Kubernetes Secrets from Certificates

Generate and store certificates as Kubernetes secrets:

```bash
#!/bin/bash
# generate-k8s-tls-secret.sh

NAMESPACE="default"
SECRET_NAME="app-tls"
COMMON_NAME="api.app.example.com"

# Get certificate from Vault
vault write -format=json pki_int/issue/app-server \
  common_name="$COMMON_NAME" \
  ttl="720h" > /tmp/cert.json

# Extract components
jq -r '.data.certificate' /tmp/cert.json > /tmp/tls.crt
jq -r '.data.private_key' /tmp/cert.json > /tmp/tls.key
jq -r '.data.ca_chain[]' /tmp/cert.json > /tmp/ca.crt

# Create or update Kubernetes secret
kubectl create secret tls $SECRET_NAME \
  --cert=/tmp/tls.crt \
  --key=/tmp/tls.key \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Clean up
rm /tmp/cert.json /tmp/tls.crt /tmp/tls.key /tmp/ca.crt

echo "TLS secret $SECRET_NAME created in namespace $NAMESPACE"
```

## Configuring CRL and OCSP

Enable certificate revocation checking:

```bash
# Configure CRL
vault write pki_int/config/crl \
  expiry="72h" \
  disable=false

# Enable auto-rebuild of CRL
vault write pki_int/config/crl \
  auto_rebuild=true \
  auto_rebuild_grace_period="12h"

# Manually rotate CRL
vault write -f pki_int/crl/rotate
```

Access CRL:

```bash
# Download CRL
curl http://vault.vault.svc.cluster.local:8200/v1/pki_int/crl/pem

# Verify CRL
openssl crl -in crl.pem -text -noout
```

## Revoking Certificates

Revoke compromised certificates:

```bash
# Revoke by serial number
vault write pki_int/revoke \
  serial_number="39:dd:2e:90:b7:23:1f:8d:d3:7d:31:c5:1b:da:84:d0:5b:65:31:58"

# Tidy revoked certificates
vault write pki_int/tidy \
  tidy_cert_store=true \
  tidy_revoked_certs=true \
  safety_buffer="72h"
```

Vault PKI eliminates manual certificate management by automating issuance, renewal, and revocation. By integrating with Kubernetes authentication and using Vault Agent for injection, your applications automatically receive valid TLS certificates without storing sensitive private keys in configuration. This approach provides production-grade certificate management with minimal operational overhead.
