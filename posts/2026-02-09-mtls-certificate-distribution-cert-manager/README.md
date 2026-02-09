# How to Implement Mutual TLS Certificate Distribution Using cert-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to implement mutual TLS (mTLS) certificate distribution with cert-manager to secure service-to-service communication with bidirectional authentication in Kubernetes.

---

Mutual TLS provides bidirectional authentication where both client and server present certificates to verify each other's identity. Unlike standard TLS where only the server authenticates, mTLS ensures both parties are who they claim to be, making it essential for zero-trust architectures and secure microservices communication.

cert-manager simplifies mTLS implementation by automating certificate issuance and distribution for both servers and clients. This guide shows how to set up comprehensive mTLS infrastructure using cert-manager, enabling secure service-to-service communication across your Kubernetes cluster.

## Understanding mTLS Architecture

Mutual TLS requires three certificate types:

Server certificates authenticate services to their clients. These certificates include DNS names or IP addresses identifying the service endpoints.

Client certificates authenticate clients to servers. These certificates typically include subject information identifying the client application or user.

CA certificates establish trust. Both clients and servers must trust the CA that issued certificates. In mTLS, clients verify server certificates against the CA, and servers verify client certificates against the same (or different) CA.

## Setting Up Internal CA for mTLS

Start by creating an internal CA for issuing mTLS certificates:

```bash
# Generate CA private key
openssl genrsa -out mtls-ca.key 4096

# Create self-signed CA certificate
openssl req -new -x509 -days 3650 -key mtls-ca.key -out mtls-ca.crt -subj \
  "/C=US/ST=California/O=Example Org/OU=Security/CN=mTLS Root CA"

# Create Kubernetes secret with CA
kubectl create secret tls mtls-ca-key-pair \
  --cert=mtls-ca.crt \
  --key=mtls-ca.key \
  -n cert-manager
```

Create a ClusterIssuer for mTLS certificates:

```yaml
# mtls-ca-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: mtls-ca-issuer
spec:
  ca:
    secretName: mtls-ca-key-pair
```

Apply the ClusterIssuer:

```bash
kubectl apply -f mtls-ca-issuer.yaml
kubectl get clusterissuer mtls-ca-issuer
```

## Issuing Server Certificates for mTLS

Create server certificates for your services:

```yaml
# server-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-server-cert
  namespace: production
spec:
  # Secret containing server certificate
  secretName: api-server-tls

  # Certificate lifecycle
  duration: 2160h # 90 days
  renewBefore: 720h # 30 days

  issuerRef:
    name: mtls-ca-issuer
    kind: ClusterIssuer

  # Server identity
  commonName: api.production.svc.cluster.local

  # DNS names for service access
  dnsNames:
  - api.production.svc.cluster.local
  - api.production.svc
  - api.production
  - api.example.com # External domain if exposed

  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always

  # Certificate usage for server authentication
  usages:
  - digital signature
  - key encipherment
  - server auth
```

Apply the certificate:

```bash
kubectl apply -f server-certificate.yaml

# Verify certificate creation
kubectl get certificate api-server-cert -n production
kubectl describe certificate api-server-cert -n production
```

## Issuing Client Certificates for mTLS

Create client certificates for applications:

```yaml
# client-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web-app-client-cert
  namespace: production
spec:
  # Secret containing client certificate
  secretName: web-app-client-tls

  # Certificate lifecycle
  duration: 720h # 30 days
  renewBefore: 168h # 7 days

  issuerRef:
    name: mtls-ca-issuer
    kind: ClusterIssuer

  # Client identity
  commonName: web-app

  # Subject identifying the client
  subject:
    organizations:
    - "Example Org"
    organizationalUnits:
    - "Web Services"

  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always

  # Certificate usage for client authentication
  usages:
  - digital signature
  - key encipherment
  - client auth
```

Apply the client certificate:

```bash
kubectl apply -f client-certificate.yaml

# Verify client certificate
kubectl get certificate web-app-client-cert -n production
```

Client certificates typically have shorter durations than server certificates since they represent specific applications or users.

## Distributing CA Certificate for Trust

Both clients and servers need the CA certificate to verify peer certificates. Create a ConfigMap with the CA certificate:

```bash
# Extract CA certificate from the CA secret
kubectl get secret mtls-ca-key-pair -n cert-manager \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > mtls-ca.crt

# Create ConfigMap with CA certificate
kubectl create configmap mtls-ca-bundle \
  --from-file=ca.crt=mtls-ca.crt \
  -n production
```

Applications mount this ConfigMap to access the CA certificate for verification.

## Configuring Server for mTLS

Configure your server application to require client certificates. Example nginx configuration:

```yaml
# nginx-mtls-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-mtls-config
  namespace: production
data:
  nginx.conf: |
    events {}
    http {
      server {
        listen 443 ssl;
        server_name api.example.com;

        # Server certificate and private key
        ssl_certificate /etc/tls/server/tls.crt;
        ssl_certificate_key /etc/tls/server/tls.key;

        # Require client certificate
        ssl_client_certificate /etc/tls/ca/ca.crt;
        ssl_verify_client on;
        ssl_verify_depth 2;

        # Client certificate verification
        if ($ssl_client_verify != SUCCESS) {
          return 403;
        }

        location / {
          # Pass client certificate info to backend
          proxy_set_header X-Client-Cert $ssl_client_cert;
          proxy_set_header X-Client-DN $ssl_client_s_dn;
          proxy_pass http://backend:8080;
        }
      }
    }
```

Deploy nginx with mTLS configuration:

```yaml
# nginx-mtls-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-mtls
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-mtls
  template:
    metadata:
      labels:
        app: nginx-mtls
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 443
          name: https
        volumeMounts:
        # Mount server certificate
        - name: server-tls
          mountPath: /etc/tls/server
          readOnly: true
        # Mount CA certificate
        - name: ca-bundle
          mountPath: /etc/tls/ca
          readOnly: true
        # Mount nginx configuration
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
          readOnly: true
      volumes:
      # Server certificate secret
      - name: server-tls
        secret:
          secretName: api-server-tls
      # CA certificate ConfigMap
      - name: ca-bundle
        configMap:
          name: mtls-ca-bundle
      # nginx configuration
      - name: nginx-config
        configMap:
          name: nginx-mtls-config
```

## Configuring Client for mTLS

Configure client applications to present certificates. Example using curl:

```bash
# Extract certificates from secrets
kubectl get secret web-app-client-tls -n production \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > client.crt

kubectl get secret web-app-client-tls -n production \
  -o jsonpath='{.data.tls\.key}' | base64 -d > client.key

kubectl get configmap mtls-ca-bundle -n production \
  -o jsonpath='{.data.ca\.crt}' > ca.crt

# Make mTLS request
curl --cert client.crt --key client.key --cacert ca.crt \
  https://api.example.com/endpoint
```

Example Python client with mTLS:

```python
import requests

# mTLS request
response = requests.get(
    'https://api.example.com/endpoint',
    cert=('/path/to/client.crt', '/path/to/client.key'),
    verify='/path/to/ca.crt'
)
print(response.text)
```

## Application Pod with mTLS Client

Configure a Kubernetes pod to make mTLS requests:

```yaml
# client-pod-mtls.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-client
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app-client
  template:
    metadata:
      labels:
        app: web-app-client
    spec:
      containers:
      - name: app
        image: web-app:latest
        env:
        # Paths to mTLS credentials
        - name: MTLS_CLIENT_CERT
          value: /etc/tls/client/tls.crt
        - name: MTLS_CLIENT_KEY
          value: /etc/tls/client/tls.key
        - name: MTLS_CA_CERT
          value: /etc/tls/ca/ca.crt
        volumeMounts:
        # Mount client certificate
        - name: client-tls
          mountPath: /etc/tls/client
          readOnly: true
        # Mount CA certificate
        - name: ca-bundle
          mountPath: /etc/tls/ca
          readOnly: true
      volumes:
      # Client certificate secret
      - name: client-tls
        secret:
          secretName: web-app-client-tls
      # CA certificate ConfigMap
      - name: ca-bundle
        configMap:
          name: mtls-ca-bundle
```

The application reads certificate paths from environment variables and uses them for mTLS connections.

## Bi-directional mTLS Service

For services that act as both client and server:

```yaml
# bidirectional-mtls-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: service-bidirectional-cert
  namespace: production
spec:
  secretName: service-bidirectional-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: mtls-ca-issuer
    kind: ClusterIssuer

  commonName: service.production.svc.cluster.local

  dnsNames:
  - service.production.svc.cluster.local
  - service.production.svc
  - service.production

  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always

  # Both server and client authentication
  usages:
  - digital signature
  - key encipherment
  - server auth
  - client auth
```

This certificate works for both receiving mTLS connections (server) and making mTLS connections (client).

## Automated Certificate Rotation

cert-manager handles certificate renewal automatically. Configure rotation policies:

```yaml
# auto-rotating-mtls-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rotating-service-cert
  namespace: production
spec:
  secretName: rotating-service-tls
  duration: 720h # 30 days
  renewBefore: 168h # 7 days

  issuerRef:
    name: mtls-ca-issuer
    kind: ClusterIssuer

  commonName: service.production.svc.cluster.local
  dnsNames:
  - service.production.svc.cluster.local

  # Rotate private key on renewal
  privateKey:
    rotationPolicy: Always
    algorithm: RSA
    size: 2048

  usages:
  - server auth
  - client auth
```

Applications must reload certificates when secrets update. Use mechanisms like:
- SIGHUP signal handling
- Sidecar containers watching for secret changes
- Automatic pod restarts on secret update

## Monitoring mTLS Certificate Health

Monitor certificate expiration and renewal:

```bash
# List all mTLS certificates
kubectl get certificates --all-namespaces \
  -l cert-type=mtls

# Check certificate status
kubectl get certificate -n production \
  -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRATION:.status.notAfter

# View renewal events
kubectl get events --field-selector involvedObject.kind=Certificate \
  -n production
```

Set up Prometheus alerts for certificate expiration:

```yaml
# mtls-cert-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mtls-certificate-alerts
spec:
  groups:
  - name: mtls-certificates
    rules:
    - alert: MTLSCertificateExpiringSoon
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds{usage="client auth"} - time()) / 86400 < 7
      labels:
        severity: warning
      annotations:
        summary: "mTLS certificate expiring soon"
        description: "Certificate {{ $labels.name }} expires in {{ $value }} days"
```

## Troubleshooting mTLS

Common mTLS issues and solutions:

### Client Certificate Not Accepted

```bash
# Verify client certificate usage includes "client auth"
kubectl get secret web-app-client-tls -n production -o yaml

# Check CA certificate matches
openssl verify -CAfile ca.crt client.crt
```

### Server Not Verifying Clients

```bash
# Check server configuration requires client certs
# Look for ssl_verify_client or equivalent

# Verify CA certificate accessible to server
kubectl exec -it nginx-mtls-pod -n production -- \
  ls -la /etc/tls/ca/ca.crt
```

### Certificate Chain Issues

```bash
# Verify complete certificate chain
openssl s_client -connect api.example.com:443 \
  -cert client.crt -key client.key \
  -CAfile ca.crt -showcerts
```

## Best Practices

Use separate CAs for different trust domains when needed. Development and production environments should have separate mTLS CAs.

Implement shorter certificate lifetimes for client certificates compared to server certificates. Clients change more frequently than servers.

Automate certificate distribution using cert-manager and Kubernetes native mechanisms. Avoid manual certificate copying.

Monitor certificate expiration across all services. Set alerts well before expiration.

Implement graceful certificate rotation. Applications should reload certificates without service disruption.

Use strong key sizes (2048-bit RSA minimum, or ECDSA P-256) for production mTLS certificates.

Document mTLS architecture and certificate distribution procedures. Teams need to understand the trust model.

## Conclusion

cert-manager enables robust mutual TLS implementation by automating certificate issuance and renewal for both clients and servers. Combined with proper certificate distribution and monitoring, it provides production-grade mTLS infrastructure for securing service-to-service communication in Kubernetes.

This approach scales from simple two-service mTLS to complex microservices architectures with hundreds of services, all with automated certificate lifecycle management and zero-trust authentication between all components.
