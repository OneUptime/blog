# How to Fix Kubernetes Certificate Signed by Unknown Authority Errors in Webhook Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Certificates, Webhooks

Description: Learn how to diagnose and fix certificate signed by unknown authority errors in Kubernetes admission webhooks, including CA bundle configuration and certificate management solutions.

---

Certificate signed by unknown authority errors block admission webhooks from functioning, preventing the API server from validating or mutating resources. When the API server can't verify webhook TLS certificates, it rejects webhook calls, causing resource creation and updates to fail. Properly configuring CA bundles and managing webhook certificates ensures admission webhooks work reliably.

This guide covers diagnosing certificate trust issues, configuring CA bundles correctly, implementing certificate management, and preventing certificate-related webhook failures.

## Understanding Webhook Certificate Validation

Kubernetes API server calls admission webhooks over HTTPS. The API server validates webhook server certificates using a CA bundle specified in the webhook configuration. When the certificate chain doesn't match the provided CA bundle, validation fails with "certificate signed by unknown authority" errors.

This security measure prevents man-in-the-middle attacks and ensures the API server communicates with legitimate webhook endpoints. However, misconfigured CA bundles, expired certificates, or self-signed certificates without proper trust configuration cause legitimate webhooks to fail.

## Identifying Certificate Authority Errors

Check for webhook failures in API server logs.

```bash
# View API server logs
kubectl logs -n kube-system kube-apiserver-master-1 | grep -i "webhook\|certificate"

# Common error messages:
# failed calling webhook "validate.example.com": Post "https://webhook.default.svc:443/validate":
#   x509: certificate signed by unknown authority
# Internal error occurred: failed calling webhook: Post "https://webhook.default.svc:443/mutate":
#   x509: certificate signed by unknown authority
```

Test resource creation that triggers the webhook.

```bash
# Try creating a resource that triggers validation webhook
kubectl apply -f test-resource.yaml

# Error output:
# Error from server (InternalError): error when creating "test-resource.yaml":
# Internal error occurred: failed calling webhook "validate.example.com":
# Post "https://webhook.default.svc:443/validate":
# x509: certificate signed by unknown authority
```

Check webhook configuration.

```bash
# List validating webhooks
kubectl get validatingwebhookconfiguration

# List mutating webhooks
kubectl get mutatingwebhookconfiguration

# Describe webhook to see CA bundle
kubectl get validatingwebhookconfiguration my-webhook -o yaml | grep -A 5 caBundle
```

## Verifying Webhook Certificate Chain

Check the certificate presented by the webhook service.

```bash
# Get webhook service details
kubectl get service webhook -n default

# Port-forward to webhook service
kubectl port-forward -n default service/webhook 8443:443

# Check certificate
openssl s_client -connect localhost:8443 -showcerts

# Look at certificate chain and issuer
# Issuer: CN=My CA
# If self-signed: Issuer == Subject
```

Extract and examine the webhook server certificate.

```bash
# Extract certificate from secret (if stored in secret)
kubectl get secret webhook-cert -n default -o jsonpath='{.data.tls\.crt}' | base64 -d > webhook-cert.pem

# View certificate details
openssl x509 -in webhook-cert.pem -text -noout

# Check issuer and expiration
openssl x509 -in webhook-cert.pem -noout -issuer -dates
```

## Configuring CA Bundle in Webhook Configuration

Update the webhook configuration with the correct CA certificate.

```bash
# Get CA certificate
kubectl get secret webhook-ca -n default -o jsonpath='{.data.ca\.crt}' | base64 -d > ca.crt

# Encode CA certificate for webhook config
CA_BUNDLE=$(cat ca.crt | base64 | tr -d '\n')
```

Update ValidatingWebhookConfiguration with CA bundle.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: my-webhook
webhooks:
- name: validate.example.com
  clientConfig:
    service:
      name: webhook
      namespace: default
      path: /validate
    caBundle: LS0tLS1CRUdJTi...  # Base64-encoded CA certificate
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

Apply the configuration.

```bash
# Create webhook config file with CA bundle
cat > webhook-config.yaml <<EOF
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: my-webhook
webhooks:
- name: validate.example.com
  clientConfig:
    service:
      name: webhook
      namespace: default
      path: /validate
    caBundle: ${CA_BUNDLE}
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
EOF

kubectl apply -f webhook-config.yaml
```

## Using Cert-Manager for Webhook Certificates

Install cert-manager to automate webhook certificate management.

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager

# Wait for pods to be ready
kubectl wait --for=condition=available deployment/cert-manager -n cert-manager --timeout=300s
kubectl wait --for=condition=available deployment/cert-manager-webhook -n cert-manager --timeout=300s
kubectl wait --for=condition=available deployment/cert-manager-cainjector -n cert-manager --timeout=300s
```

Create a self-signed CA issuer.

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: webhook-selfsigned
  namespace: default
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-ca
  namespace: default
spec:
  isCA: true
  commonName: webhook-ca
  secretName: webhook-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: webhook-selfsigned
    kind: Issuer
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: webhook-ca-issuer
  namespace: default
spec:
  ca:
    secretName: webhook-ca-secret
```

Create certificate for webhook server.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-server-cert
  namespace: default
spec:
  secretName: webhook-server-tls
  duration: 2160h  # 90 days
  renewBefore: 360h  # 15 days before expiration
  commonName: webhook.default.svc
  dnsNames:
  - webhook
  - webhook.default
  - webhook.default.svc
  - webhook.default.svc.cluster.local
  issuerRef:
    name: webhook-ca-issuer
    kind: Issuer
```

Configure webhook to use the certificate.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook
  namespace: default
spec:
  template:
    spec:
      containers:
      - name: webhook
        image: webhook:v1.0
        volumeMounts:
        - name: tls
          mountPath: /etc/webhook/tls
          readOnly: true
      volumes:
      - name: tls
        secret:
          secretName: webhook-server-tls
```

## Automatic CA Bundle Injection

Use cert-manager's CA injection to automatically update webhook configurations.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: my-webhook
  annotations:
    cert-manager.io/inject-ca-from: default/webhook-server-cert
webhooks:
- name: validate.example.com
  clientConfig:
    service:
      name: webhook
      namespace: default
      path: /validate
    # caBundle will be automatically injected by cert-manager
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

Cert-manager's CA injector watches for this annotation and automatically populates the caBundle field with the CA certificate from the referenced Certificate resource.

## Implementing Webhook Certificate Rotation

Create a CronJob that rotates webhook certificates before expiration.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: webhook-cert-rotation
  namespace: default
spec:
  schedule: "0 0 */30 * *"  # Every 30 days
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cert-rotator
          containers:
          - name: cert-rotator
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Delete old certificate to trigger renewal
              kubectl delete certificate webhook-server-cert -n default
              kubectl apply -f /config/certificate.yaml

              # Wait for new certificate
              kubectl wait --for=condition=ready certificate/webhook-server-cert -n default --timeout=300s

              # Restart webhook deployment to use new certificate
              kubectl rollout restart deployment webhook -n default
            volumeMounts:
            - name: config
              mountPath: /config
          volumes:
          - name: config
            configMap:
              name: cert-config
          restartPolicy: OnFailure
```

## Testing Webhook Certificate Configuration

Verify webhook calls succeed with proper certificate validation.

```bash
# Create test resource
cat > test-pod.yaml <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: nginx
    image: nginx:latest
EOF

# Apply - should succeed if webhook is configured correctly
kubectl apply -f test-pod.yaml

# Check for webhook call in logs
kubectl logs -n default deployment/webhook --tail=10
```

Test certificate expiration handling.

```bash
# Check certificate expiration
kubectl get certificate webhook-server-cert -n default -o jsonpath='{.status.notAfter}'

# Verify cert-manager will renew before expiration
kubectl describe certificate webhook-server-cert -n default | grep "Renew Before"
```

## Monitoring Webhook Certificate Health

Create alerts for webhook certificate issues.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: webhook_certificates
      rules:
      - alert: WebhookCertificateExpiringSoon
        expr: |
          certmanager_certificate_expiration_timestamp_seconds - time() < 604800
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Webhook certificate {{ $labels.name }} expires in less than 7 days"

      - alert: WebhookCertificateInvalid
        expr: |
          certmanager_certificate_ready_status{condition="False"} == 1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Webhook certificate {{ $labels.name }} is not ready"

      - alert: WebhookCallFailures
        expr: |
          rate(apiserver_admission_webhook_admission_duration_seconds_count{type="validating",rejected="true"}[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High webhook call failure rate"
```

Certificate signed by unknown authority errors in webhook calls prevent admission control from functioning. By properly configuring CA bundles in webhook configurations, using cert-manager for automated certificate management, implementing certificate rotation, and monitoring certificate health, you ensure webhooks validate API requests reliably. Combined with automatic CA injection and proper testing, these practices create robust admission webhook infrastructure that enhances cluster security without operational overhead.
