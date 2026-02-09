# How to Use cert-manager CA Issuer for Self-Signed Internal Certificate Authority

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to configure cert-manager CA Issuer to create and manage internal certificate authorities for self-signed certificates in Kubernetes environments.

---

Not every certificate needs to come from a public certificate authority. Internal services, development environments, and air-gapped systems often require self-signed certificates issued by an internal CA. cert-manager's CA Issuer makes managing internal PKI infrastructure straightforward by automating certificate issuance from a root or intermediate CA stored as a Kubernetes secret.

The CA Issuer is perfect for scenarios where you control both certificate issuers and consumers. Microservices communicating within a cluster, internal APIs, development environments, and testing infrastructure all benefit from internal CAs without the complexity of external certificate authorities.

This guide shows how to create an internal CA, configure cert-manager CA Issuers, and implement proper certificate management for internal services.

## Understanding CA Issuer Use Cases

CA Issuers work best when:
- Services communicate only within your infrastructure
- You control all certificate consumers and can distribute the CA certificate
- External validation isn't required
- Cost optimization matters (no charges for certificate issuance)
- Air-gapped environments prevent external CA access

Common use cases include:
- Service-to-service mutual TLS within Kubernetes
- Internal APIs and dashboards
- Development and testing environments
- CI/CD pipeline certificates
- Database client certificates

## Creating a Root CA

Start by creating a self-signed root certificate authority. First, generate the CA certificate and private key:

```bash
# Generate private key for CA
openssl genrsa -out ca.key 4096

# Create self-signed root certificate (valid 10 years)
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt -subj \
  "/C=US/ST=California/L=San Francisco/O=Example Org/OU=IT/CN=Example Root CA"

# Verify the certificate
openssl x509 -in ca.crt -text -noout
```

Create a Kubernetes secret containing the CA certificate and private key:

```bash
# Create secret in cert-manager namespace
kubectl create secret tls example-ca-key-pair \
  --cert=ca.crt \
  --key=ca.key \
  -n cert-manager

# Verify secret creation
kubectl get secret example-ca-key-pair -n cert-manager
```

The CA secret must reside in the same namespace as the Issuer (or cert-manager namespace for ClusterIssuer).

## Creating a CA Issuer

Configure an Issuer that uses the CA certificate for signing:

```yaml
# ca-issuer.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: ca-issuer
  namespace: default
spec:
  ca:
    # Reference to secret containing CA certificate and private key
    secretName: example-ca-key-pair
```

Apply the Issuer:

```bash
kubectl apply -f ca-issuer.yaml

# Check Issuer status
kubectl get issuer ca-issuer -n default
kubectl describe issuer ca-issuer -n default
```

For cluster-wide certificate issuance, create a ClusterIssuer:

```yaml
# ca-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ca-issuer
spec:
  ca:
    # Secret must be in cert-manager namespace for ClusterIssuer
    secretName: example-ca-key-pair
```

ClusterIssuers can issue certificates in any namespace, making them ideal for shared internal CAs.

## Issuing Certificates from CA Issuer

Request certificates from the CA Issuer:

```yaml
# service-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-service-cert
  namespace: default
spec:
  # Secret to store certificate
  secretName: internal-service-tls

  # Certificate validity (shorter than CA validity)
  duration: 2160h # 90 days
  renewBefore: 720h # 30 days

  # Reference to CA Issuer
  issuerRef:
    name: ca-issuer
    kind: Issuer

  # Certificate subject
  commonName: internal-service.default.svc.cluster.local

  # Subject Alternative Names
  dnsNames:
  - internal-service.default.svc.cluster.local
  - internal-service
  - internal-service.default

  # IP addresses if needed
  ipAddresses:
  - 10.0.1.100

  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048

  # Key usages
  usages:
  - digital signature
  - key encipherment
  - server auth
  - client auth
```

Apply the certificate:

```bash
kubectl apply -f service-certificate.yaml

# Watch certificate creation
kubectl get certificate internal-service-cert -w

# Verify certificate issued
kubectl describe certificate internal-service-cert
```

Certificate issuance from CA Issuer happens instantly since no external validation is required. cert-manager simply signs the certificate with the CA private key.

## Creating an Intermediate CA

For production environments, use an intermediate CA instead of signing directly with the root CA. This limits exposure if the intermediate CA is compromised:

```bash
# Generate intermediate CA private key
openssl genrsa -out intermediate-ca.key 4096

# Create certificate signing request for intermediate CA
openssl req -new -key intermediate-ca.key -out intermediate-ca.csr -subj \
  "/C=US/ST=California/L=San Francisco/O=Example Org/OU=IT/CN=Example Intermediate CA"

# Sign intermediate CA with root CA (valid 5 years)
openssl x509 -req -days 1825 \
  -in intermediate-ca.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out intermediate-ca.crt \
  -extensions v3_intermediate \
  -extfile <(cat <<EOF
[v3_intermediate]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,digitalSignature,keyCertSign,cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
EOF
)

# Create certificate bundle (intermediate + root)
cat intermediate-ca.crt ca.crt > intermediate-ca-bundle.crt

# Create secret for intermediate CA
kubectl create secret tls intermediate-ca-key-pair \
  --cert=intermediate-ca-bundle.crt \
  --key=intermediate-ca.key \
  -n cert-manager
```

Create a ClusterIssuer using the intermediate CA:

```yaml
# intermediate-ca-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: intermediate-ca-issuer
spec:
  ca:
    secretName: intermediate-ca-key-pair
```

Now certificates issued by this ClusterIssuer include the full chain (leaf certificate, intermediate CA, root CA).

## Distributing CA Certificates to Applications

Applications need to trust your internal CA. Several approaches exist for distributing the CA certificate:

### Method 1: ConfigMap with CA Certificate

```bash
# Create ConfigMap with CA certificate
kubectl create configmap internal-ca-cert \
  --from-file=ca.crt \
  -n default
```

Mount the ConfigMap in application pods:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        volumeMounts:
        - name: ca-cert
          mountPath: /etc/ssl/certs/internal-ca.crt
          subPath: ca.crt
          readOnly: true
        env:
        - name: SSL_CERT_FILE
          value: /etc/ssl/certs/internal-ca.crt
      volumes:
      - name: ca-cert
        configMap:
          name: internal-ca-cert
```

### Method 2: Include CA in Certificate Secret

Configure cert-manager to include the CA certificate in the secret:

```yaml
# certificate-with-ca.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert-with-ca
  namespace: default
spec:
  secretName: app-tls-with-ca
  issuerRef:
    name: ca-issuer
    kind: Issuer
  commonName: app.default.svc.cluster.local
  dnsNames:
  - app.default.svc.cluster.local

  # Certificate secret will include ca.crt
  secretTemplate:
    labels:
      app: myapp
```

The resulting secret contains tls.crt, tls.key, and ca.crt. Applications can read ca.crt for trust validation.

## Using cert-manager Trust Manager

cert-manager trust-manager automates CA certificate distribution across namespaces:

```bash
# Install trust-manager
kubectl apply -f https://github.com/cert-manager/trust-manager/releases/download/v0.7.0/trust-manager.yaml
```

Create a Bundle resource:

```yaml
# ca-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: internal-ca-bundle
spec:
  sources:
  - secret:
      name: example-ca-key-pair
      key: tls.crt
  target:
    configMap:
      key: ca-bundle.crt
```

trust-manager creates a ConfigMap named internal-ca-bundle in all namespaces containing the CA certificate. Applications can mount this ConfigMap for CA trust.

## Certificate Templates for Common Scenarios

### Server Authentication Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: server-cert
spec:
  secretName: server-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  commonName: api.example.internal
  dnsNames:
  - api.example.internal
  duration: 2160h
  renewBefore: 720h
  usages:
  - digital signature
  - key encipherment
  - server auth
```

### Client Authentication Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: client-cert
spec:
  secretName: client-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  commonName: client-app
  duration: 720h # 30 days
  renewBefore: 168h # 7 days
  usages:
  - digital signature
  - key encipherment
  - client auth
```

### Mutual TLS Certificate (Server + Client Auth)

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mtls-cert
spec:
  secretName: mtls-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  commonName: service.default.svc.cluster.local
  dnsNames:
  - service.default.svc.cluster.local
  duration: 2160h
  renewBefore: 720h
  usages:
  - digital signature
  - key encipherment
  - server auth
  - client auth
```

## CA Certificate Rotation

Rotating the CA certificate requires careful planning:

1. Create new CA certificate
2. Create new Issuer with new CA
3. Configure applications to trust both old and new CAs
4. Migrate certificates to new Issuer
5. Remove old CA trust after all certificates migrated

```bash
# Generate new CA
openssl genrsa -out new-ca.key 4096
openssl req -new -x509 -days 3650 -key new-ca.key -out new-ca.crt -subj \
  "/C=US/ST=California/L=San Francisco/O=Example Org/OU=IT/CN=Example Root CA v2"

# Create secret for new CA
kubectl create secret tls new-ca-key-pair \
  --cert=new-ca.crt \
  --key=new-ca.key \
  -n cert-manager

# Create new Issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: new-ca-issuer
spec:
  ca:
    secretName: new-ca-key-pair
EOF
```

Update Certificate resources to use the new Issuer gradually, monitoring each migration step.

## Monitoring CA Issuer Certificates

Monitor internal certificates like any other:

```bash
# List certificates from CA Issuer
kubectl get certificates --all-namespaces \
  -o json | jq -r '.items[] |
  select(.spec.issuerRef.name == "ca-issuer") |
  "\(.metadata.namespace) \(.metadata.name) \(.status.notAfter)"'

# Check CA certificate expiration
openssl x509 -in ca.crt -noout -enddate
```

Set up alerts for CA certificate expiration. If the CA expires, all issued certificates become invalid regardless of their individual expiration dates.

## Best Practices

Use intermediate CAs for production. This limits damage if a CA is compromised, as you can revoke only the intermediate CA.

Set CA certificate validity longer than leaf certificates. The CA should outlive all certificates it issues.

Store CA private keys securely. Consider using Kubernetes secrets encryption at rest or external secret management systems.

Document CA certificate distribution procedures. Teams need to know how to configure applications to trust your internal CA.

Implement proper CA rotation procedures before the CA expires. Don't wait until the last minute to plan rotation.

Use separate CAs for different trust domains. Development, staging, and production should have separate CAs.

Monitor CA certificate expiration proactively. Set alerts at least 90 days before CA expiration.

## Conclusion

cert-manager CA Issuer provides a simple, effective solution for internal certificate management. By automating certificate issuance from a self-signed CA, you eliminate manual certificate generation while maintaining full control over your PKI infrastructure.

This approach works excellently for internal services, development environments, and scenarios where you control both certificate issuers and consumers. Combined with proper CA certificate distribution and monitoring, it delivers production-ready certificate management for internal infrastructure.
