# How to Manage Webhook TLS Certificates with cert-manager Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, cert-manager, TLS

Description: Learn how to use cert-manager to automatically generate, renew, and inject TLS certificates for admission webhooks in Kubernetes clusters.

---

Admission webhooks require TLS certificates. You can generate them manually with openssl, but then you're responsible for rotation, renewal, and keeping the CA bundle in sync with webhook configurations. Miss a renewal and your webhooks stop working, potentially breaking cluster operations.

cert-manager automates this entire process. It generates certificates, rotates them before expiration, and even injects CA bundles into webhook configurations automatically. This guide shows you how to set it up.

## Installing cert-manager

Install cert-manager in your cluster.

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

Wait for cert-manager pods to be ready.

```bash
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/instance=cert-manager \
  -n cert-manager \
  --timeout=120s
```

Verify the installation.

```bash
kubectl get pods -n cert-manager
```

You should see three pods running: cert-manager, cert-manager-webhook, and cert-manager-cainjector.

## Creating a Self-Signed Issuer

For webhook certificates, a self-signed issuer works perfectly. Create an issuer in the webhook namespace.

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned-issuer
  namespace: webhook-system
spec:
  selfSigned: {}
```

Apply the issuer.

```bash
kubectl apply -f selfsigned-issuer.yaml
```

For production environments, you might want a cluster-wide issuer.

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-cluster-issuer
spec:
  selfSigned: {}
```

## Requesting Certificates for Webhooks

Create a Certificate resource that cert-manager will use to generate TLS certificates.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-cert
  namespace: webhook-system
spec:
  secretName: webhook-tls
  duration: 2160h # 90 days
  renewBefore: 360h # Renew 15 days before expiration
  subject:
    organizations:
    - example.com
  commonName: webhook-service.webhook-system.svc
  dnsNames:
  - webhook-service
  - webhook-service.webhook-system
  - webhook-service.webhook-system.svc
  - webhook-service.webhook-system.svc.cluster.local
  issuerRef:
    name: selfsigned-issuer
    kind: Issuer
  privateKey:
    algorithm: RSA
    size: 2048
```

Apply the certificate request.

```bash
kubectl apply -f webhook-certificate.yaml
```

cert-manager creates a Secret with the TLS certificate and private key.

```bash
kubectl get secret webhook-tls -n webhook-system

# View certificate details
kubectl get certificate -n webhook-system
```

## Configuring the Webhook Deployment

Mount the certificate secret in your webhook deployment.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: validation-webhook
  namespace: webhook-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: validation-webhook
  template:
    metadata:
      labels:
        app: validation-webhook
    spec:
      containers:
      - name: webhook
        image: registry.example.com/validation-webhook:v1.0.0
        args:
        - --tls-cert-file=/certs/tls.crt
        - --tls-key-file=/certs/tls.key
        - --port=8443
        ports:
        - containerPort: 8443
          name: webhook
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
      volumes:
      - name: certs
        secret:
          secretName: webhook-tls
```

The certificate files are automatically available at /certs/tls.crt and /certs/tls.key.

## Automatic CA Bundle Injection

The real power of cert-manager comes with automatic CA bundle injection. Add annotations to your webhook configurations.

For validating webhooks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: validation-webhook
  annotations:
    cert-manager.io/inject-ca-from: webhook-system/webhook-cert
webhooks:
- name: validate.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate
    # caBundle is automatically injected by cert-manager
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

For mutating webhooks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: mutating-webhook
  annotations:
    cert-manager.io/inject-ca-from: webhook-system/webhook-cert
webhooks:
- name: mutate.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /mutate
    # caBundle is automatically injected
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Ignore
```

The cert-manager cainjector component watches these annotations and automatically populates the caBundle field.

Verify the injection:

```bash
kubectl get validatingwebhookconfiguration validation-webhook -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d
```

You should see the PEM-encoded CA certificate.

## Using a CA Issuer for Better Control

For more control, create a CA issuer instead of using self-signed certificates.

First, create a self-signed CA certificate:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-ca
  namespace: webhook-system
spec:
  secretName: webhook-ca-secret
  isCA: true
  commonName: webhook-ca
  subject:
    organizations:
    - example.com
  privateKey:
    algorithm: RSA
    size: 4096
  issuerRef:
    name: selfsigned-issuer
    kind: Issuer
```

Then create a CA issuer from that certificate:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: webhook-ca-issuer
  namespace: webhook-system
spec:
  ca:
    secretName: webhook-ca-secret
```

Update your webhook certificate to use the CA issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-cert
  namespace: webhook-system
spec:
  secretName: webhook-tls
  duration: 2160h
  renewBefore: 360h
  commonName: webhook-service.webhook-system.svc
  dnsNames:
  - webhook-service.webhook-system.svc
  - webhook-service.webhook-system.svc.cluster.local
  issuerRef:
    name: webhook-ca-issuer # Use CA issuer
    kind: Issuer
```

This approach gives you a dedicated CA for webhook certificates.

## Handling Certificate Rotation

cert-manager automatically renews certificates before they expire. But your webhook server needs to reload the new certificate.

Option 1: Restart the webhook pods when certificates rotate.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webhook-restart-script
  namespace: webhook-system
data:
  restart.sh: |
    #!/bin/bash
    kubectl rollout restart deployment/validation-webhook -n webhook-system

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: webhook-cert-rotation
  namespace: webhook-system
spec:
  schedule: "0 0 * * 0" # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cert-rotation-sa
          containers:
          - name: restart
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - kubectl rollout restart deployment/validation-webhook -n webhook-system
          restartPolicy: OnFailure
```

Option 2: Implement certificate reloading in your webhook server.

```go
package main

import (
    "crypto/tls"
    "log"
    "sync"
    "time"
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

    go cr.watch()

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

func (cr *CertReloader) watch() {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()

    for range ticker.C {
        if err := cr.reload(); err != nil {
            log.Printf("Failed to reload certificate: %v", err)
        }
    }
}

func (cr *CertReloader) GetCertificate(_ *tls.ClientHelloInfo) (*tls.Certificate, error) {
    cr.mu.RLock()
    defer cr.mu.RUnlock()
    return cr.cert, nil
}

// Usage in webhook server
func main() {
    certReloader, err := NewCertReloader("/certs/tls.crt", "/certs/tls.key")
    if err != nil {
        panic(err)
    }

    server := &http.Server{
        Addr: ":8443",
        TLSConfig: &tls.Config{
            GetCertificate: certReloader.GetCertificate,
        },
    }

    log.Fatal(server.ListenAndServeTLS("", ""))
}
```

## Monitoring Certificate Expiration

Set up monitoring to alert on certificate expiration.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: webhook-system
spec:
  groups:
  - name: cert-manager
    interval: 30s
    rules:
    - alert: CertificateExpiringSoon
      expr: |
        certmanager_certificate_expiration_timestamp_seconds - time() < 86400 * 7
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expiring soon"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} expires in less than 7 days"

    - alert: CertificateRenewalFailed
      expr: |
        certmanager_certificate_ready_status{condition="False"} == 1
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "Certificate renewal failed for {{ $labels.name }}"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} failed to renew"
```

## Troubleshooting Certificate Issues

Check certificate status:

```bash
kubectl describe certificate webhook-cert -n webhook-system
```

View cert-manager logs:

```bash
kubectl logs -n cert-manager deployment/cert-manager
```

Check if CA bundle was injected:

```bash
kubectl get validatingwebhookconfiguration validation-webhook -o yaml | grep caBundle
```

Manually trigger certificate renewal:

```bash
kubectl annotate certificate webhook-cert -n webhook-system \
  cert-manager.io/issue-temporary-certificate="true"
```

## Conclusion

cert-manager eliminates manual certificate management for admission webhooks. It handles generation, renewal, and CA bundle injection automatically.

Install cert-manager, create a Certificate resource, and add injection annotations to webhook configurations. Implement certificate reloading in your webhook server or use rolling restarts. Monitor certificate expiration to catch renewal failures.

The automation provides reliability and removes a common source of operational issues with admission webhooks.
