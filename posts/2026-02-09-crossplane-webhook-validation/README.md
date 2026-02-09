# How to Configure Crossplane Webhook Configuration for Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Webhooks, Validation, Policy

Description: Learn how to configure validation webhooks for Crossplane composite resources to enforce policies, validate parameters, and prevent misconfigurations before they reach cloud providers.

---

Infrastructure misconfiguration causes outages. A database in the wrong availability zone. A security group exposing production to the internet. A storage bucket without encryption. Catching these problems after provisioning wastes time and money. Validation webhooks catch them before resources reach the cloud.

Webhooks intercept create and update operations on composite resources. Your validation logic runs before Crossplane processes the request. Reject invalid configurations with clear error messages. Users fix problems immediately instead of discovering them through failed provisions.

## Understanding Crossplane Webhooks

Kubernetes admission webhooks run before objects are persisted to etcd. Crossplane supports two types:

**Validating webhooks** check if a resource meets your requirements. They accept or reject the operation with an error message.

**Mutating webhooks** modify resources automatically. They can set defaults, inject values, or transform fields.

Webhooks enforce policies at the platform API level. Users never see infrastructure that violates your standards.

## Setting Up Webhook Infrastructure

Install cert-manager to manage webhook TLS certificates.

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create a webhook service.

```yaml
# webhook-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: crossplane-webhook
  namespace: crossplane-system
spec:
  ports:
    - port: 443
      targetPort: 9443
  selector:
    app: crossplane-webhook
```

Deploy the webhook server.

```yaml
# webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crossplane-webhook
  namespace: crossplane-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crossplane-webhook
  template:
    metadata:
      labels:
        app: crossplane-webhook
    spec:
      containers:
        - name: webhook
          image: your-registry/crossplane-webhook:v1.0.0
          ports:
            - containerPort: 9443
          volumeMounts:
            - name: webhook-certs
              mountPath: /tmp/k8s-webhook-server/serving-certs
              readOnly: true
      volumes:
        - name: webhook-certs
          secret:
            secretName: webhook-server-cert
```

Create a certificate for the webhook.

```yaml
# webhook-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-server-cert
  namespace: crossplane-system
spec:
  secretName: webhook-server-cert
  dnsNames:
    - crossplane-webhook.crossplane-system.svc
    - crossplane-webhook.crossplane-system.svc.cluster.local
  issuerRef:
    name: selfsigned-issuer
    kind: Issuer
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned-issuer
  namespace: crossplane-system
spec:
  selfSigned: {}
```

## Creating a Validating Webhook

Define validation rules for composite resources.

```yaml
# validating-webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: crossplane-database-validator
  annotations:
    cert-manager.io/inject-ca-from: crossplane-system/webhook-server-cert
webhooks:
  - name: database.validation.crossplane.io
    admissionReviewVersions: ["v1"]
    clientConfig:
      service:
        name: crossplane-webhook
        namespace: crossplane-system
        path: /validate-database
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: ["database.example.com"]
        apiVersions: ["v1alpha1"]
        resources: ["postgresqlinstances"]
    sideEffects: None
    failurePolicy: Fail
```

Implement the validation handler.

```go
// cmd/webhook/main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type PostgreSQLInstance struct {
    Spec PostgreSQLInstanceSpec `json:"spec"`
}

type PostgreSQLInstanceSpec struct {
    Parameters Parameters `json:"parameters"`
}

type Parameters struct {
    Size         string   `json:"size"`
    Environment  string   `json:"environment"`
    MultiAZ      bool     `json:"multiAz,omitempty"`
    Encrypted    bool     `json:"encrypted,omitempty"`
    BackupDays   int      `json:"backupDays,omitempty"`
    AllowedCIDRs []string `json:"allowedCidrs,omitempty"`
}

func validateDatabase(w http.ResponseWriter, r *http.Request) {
    var admissionReview admissionv1.AdmissionReview
    
    if err := json.NewDecoder(r.Body).Decode(&admissionReview); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Parse the PostgreSQLInstance
    var instance PostgreSQLInstance
    if err := json.Unmarshal(admissionReview.Request.Object.Raw, &instance); err != nil {
        respondWithError(w, admissionReview.Request.UID, err.Error())
        return
    }

    // Validate production databases
    if instance.Spec.Parameters.Environment == "production" {
        // Production must be multi-AZ
        if !instance.Spec.Parameters.MultiAZ {
            respondWithError(w, admissionReview.Request.UID, 
                "production databases must have multiAz: true")
            return
        }

        // Production must be encrypted
        if !instance.Spec.Parameters.Encrypted {
            respondWithError(w, admissionReview.Request.UID,
                "production databases must have encrypted: true")
            return
        }

        // Production must have at least 30 day backups
        if instance.Spec.Parameters.BackupDays < 30 {
            respondWithError(w, admissionReview.Request.UID,
                "production databases must have backupDays >= 30")
            return
        }

        // Production must not allow public access
        for _, cidr := range instance.Spec.Parameters.AllowedCIDRs {
            if cidr == "0.0.0.0/0" {
                respondWithError(w, admissionReview.Request.UID,
                    "production databases cannot allow 0.0.0.0/0")
                return
            }
        }
    }

    // Validate size is valid
    validSizes := map[string]bool{
        "small": true, "medium": true, "large": true, "xlarge": true,
    }
    if !validSizes[instance.Spec.Parameters.Size] {
        respondWithError(w, admissionReview.Request.UID,
            fmt.Sprintf("invalid size %s, must be one of: small, medium, large, xlarge", 
                instance.Spec.Parameters.Size))
        return
    }

    // All validations passed
    respondWithSuccess(w, admissionReview.Request.UID)
}

func respondWithError(w http.ResponseWriter, uid string, message string) {
    response := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: &admissionv1.AdmissionResponse{
            UID:     uid,
            Allowed: false,
            Result: &metav1.Status{
                Message: message,
            },
        },
    }
    json.NewEncoder(w).Encode(response)
}

func respondWithSuccess(w http.ResponseWriter, uid string) {
    response := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: &admissionv1.AdmissionResponse{
            UID:     uid,
            Allowed: true,
        },
    }
    json.NewEncoder(w).Encode(response)
}

func main() {
    http.HandleFunc("/validate-database", validateDatabase)
    http.ListenAndServeTLS(":9443", 
        "/tmp/k8s-webhook-server/serving-certs/tls.crt",
        "/tmp/k8s-webhook-server/serving-certs/tls.key", 
        nil)
}
```

Build and deploy the webhook.

```bash
# Build webhook image
docker build -t your-registry/crossplane-webhook:v1.0.0 .
docker push your-registry/crossplane-webhook:v1.0.0

# Deploy webhook
kubectl apply -f webhook-deployment.yaml
kubectl apply -f webhook-service.yaml
kubectl apply -f webhook-cert.yaml
kubectl apply -f validating-webhook-config.yaml
```

## Testing Webhook Validation

Try to create an invalid production database.

```yaml
# invalid-prod-db.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: prod-db
  namespace: production
spec:
  parameters:
    size: large
    environment: production
    multiAz: false  # INVALID: production needs multi-AZ
    encrypted: true
    backupDays: 30
```

Apply and see the rejection.

```bash
kubectl apply -f invalid-prod-db.yaml
```

Output shows the validation error:
```
Error from server: error when creating "invalid-prod-db.yaml": admission webhook "database.validation.crossplane.io" denied the request: production databases must have multiAz: true
```

Fix the configuration.

```yaml
# valid-prod-db.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: prod-db
  namespace: production
spec:
  parameters:
    size: large
    environment: production
    multiAz: true  # FIXED
    encrypted: true
    backupDays: 30
    allowedCidrs:
      - "10.0.0.0/8"
```

Now it succeeds.

```bash
kubectl apply -f valid-prod-db.yaml
```

## Advanced Validation Patterns

Validate based on multiple fields.

```go
// Validate cost limits
func validateCostLimit(instance PostgreSQLInstance) error {
    costLimits := map[string]int{
        "small":  1000,  // $1000/month
        "medium": 5000,  // $5000/month
        "large":  10000, // $10000/month
        "xlarge": 50000, // $50000/month
    }

    limit := costLimits[instance.Spec.Parameters.Size]
    
    if instance.Spec.Parameters.Environment == "development" && limit > 1000 {
        return fmt.Errorf("development databases limited to small size (cost: $1000/month)")
    }

    return nil
}

// Validate region compliance
func validateRegionCompliance(instance PostgreSQLInstance) error {
    allowedRegions := map[string][]string{
        "production": {"us-east-1", "us-west-2", "eu-west-1"},
        "development": {"us-west-2"},
    }

    allowed := allowedRegions[instance.Spec.Parameters.Environment]
    region := instance.Spec.Parameters.Region

    for _, r := range allowed {
        if r == region {
            return nil
        }
    }

    return fmt.Errorf("region %s not allowed for %s environment", 
        region, instance.Spec.Parameters.Environment)
}
```

## Webhook Monitoring

Track webhook performance and rejections.

```yaml
# prometheus-webhook-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webhook-metrics
  namespace: monitoring
data:
  rules.yaml: |
    groups:
      - name: crossplane-webhooks
        rules:
          - record: webhook_validation_requests_total
            expr: |
              sum by (webhook, result) (
                rate(apiserver_admission_webhook_admission_duration_seconds_count[5m])
              )

          - alert: WebhookHighRejectionRate
            expr: |
              rate(webhook_rejections_total[5m]) > 0.1
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "High webhook rejection rate"

          - alert: WebhookHighLatency
            expr: |
              histogram_quantile(0.99, 
                rate(apiserver_admission_webhook_admission_duration_seconds_bucket[5m])
              ) > 1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Webhook latency high"
```

## Summary

Validation webhooks enforce policies before infrastructure reaches cloud providers. Define rules for production databases, security requirements, and cost limits. Reject invalid configurations with clear error messages.

Implement webhooks as HTTP servers that validate admission requests. Deploy them with TLS certificates and configure ValidatingWebhookConfiguration resources. Test thoroughly to ensure legitimate requests pass while invalid ones are rejected.

Webhooks shift policy enforcement left, catching problems at claim creation time rather than during provisioning. This saves time, prevents misconfigurations, and ensures infrastructure meets your standards automatically.
