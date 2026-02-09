# How to Rotate TLS Certificates Managed by cert-manager Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, TLS

Description: Learn how to implement zero-downtime TLS certificate rotation using cert-manager's automatic renewal features and proper secret management strategies.

---

TLS certificates expire regularly, and manual rotation creates risk of service outages and security vulnerabilities. cert-manager automates certificate lifecycle management in Kubernetes, but incorrect configuration can still cause downtime during rotation. Understanding how cert-manager renews certificates and how applications consume them is critical for implementing seamless certificate rotation.

This guide will show you how to configure cert-manager for automatic certificate renewal and ensure your applications handle certificate updates without interruption.

## Understanding cert-manager Renewal Process

cert-manager automatically renews certificates before they expire. By default, it starts renewal when certificates have less than one-third of their total lifetime remaining. For a 90-day Let's Encrypt certificate, renewal begins at day 60.

The renewal process involves requesting a new certificate from the issuer, validating domain ownership, receiving the new certificate, and updating the Kubernetes Secret. Applications must reload the updated certificate without restarting to avoid downtime.

## Configuring Automatic Renewal

Install cert-manager if not already present:

```bash
# Install cert-manager with Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Verify installation
kubectl get pods -n cert-manager
```

Create a ClusterIssuer for Let's Encrypt:

```yaml
# letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply the issuer:

```bash
kubectl apply -f letsencrypt-issuer.yaml

# Verify issuer is ready
kubectl get clusterissuer letsencrypt-prod
```

## Creating Certificates with Custom Renewal Settings

Define certificates with appropriate renewal configuration:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-tls
  namespace: production
spec:
  secretName: example-com-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - example.com
  - www.example.com

  # Renew certificate 30 days before expiration
  renewBefore: 720h  # 30 days

  # Duration of certificate validity
  duration: 2160h  # 90 days

  # Private key configuration
  privateKey:
    algorithm: RSA
    encoding: PKCS1
    size: 2048
    rotationPolicy: Always  # Generate new private key on renewal
```

The `rotationPolicy: Always` ensures a new private key is generated with each renewal, following security best practices. Use `Never` if you need to maintain the same key.

Apply the certificate:

```bash
kubectl apply -f certificate.yaml

# Watch certificate issuance
kubectl get certificate -n production -w

# Check certificate details
kubectl describe certificate example-com-tls -n production
```

## Monitoring Certificate Expiration

Set up monitoring to track certificate expiration and renewal:

```bash
# Check certificate status
kubectl get certificate -n production example-com-tls -o yaml

# View renewal time
kubectl get certificate -n production example-com-tls \
  -o jsonpath='{.status.renewalTime}'

# Check certificate condition
kubectl get certificate -n production example-com-tls \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

Install cert-manager Prometheus metrics:

```bash
# Enable Prometheus metrics in cert-manager
helm upgrade cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --reuse-values \
  --set prometheus.enabled=true \
  --set prometheus.servicemonitor.enabled=true
```

Query certificate expiration metrics:

```promql
# Days until certificate expires
certmanager_certificate_expiration_timestamp_seconds{name="example-com-tls"}
  - time()
) / 86400

# Alert on certificates expiring soon
ALERT CertificateExpiringSoon
  IF (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 14
  FOR 1h
  LABELS { severity="warning" }
  ANNOTATIONS {
    summary = "Certificate {{ $labels.name }} expiring in {{ $value | humanizeDuration }}"
  }
```

## Configuring Ingress for Zero-Downtime Rotation

Use cert-manager's ingress annotation to automatically create certificates:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Force SSL even during certificate renewal
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    - www.example.com
    secretName: example-com-tls-secret
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

NGINX Ingress Controller automatically reloads when TLS secrets change, ensuring zero downtime during certificate rotation.

## Configuring Applications to Reload Certificates

Applications that terminate TLS themselves must watch for certificate changes and reload. Here's a Go example:

```go
// main.go
package main

import (
    "crypto/tls"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/fsnotify/fsnotify"
)

type CertReloader struct {
    certPath string
    keyPath  string
    cert     *tls.Certificate
    mu       sync.RWMutex
}

func NewCertReloader(certPath, keyPath string) (*CertReloader, error) {
    cr := &CertReloader{
        certPath: certPath,
        keyPath:  keyPath,
    }
    if err := cr.reload(); err != nil {
        return nil, err
    }
    cr.watchCerts()
    return cr, nil
}

func (cr *CertReloader) reload() error {
    cert, err := tls.LoadX509KeyPair(cr.certPath, cr.keyPath)
    if err != nil {
        return err
    }
    cr.mu.Lock()
    cr.cert = &cert
    cr.mu.Unlock()
    log.Println("Certificate reloaded successfully")
    return nil
}

func (cr *CertReloader) watchCerts() {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        log.Fatal(err)
    }

    go func() {
        for {
            select {
            case event := <-watcher.Events:
                if event.Op&fsnotify.Write == fsnotify.Write {
                    log.Println("Certificate file modified, reloading...")
                    time.Sleep(1 * time.Second) // Wait for write to complete
                    if err := cr.reload(); err != nil {
                        log.Printf("Error reloading certificate: %v", err)
                    }
                }
            case err := <-watcher.Errors:
                log.Printf("Watcher error: %v", err)
            }
        }
    }()

    watcher.Add(cr.certPath)
    watcher.Add(cr.keyPath)
}

func (cr *CertReloader) GetCertificate(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
    cr.mu.RLock()
    defer cr.mu.RUnlock()
    return cr.cert, nil
}

func main() {
    certPath := "/etc/tls/tls.crt"
    keyPath := "/etc/tls/tls.key"

    reloader, err := NewCertReloader(certPath, keyPath)
    if err != nil {
        log.Fatal(err)
    }

    tlsConfig := &tls.Config{
        GetCertificate: reloader.GetCertificate,
    }

    server := &http.Server{
        Addr:      ":8443",
        TLSConfig: tlsConfig,
    }

    log.Println("Starting HTTPS server on :8443")
    log.Fatal(server.ListenAndServeTLS("", ""))
}
```

Mount the certificate secret in the pod:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-tls
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8443
          name: https
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls-certs
        secret:
          secretName: example-com-tls-secret
```

## Using Kubernetes Secret Projection for Atomic Updates

Secrets mounted as volumes update automatically, but file changes are eventually consistent. Use subPath projections for atomic updates:

```yaml
volumes:
- name: tls-certs
  projected:
    sources:
    - secret:
        name: example-com-tls-secret
        items:
        - key: tls.crt
          path: tls.crt
        - key: tls.key
          path: tls.key
```

Kubernetes creates a new directory with updated files and atomically switches the symlink, preventing applications from reading partially written certificates.

## Handling Multiple Certificates

For applications serving multiple domains, configure multiple certificates:

```yaml
# multi-cert-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-domain-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    secretName: example-com-tls
  - hosts:
    - another-example.com
    secretName: another-example-com-tls
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
  - host: another-example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: other-service
            port:
              number: 80
```

cert-manager creates and manages each certificate independently, rotating them on different schedules.

## Manual Certificate Renewal Trigger

Force immediate renewal for testing or emergency rotation:

```bash
# Force renewal by deleting the secret
kubectl delete secret example-com-tls-secret -n production

# cert-manager will immediately recreate it

# Or use cmctl to trigger renewal
cmctl renew example-com-tls -n production

# Watch renewal progress
kubectl get certificaterequest -n production -w
```

## Troubleshooting Failed Renewals

Debug certificate renewal issues:

```bash
# Check certificate status
kubectl describe certificate example-com-tls -n production

# View certificate request
kubectl get certificaterequest -n production

# Check order status (for ACME issuers)
kubectl get order -n production

# View challenge details
kubectl get challenge -n production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Test ACME challenge manually
curl http://example.com/.well-known/acme-challenge/test
```

Common issues:
- DNS not propagating for new domains
- Firewall blocking ACME challenge HTTP requests
- Rate limits from Let's Encrypt
- Invalid webhook configurations

## Backup and Disaster Recovery

Back up certificate secrets for disaster recovery:

```bash
# Export certificate secret
kubectl get secret example-com-tls-secret -n production -o yaml > cert-backup.yaml

# Store in secure location with encryption
gpg --encrypt --recipient admin@example.com cert-backup.yaml

# Restore if needed
kubectl apply -f cert-backup.yaml
```

For production systems, use automated backup solutions like Velero:

```bash
# Install Velero
velero install --provider aws --bucket my-backup-bucket

# Create backup schedule for cert-manager resources
velero schedule create cert-manager-backup \
  --schedule="0 2 * * *" \
  --include-namespaces cert-manager,production \
  --include-resources certificates,clusterissuers
```

## Best Practices for Certificate Rotation

Configure renewal to start well before expiration. For 90-day certificates, renew at 30 days remaining. This provides buffer for resolving issues. Monitor certificate expiration metrics and alert on approaching expiration dates.

Test certificate rotation regularly in non-production environments. Simulate failures to ensure your monitoring and runbooks work correctly. Document manual renewal procedures for emergency situations.

Use ingress controllers or service meshes that automatically reload certificates. If applications handle TLS directly, implement proper certificate watching and reloading logic. Never restart pods solely for certificate rotation.

Enable debug logging in cert-manager during initial setup to understand the renewal process. Use separate issuers for staging and production to avoid rate limits during testing.

## Conclusion

cert-manager provides robust automation for TLS certificate lifecycle management in Kubernetes. By configuring appropriate renewal timings, using ingress controllers that reload certificates automatically, and implementing proper monitoring, you can achieve zero-downtime certificate rotation.

Start with well-tested ClusterIssuers and configure certificates with sufficient renewal buffer time. Use Prometheus metrics to monitor expiration and alert on upcoming renewals. Test rotation in staging environments before deploying to production.

For applications that terminate TLS themselves, implement certificate watching and hot-reloading to avoid restarts. Use atomic secret updates through projected volumes to prevent serving invalid certificates during transitions. Combined with proper backup and monitoring, automated certificate rotation becomes a seamless part of your security operations.
