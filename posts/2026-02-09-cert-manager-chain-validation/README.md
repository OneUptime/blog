# How to Configure cert-manager Certificate Chain Validation and Trust Anchors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cert-manager, TLS, Security

Description: Learn how to configure certificate chain validation, trust anchors, and intermediate certificates in cert-manager to ensure proper TLS certificate verification in Kubernetes.

---

Certificate chain validation is critical for establishing trust in TLS connections. When a service presents a certificate, clients must verify not only the certificate itself but also the entire chain of trust back to a trusted root certificate authority. Misconfigurations in certificate chains lead to connection failures, security warnings, and potential vulnerabilities.

cert-manager handles certificate issuance but validating and distributing trust anchors requires additional configuration. This guide covers how to properly configure certificate chains, distribute CA bundles, and ensure clients can verify certificates issued by cert-manager.

## Understanding Certificate Chain Validation

A complete certificate chain typically includes:

1. **End-entity certificate** - The server or client certificate presented during TLS handshake
2. **Intermediate certificates** - One or more CA certificates that bridge the end-entity to the root
3. **Root CA certificate** - The trust anchor that clients must have in their trust store

When a client validates a certificate, it:
- Verifies the signature of the end-entity certificate using the intermediate CA's public key
- Verifies each intermediate certificate's signature using the next CA in the chain
- Verifies the final intermediate certificate is signed by a trusted root CA
- Checks certificate validity periods, revocation status, and usage constraints

If any step fails, the connection is rejected.

## Configuring Intermediate Certificates in cert-manager

Many certificate authorities use intermediate CAs to sign certificates. cert-manager must include these intermediate certificates in the issued certificate bundle.

When using an ACME issuer like Let's Encrypt, cert-manager automatically includes the correct intermediate certificates:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

Verify the complete chain is present:

```bash
# Get the certificate from a secret
kubectl get secret example-tls -o jsonpath='{.data.tls\.crt}' | base64 -d > cert.pem

# Check the chain
openssl crl2pkcs7 -nocrl -certfile cert.pem | openssl pkcs7 -print_certs -text -noout | grep Subject:
```

You should see multiple certificates: your end-entity certificate and intermediate CA certificates.

## Using CA Issuers with Custom Certificate Chains

When using a CA issuer backed by your own PKI, you must configure the certificate chain explicitly:

```yaml
# First, create a root CA
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: root-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: "Internal Root CA"
  secretName: root-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  duration: 87600h  # 10 years
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
# Create an intermediate CA
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: intermediate-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: "Internal Intermediate CA"
  secretName: intermediate-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  duration: 43800h  # 5 years
  issuerRef:
    name: root-ca-issuer
    kind: ClusterIssuer
---
# Create an issuer using the intermediate CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: intermediate-ca-issuer
spec:
  ca:
    secretName: intermediate-ca-secret
```

The CA issuer in cert-manager automatically bundles the intermediate certificate with issued certificates.

## Configuring Trust Anchors with trust-manager

trust-manager is a companion project to cert-manager that distributes trust anchors across your cluster. Install trust-manager:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install trust-manager jetstack/trust-manager \
  --namespace cert-manager \
  --set app.trust.namespace=cert-manager
```

Create a Bundle resource to distribute your root CA:

```yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: internal-ca-bundle
spec:
  sources:
  # Include the root CA from a secret
  - secret:
      name: root-ca-secret
      key: tls.crt
  # Optionally include system CAs
  - useDefaultCAs: true
  target:
    # Distribute as ConfigMap to all namespaces
    configMap:
      key: ca-bundle.crt
    # Also distribute as Secret
    secret:
      key: ca-bundle.crt
    # Inject into namespaces with specific labels
    namespaceSelector:
      matchLabels:
        trust.cert-manager.io/inject: "true"
```

Apply the bundle:

```bash
kubectl apply -f ca-bundle.yaml

# Verify the bundle was created
kubectl get bundle internal-ca-bundle

# Check that ConfigMaps were created in labeled namespaces
kubectl label namespace default trust.cert-manager.io/inject=true
kubectl get configmap -n default | grep internal-ca-bundle
```

## Injecting CA Bundles into Pods

Mount the CA bundle into application pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        # Point to the CA bundle
        - name: SSL_CERT_FILE
          value: /etc/ssl/certs/ca-bundle.crt
        volumeMounts:
        - name: ca-bundle
          mountPath: /etc/ssl/certs
          readOnly: true
      volumes:
      - name: ca-bundle
        configMap:
          name: internal-ca-bundle
          items:
          - key: ca-bundle.crt
            path: ca-bundle.crt
```

Applications using standard TLS libraries will automatically trust certificates signed by CAs in the bundle.

## Validating Certificate Chains in Applications

Configure applications to validate certificate chains properly:

### Go Application

```go
package main

import (
    "crypto/tls"
    "crypto/x509"
    "io/ioutil"
    "net/http"
)

func createTLSClient(caBundlePath string) (*http.Client, error) {
    // Load CA bundle
    caCert, err := ioutil.ReadFile(caBundlePath)
    if err != nil {
        return nil, err
    }

    // Create certificate pool
    caCertPool := x509.NewCertPool()
    if !caCertPool.AppendCertsFromPEM(caCert) {
        return nil, fmt.Errorf("failed to append CA certificate")
    }

    // Configure TLS
    tlsConfig := &tls.Config{
        RootCAs: caCertPool,
        // Require and verify client certificates
        ClientAuth: tls.RequireAndVerifyClientCert,
        // Ensure certificate chain is validated
        InsecureSkipVerify: false,
    }

    transport := &http.Transport{
        TLSClientConfig: tlsConfig,
    }

    return &http.Client{Transport: transport}, nil
}
```

### Python Application

```python
import ssl
import requests

def create_ssl_context(ca_bundle_path):
    """Create SSL context with CA bundle validation"""
    context = ssl.create_default_context(cafile=ca_bundle_path)

    # Ensure certificate validation is enabled
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED

    return context

# Use with requests
session = requests.Session()
session.verify = '/etc/ssl/certs/ca-bundle.crt'
response = session.get('https://internal-service.example.com')
```

### Node.js Application

```javascript
const https = require('https');
const fs = require('fs');

// Load CA bundle
const caBundle = fs.readFileSync('/etc/ssl/certs/ca-bundle.crt');

// Configure HTTPS agent
const agent = new https.Agent({
  ca: caBundle,
  rejectUnauthorized: true,  // Enforce certificate validation
  checkServerIdentity: (hostname, cert) => {
    // Custom hostname validation if needed
    return undefined;  // No error
  }
});

// Make request with validation
https.get('https://internal-service.example.com', { agent }, (res) => {
  console.log('Connection validated successfully');
});
```

## Configuring Webhook Certificate Validation

Kubernetes admission webhooks require proper certificate chain validation. Configure webhook certificates:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-cert
  namespace: webhook-system
spec:
  secretName: webhook-tls
  duration: 2160h
  renewBefore: 720h
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
  dnsNames:
    - webhook-service.webhook-system.svc
    - webhook-service.webhook-system.svc.cluster.local
  issuerRef:
    name: intermediate-ca-issuer
    kind: ClusterIssuer
```

Configure the ValidatingWebhookConfiguration to trust the CA:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: my-webhook
  annotations:
    cert-manager.io/inject-ca-from: webhook-system/webhook-cert
webhooks:
- name: validate.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate
    # CA bundle will be injected by cert-manager
    caBundle: ""
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
```

cert-manager's CA injector will automatically populate the `caBundle` field with the certificate chain.

## Validating Certificate Chains Manually

Test certificate chain validation:

```bash
# Extract certificate and CA bundle
kubectl get secret example-tls -o jsonpath='{.data.tls\.crt}' | base64 -d > cert.pem
kubectl get configmap internal-ca-bundle -o jsonpath='{.data.ca-bundle\.crt}' > ca-bundle.pem

# Verify the chain
openssl verify -CAfile ca-bundle.pem cert.pem

# If successful, output will be:
# cert.pem: OK

# View the full chain
openssl s_client -connect service.example.com:443 -CAfile ca-bundle.pem -showcerts
```

Test certificate validation from a pod:

```bash
kubectl run test-cert --image=alpine/openssl --rm -it -- sh
/ # wget -O ca-bundle.crt https://example.com/ca-bundle.crt
/ # echo | openssl s_client -connect internal-service:443 -CAfile ca-bundle.crt
# Should show "Verify return code: 0 (ok)"
```

## Monitoring Certificate Chain Health

Create alerts for certificate chain issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-chain-alerts
  namespace: monitoring
spec:
  groups:
  - name: certificate-chains
    rules:
    - alert: CertificateChainInvalid
      expr: |
        probe_ssl_last_chain_info{chain_valid="false"} == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Invalid certificate chain detected"
        description: "Service {{ $labels.instance }} has an invalid certificate chain"

    - alert: CertificateChainIncomplete
      expr: |
        probe_ssl_last_chain_info{chain_depth="1"} == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Incomplete certificate chain"
        description: "Service {{ $labels.instance }} is not serving intermediate certificates"
```

## Troubleshooting Chain Validation Issues

Common issues and solutions:

```bash
# Issue: Certificate validation fails with "unable to get local issuer certificate"
# Solution: Ensure the CA bundle includes all intermediate and root certificates

# Check what's in the bundle
kubectl get configmap internal-ca-bundle -o jsonpath='{.data.ca-bundle\.crt}' | \
  openssl crl2pkcs7 -nocrl -certfile /dev/stdin | \
  openssl pkcs7 -print_certs -text -noout | \
  grep "Subject:"

# Issue: Webhook certificate validation fails
# Solution: Verify cert-manager CA injector is running

kubectl get pods -n cert-manager | grep cainjector
kubectl logs -n cert-manager deployment/cert-manager-cainjector

# Issue: Certificate chain incomplete
# Solution: Check the CA issuer includes intermediate certificates

kubectl get secret intermediate-ca-secret -n cert-manager -o yaml
```

## Best Practices

Follow these practices for certificate chain validation:

1. **Always include intermediates** - Ensure issued certificates include the complete chain
2. **Distribute root CAs** - Use trust-manager to distribute CA bundles consistently
3. **Validate chains in CI/CD** - Test certificate validation before deploying
4. **Monitor chain health** - Alert on invalid or incomplete chains
5. **Document trust requirements** - Clearly specify which CAs must be trusted
6. **Rotate CAs carefully** - Plan CA rotation to avoid breaking trust
7. **Use separate CAs per environment** - Different CAs for dev, staging, production

## Conclusion

Proper certificate chain validation is essential for secure TLS communications in Kubernetes. By configuring cert-manager to issue complete certificate chains, using trust-manager to distribute CA bundles, and ensuring applications validate certificates correctly, you build a robust PKI infrastructure.

Understanding how certificate chains work, how to validate them, and how to troubleshoot issues will help you maintain secure and reliable TLS communications across your cluster. Regular testing and monitoring of certificate chains prevents outages and security vulnerabilities.
