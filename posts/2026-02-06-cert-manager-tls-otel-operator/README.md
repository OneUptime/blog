# How to Configure cert-manager Issued TLS Certificates for OpenTelemetry Operator Webhook Admission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, cert-manager, TLS, Operator, Kubernetes Webhook

Description: Configure cert-manager to issue and manage TLS certificates for the OpenTelemetry Operator webhook admission controller in Kubernetes.

The OpenTelemetry Operator runs a webhook admission controller that needs valid TLS certificates. By default, the Operator manages its own self-signed certificates, but in production you want cert-manager to handle certificate lifecycle. This gives you proper CA chains, automatic rotation, and certificate monitoring through your existing cert-manager infrastructure.

## Why Use cert-manager for the OTel Operator

The self-signed certificate approach has limitations:

- Certificates are generated at startup and require pod restarts to rotate
- No integration with your existing PKI or certificate monitoring
- Self-signed certs can cause issues with strict security policies
- No automatic renewal; if the cert expires, webhooks fail silently

cert-manager handles all of this automatically.

## Prerequisites

Install cert-manager and the OpenTelemetry Operator. With Helm:

```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Install OTel Operator with cert-manager integration
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  --set admissionWebhooks.certManager.enabled=true
```

## Creating a cert-manager Issuer

First, create a CA issuer that will sign the webhook certificate:

```yaml
# self-signed-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
# Create a CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: otel-operator-ca
  namespace: opentelemetry-operator-system
spec:
  isCA: true
  commonName: otel-operator-ca
  secretName: otel-operator-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 720h # 30 days
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
# Create a CA issuer using the CA certificate
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: otel-operator-ca-issuer
  namespace: opentelemetry-operator-system
spec:
  ca:
    secretName: otel-operator-ca-secret
```

## Creating the Webhook Certificate

```yaml
# webhook-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: opentelemetry-operator-serving-cert
  namespace: opentelemetry-operator-system
spec:
  # The secret name that the Operator expects
  secretName: opentelemetry-operator-controller-manager-service-cert
  duration: 8760h    # 1 year
  renewBefore: 720h  # 30 days before expiry
  issuerRef:
    name: otel-operator-ca-issuer
    kind: Issuer
  # DNS names must match the webhook service
  dnsNames:
    - opentelemetry-operator-webhook-service.opentelemetry-operator-system.svc
    - opentelemetry-operator-webhook-service.opentelemetry-operator-system.svc.cluster.local
  usages:
    - server auth
    - digital signature
    - key encipherment
```

## Configuring the Operator to Use cert-manager Certificates

If installing with Helm, pass these values:

```yaml
# values.yaml
admissionWebhooks:
  certManager:
    enabled: true
    # Use our issuer
    issuerRef:
      name: otel-operator-ca-issuer
      kind: Issuer
      group: cert-manager.io
  # Disable self-signed cert generation
  autoGenerateCert:
    enabled: false
```

```bash
helm upgrade opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  -f values.yaml
```

## Manual Configuration (Without Helm)

If you deployed the Operator without Helm, annotate the webhook configuration:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: opentelemetry-operator-mutating-webhook-configuration
  annotations:
    cert-manager.io/inject-ca-from: opentelemetry-operator-system/opentelemetry-operator-serving-cert
webhooks:
  - name: mopentelemetrycollector.kb.io
    clientConfig:
      service:
        name: opentelemetry-operator-webhook-service
        namespace: opentelemetry-operator-system
        path: /mutate-opentelemetry-io-v1alpha1-opentelemetrycollector
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: opentelemetry-operator-validating-webhook-configuration
  annotations:
    cert-manager.io/inject-ca-from: opentelemetry-operator-system/opentelemetry-operator-serving-cert
```

The `cert-manager.io/inject-ca-from` annotation tells cert-manager to inject the CA bundle into the webhook configuration so the Kubernetes API server trusts the webhook's certificate.

## Verifying the Setup

Check that the certificate was issued successfully:

```bash
# Check certificate status
kubectl get certificate -n opentelemetry-operator-system

# Should show:
# NAME                                    READY   SECRET                                                        AGE
# opentelemetry-operator-serving-cert     True    opentelemetry-operator-controller-manager-service-cert         5m

# Check the certificate details
kubectl describe certificate opentelemetry-operator-serving-cert \
  -n opentelemetry-operator-system

# Verify the secret was created
kubectl get secret opentelemetry-operator-controller-manager-service-cert \
  -n opentelemetry-operator-system
```

## Monitoring the Webhook Certificate

Use the cert-manager metrics we covered in the previous post to monitor the webhook certificate:

```yaml
# Alert when the OTel Operator webhook certificate is not ready
# certmanager_certificate_ready_status{
#   name="opentelemetry-operator-serving-cert",
#   namespace="opentelemetry-operator-system",
#   condition="True"
# } == 0
```

## Troubleshooting

If webhooks fail after switching to cert-manager:

1. Verify the certificate secret exists and has `tls.crt` and `tls.key` entries
2. Check that the CA bundle was injected into the webhook configuration
3. Ensure the DNS names in the certificate match the webhook service name
4. Restart the Operator pod to pick up the new certificates

```bash
# Check webhook configuration for CA bundle
kubectl get mutatingwebhookconfiguration \
  opentelemetry-operator-mutating-webhook-configuration \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -text -noout
```

Using cert-manager for the OpenTelemetry Operator's webhook certificates brings certificate management in line with the rest of your Kubernetes TLS infrastructure. You get automatic rotation, proper CA chains, and monitoring through cert-manager's metrics, all without manual certificate management.
