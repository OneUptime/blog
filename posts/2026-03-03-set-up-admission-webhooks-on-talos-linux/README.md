# How to Set Up Admission Webhooks on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Admission Webhooks, Kubernetes, Security, API Server

Description: Learn how to build and deploy custom validating and mutating admission webhooks on a Talos Linux Kubernetes cluster.

---

Admission webhooks are one of the most powerful extension points in Kubernetes. They intercept requests to the Kubernetes API server after authentication and authorization but before the object is persisted to etcd. There are two types: validating webhooks that can accept or reject requests, and mutating webhooks that can modify the request payload. Together, they let you enforce custom policies, inject configurations, and implement business logic that goes beyond what built-in Kubernetes features offer.

On Talos Linux, admission webhooks work exactly as they do on any Kubernetes cluster, but the immutable nature of the OS means you cannot run webhook servers directly on nodes. Everything runs inside pods, which is the correct approach anyway. This guide covers building, deploying, and managing custom admission webhooks on Talos Linux.

## How Admission Webhooks Work

When a request hits the Kubernetes API server, it goes through this pipeline:

1. Authentication (who are you?)
2. Authorization (are you allowed to do this?)
3. Mutating admission webhooks (modify the request)
4. Object schema validation
5. Validating admission webhooks (accept or reject)
6. Persist to etcd

Mutating webhooks run first because they can change the object, and validating webhooks run after to check the final state. A single request can pass through multiple webhooks of each type.

## Building a Simple Validating Webhook

Let us build a webhook that rejects pods without resource limits. We will use Go, which is the most common language for Kubernetes controllers and webhooks.

```go
// main.go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func validatePod(w http.ResponseWriter, r *http.Request) {
    // Read the request body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "could not read body", http.StatusBadRequest)
        return
    }

    // Parse the AdmissionReview request
    var admissionReview admissionv1.AdmissionReview
    if err := json.Unmarshal(body, &admissionReview); err != nil {
        http.Error(w, "could not parse admission review", http.StatusBadRequest)
        return
    }

    // Parse the pod from the request
    var pod corev1.Pod
    if err := json.Unmarshal(admissionReview.Request.Object.Raw, &pod); err != nil {
        http.Error(w, "could not parse pod", http.StatusBadRequest)
        return
    }

    // Check each container for resource limits
    allowed := true
    message := ""
    for _, container := range pod.Spec.Containers {
        if container.Resources.Limits.Cpu().IsZero() || container.Resources.Limits.Memory().IsZero() {
            allowed = false
            message = fmt.Sprintf("Container %s must have CPU and memory limits defined", container.Name)
            break
        }
    }

    // Build the response
    response := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: &admissionv1.AdmissionResponse{
            UID:     admissionReview.Request.UID,
            Allowed: allowed,
        },
    }

    if !allowed {
        response.Response.Result = &metav1.Status{
            Message: message,
        }
    }

    // Send the response
    responseBytes, _ := json.Marshal(response)
    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)
}

func main() {
    http.HandleFunc("/validate", validatePod)
    http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    log.Println("Starting webhook server on :8443")
    log.Fatal(http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", nil))
}
```

## Generating TLS Certificates

Admission webhooks must serve HTTPS. The easiest way to handle certificates on Talos Linux is with cert-manager.

```yaml
# webhook-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-cert
  namespace: webhook-system
spec:
  secretName: webhook-tls
  duration: 8760h  # 1 year
  renewBefore: 720h  # 30 days
  issuerRef:
    name: selfsigned-issuer
    kind: Issuer
  dnsNames:
    - resource-validator.webhook-system.svc
    - resource-validator.webhook-system.svc.cluster.local
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned-issuer
  namespace: webhook-system
spec:
  selfSigned: {}
```

If you do not use cert-manager, generate certificates manually.

```bash
# Generate a CA and server certificate
openssl genrsa -out ca.key 2048
openssl req -new -x509 -days 365 -key ca.key -subj "/CN=Webhook CA" -out ca.crt

openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=resource-validator.webhook-system.svc" \
  -addext "subjectAltName=DNS:resource-validator.webhook-system.svc,DNS:resource-validator.webhook-system.svc.cluster.local" \
  -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 365 -out server.crt

# Create the Kubernetes secret
kubectl create namespace webhook-system
kubectl create secret tls webhook-tls \
  --namespace webhook-system \
  --cert=server.crt \
  --key=server.key

# Get the CA bundle for the webhook configuration
CA_BUNDLE=$(cat ca.crt | base64 | tr -d '\n')
echo $CA_BUNDLE
```

## Deploying the Webhook Server

```yaml
# webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-validator
  namespace: webhook-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: resource-validator
  template:
    metadata:
      labels:
        app: resource-validator
    spec:
      containers:
        - name: webhook
          image: your-registry/resource-validator:v1.0.0
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: tls-certs
              mountPath: /certs
              readOnly: true
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 10
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: tls-certs
          secret:
            secretName: webhook-tls
---
apiVersion: v1
kind: Service
metadata:
  name: resource-validator
  namespace: webhook-system
spec:
  selector:
    app: resource-validator
  ports:
    - port: 443
      targetPort: 8443
```

## Registering the Webhook

```yaml
# validating-webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: resource-validator
  annotations:
    # If using cert-manager, this annotation auto-injects the CA bundle
    cert-manager.io/inject-ca-from: webhook-system/webhook-cert
webhooks:
  - name: resource-validator.webhook-system.svc
    clientConfig:
      service:
        name: resource-validator
        namespace: webhook-system
        path: /validate
      # If not using cert-manager, set caBundle manually
      # caBundle: <base64-encoded-ca-cert>
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values:
            - kube-system
            - webhook-system
```

```bash
kubectl apply -f webhook-deployment.yaml
kubectl apply -f validating-webhook-config.yaml

# Test the webhook
kubectl run test --image=nginx --dry-run=server
# Should be rejected because no resource limits are set
```

## Building a Mutating Webhook

Mutating webhooks modify requests using JSON patches. Here is an example that adds default labels.

```go
// mutate.go - handler function
func mutatePod(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)

    var admissionReview admissionv1.AdmissionReview
    json.Unmarshal(body, &admissionReview)

    // Create a JSON patch to add labels
    patches := []map[string]interface{}{
        {
            "op":    "add",
            "path":  "/metadata/labels/injected-by",
            "value": "webhook",
        },
        {
            "op":    "add",
            "path":  "/metadata/labels/cluster",
            "value": "talos-prod",
        },
    }

    patchBytes, _ := json.Marshal(patches)
    patchType := admissionv1.PatchTypeJSONPatch

    response := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: &admissionv1.AdmissionResponse{
            UID:       admissionReview.Request.UID,
            Allowed:   true,
            PatchType: &patchType,
            Patch:     patchBytes,
        },
    }

    responseBytes, _ := json.Marshal(response)
    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)
}
```

Register it as a MutatingWebhookConfiguration.

```yaml
# mutating-webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: label-injector
webhooks:
  - name: label-injector.webhook-system.svc
    clientConfig:
      service:
        name: label-injector
        namespace: webhook-system
        path: /mutate
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Ignore
    reinvocationPolicy: IfNeeded
```

## Failure Policy Considerations

The `failurePolicy` field is critical. It determines what happens when the webhook server is unavailable.

- **Fail**: Reject the request if the webhook cannot be reached. More secure but can block cluster operations if the webhook is down.
- **Ignore**: Allow the request through if the webhook is unavailable. More resilient but means policies are not enforced during outages.

For production on Talos Linux, use `Fail` for security-critical webhooks and `Ignore` for non-critical mutations. Always run webhook servers with multiple replicas and proper health checks.

## Performance and Reliability

```yaml
# Best practices for webhook configuration
webhooks:
  - name: my-webhook.example.com
    # Set a timeout to prevent slow webhooks from blocking the API server
    timeoutSeconds: 5
    # Use matchPolicy to control version matching
    matchPolicy: Equivalent
    # Use objectSelector to limit which objects trigger the webhook
    objectSelector:
      matchLabels:
        webhook-enabled: "true"
```

## Wrapping Up

Admission webhooks on Talos Linux let you extend the Kubernetes API server with custom validation and mutation logic. Whether you need to enforce organizational policies, inject sidecar containers, set default values, or implement complex business rules, webhooks give you the flexibility to do it. On Talos Linux, the deployment model is straightforward since everything runs as pods. Pair your webhooks with cert-manager for automated TLS certificate management, run multiple replicas for high availability, and set appropriate failure policies to balance security with cluster availability.
