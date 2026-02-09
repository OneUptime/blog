# How to Use cert-manager SelfSigned Issuer for Development and Testing Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cert-manager, TLS, Development

Description: Learn how to configure and use cert-manager's SelfSigned issuer to generate self-signed certificates for development, testing, and internal testing environments.

---

When developing and testing applications that require TLS certificates, you don't always need production-grade certificates from public certificate authorities. Self-signed certificates provide a quick, cost-free way to enable HTTPS in development environments, run integration tests, and validate certificate-based authentication flows.

cert-manager's SelfSigned issuer makes creating and managing self-signed certificates straightforward. In this guide, you'll learn how to set up SelfSigned issuers, generate certificates for various use cases, and understand when self-signed certificates are appropriate.

## Understanding SelfSigned Issuers

A SelfSigned issuer in cert-manager creates certificates that are signed by their own private key rather than a certificate authority. These certificates function identically to CA-signed certificates in terms of encryption but lack the trust chain that browsers and systems recognize.

Self-signed certificates are ideal for:

- Local development environments
- Internal testing and staging systems
- Service-to-service communication in isolated networks
- Testing certificate rotation and renewal logic
- Creating root CA certificates for internal PKI
- CI/CD pipeline testing

They should not be used for production services exposed to external users, as browsers will display security warnings and API clients will reject the connections by default.

## Creating a SelfSigned ClusterIssuer

Start by creating a basic SelfSigned ClusterIssuer that can issue certificates cluster-wide:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
```

The configuration is minimal because SelfSigned issuers don't require authentication credentials, ACME servers, or external dependencies. Apply this issuer:

```bash
kubectl apply -f selfsigned-clusterissuer.yaml

# Verify the issuer is ready
kubectl get clusterissuer selfsigned-issuer
```

You should see output indicating the issuer is ready:

```
NAME                READY   AGE
selfsigned-issuer   True    5s
```

## Issuing Basic Self-Signed Certificates

Create a certificate resource that references the SelfSigned issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dev-tls
  namespace: default
spec:
  secretName: dev-tls-secret
  duration: 2160h  # 90 days
  renewBefore: 720h  # Renew 30 days before expiry
  isCA: false
  privateKey:
    algorithm: RSA
    encoding: PKCS1
    size: 2048
  usages:
    - server auth
    - client auth
  dnsNames:
    - example.local
    - api.example.local
    - "*.apps.example.local"
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
    group: cert-manager.io
```

Apply the certificate:

```bash
kubectl apply -f dev-certificate.yaml

# Watch certificate creation
kubectl get certificate dev-tls -w

# Once ready, inspect the secret
kubectl get secret dev-tls-secret -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

The certificate will be automatically created and stored in the specified secret.

## Using Self-Signed Certificates with Ingress

Configure an Ingress resource to use your self-signed certificate:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dev-app-ingress
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: selfsigned-issuer
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.local
    secretName: dev-app-tls
  rules:
  - host: app.example.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dev-app
            port:
              number: 80
```

cert-manager will automatically create the certificate and populate the secret. Test the ingress:

```bash
# Add to /etc/hosts
echo "127.0.0.1 app.example.local" | sudo tee -a /etc/hosts

# Port-forward to ingress controller
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8443:443

# Test with curl (accepting self-signed cert)
curl -k https://app.example.local:8443
```

## Creating a Self-Signed Root CA

For more realistic testing, create a self-signed root CA, then issue certificates from it:

```yaml
# First, create a self-signed root CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: root-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: Development Root CA
  secretName: root-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  duration: 87600h  # 10 years
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
# Then create a CA issuer using the root CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: dev-ca-issuer
spec:
  ca:
    secretName: root-ca-secret
```

Apply this configuration:

```bash
kubectl apply -f root-ca-setup.yaml

# Wait for the root CA certificate to be ready
kubectl wait --for=condition=ready certificate/root-ca -n cert-manager --timeout=60s

# Verify the CA issuer is ready
kubectl get clusterissuer dev-ca-issuer
```

Now issue certificates from your CA issuer instead of directly self-signing:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: service-tls
  namespace: default
spec:
  secretName: service-tls-secret
  duration: 2160h
  renewBefore: 720h
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
    - client auth
  dnsNames:
    - service.example.local
  issuerRef:
    name: dev-ca-issuer
    kind: ClusterIssuer
```

This approach provides certificates with a proper trust chain, making them more realistic for testing.

## Configuring Namespace-Scoped Issuers

For multi-tenant environments, create namespace-scoped SelfSigned issuers:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned
  namespace: team-a
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned
  namespace: team-b
spec:
  selfSigned: {}
```

Teams can then request certificates without cluster-wide permissions:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: team-a-cert
  namespace: team-a
spec:
  secretName: team-a-tls
  dnsNames:
    - team-a.example.local
  issuerRef:
    name: selfsigned
    kind: Issuer
```

## Generating Certificates for Testing mTLS

Create client and server certificates for mutual TLS testing:

```yaml
# Server certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mtls-server
  namespace: default
spec:
  secretName: mtls-server-tls
  usages:
    - server auth
  dnsNames:
    - server.example.local
  issuerRef:
    name: dev-ca-issuer
    kind: ClusterIssuer
---
# Client certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mtls-client
  namespace: default
spec:
  secretName: mtls-client-tls
  usages:
    - client auth
  commonName: client-app
  issuerRef:
    name: dev-ca-issuer
    kind: ClusterIssuer
```

Test mTLS with these certificates:

```bash
# Extract certificates and keys
kubectl get secret mtls-server-tls -o jsonpath='{.data.tls\.crt}' | base64 -d > server.crt
kubectl get secret mtls-server-tls -o jsonpath='{.data.tls\.key}' | base64 -d > server.key
kubectl get secret mtls-client-tls -o jsonpath='{.data.tls\.crt}' | base64 -d > client.crt
kubectl get secret mtls-client-tls -o jsonpath='{.data.tls\.key}' | base64 -d > client.key
kubectl get secret root-ca-secret -n cert-manager -o jsonpath='{.data.tls\.crt}' | base64 -d > ca.crt

# Start a test server requiring mTLS
openssl s_server -accept 8443 -cert server.crt -key server.key -CAfile ca.crt -Verify 1

# Connect as a client (in another terminal)
openssl s_client -connect localhost:8443 -cert client.crt -key client.key -CAfile ca.crt
```

## Automating Certificate Distribution in CI/CD

Use SelfSigned certificates in continuous integration pipelines:

```yaml
# .gitlab-ci.yml example
test:
  stage: test
  before_script:
    - kubectl apply -f selfsigned-issuer.yaml
    - kubectl apply -f test-certificate.yaml
    - kubectl wait --for=condition=ready certificate/test-cert --timeout=60s
    - kubectl get secret test-cert-tls -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/cert.pem
  script:
    - npm test -- --cert=/tmp/cert.pem
```

## Trusting Self-Signed Certificates Locally

For local development, add the root CA to your system's trust store:

```bash
# macOS
kubectl get secret root-ca-secret -n cert-manager -o jsonpath='{.data.tls\.crt}' | base64 -d > dev-ca.crt
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain dev-ca.crt

# Linux (Ubuntu/Debian)
kubectl get secret root-ca-secret -n cert-manager -o jsonpath='{.data.tls\.crt}' | base64 -d > dev-ca.crt
sudo cp dev-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Windows (PowerShell as Admin)
kubectl get secret root-ca-secret -n cert-manager -o jsonpath='{.data.tls\.crt}' | base64 -d > dev-ca.crt
Import-Certificate -FilePath dev-ca.crt -CertStoreLocation Cert:\LocalMachine\Root
```

After trusting the root CA, all certificates issued from it will be trusted by your local browser and tools.

## Best Practices for Development Certificates

Follow these practices when using self-signed certificates:

1. **Use CA hierarchies** - Create a root CA and issue from it rather than directly self-signing
2. **Set appropriate lifetimes** - Use shorter durations (90 days) to test renewal logic
3. **Enable automatic renewal** - Configure `renewBefore` to test renewal automation
4. **Separate by environment** - Use different issuers for dev, test, and staging
5. **Never use in production** - Self-signed certificates should never reach production
6. **Document trust requirements** - Clearly document when developers need to trust certificates
7. **Clean up regularly** - Remove old certificates and secrets to avoid clutter

## Troubleshooting Self-Signed Certificates

Common issues and solutions:

```bash
# Certificate not being created
kubectl describe certificate dev-tls
kubectl logs -n cert-manager deployment/cert-manager -f

# Check certificate request status
kubectl get certificaterequest
kubectl describe certificaterequest <name>

# Verify issuer is working
kubectl get clusterissuer selfsigned-issuer -o yaml

# Manually trigger renewal
kubectl annotate certificate dev-tls cert-manager.io/issue-temporary-certificate="true"
```

## Conclusion

cert-manager's SelfSigned issuer provides a powerful tool for generating certificates in development and testing environments. By creating CA hierarchies, automating certificate issuance, and properly configuring trust chains, you can build realistic testing scenarios without depending on external certificate authorities.

Self-signed certificates enable fast iteration during development, comprehensive testing of certificate-based features, and cost-effective staging environments. Understanding when and how to use them effectively is an essential skill for Kubernetes developers working with TLS-enabled applications.
