# How to Build Custom Admission Webhooks Using Go and Kubernetes Client-Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Go, Admission Webhooks, Custom Controllers, API

Description: Learn how to build custom validating and mutating admission webhooks in Go using client-go, implement webhook servers with TLS, and deploy them to Kubernetes for custom admission control logic.

---

Custom admission webhooks let you implement validation and mutation logic that goes beyond what policy engines provide. Built with Go and client-go, these webhooks can call external APIs, access databases, or implement complex business logic during admission. This guide walks through building, deploying, and securing a production-ready admission webhook.

## Setting Up the Webhook Server

Create a new Go module for your webhook:

```bash
mkdir admission-webhook && cd admission-webhook
go mod init github.com/yourorg/admission-webhook
go get k8s.io/api@v0.29.0
go get k8s.io/apimachinery@v0.29.0
go get k8s.io/client-go@v0.29.0
```

Create the basic webhook server structure:

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
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/serializer"
)

var (
    scheme = runtime.NewScheme()
    codecs = serializer.NewCodecFactory(scheme)
)

func init() {
    // Register admission and core types
    admissionv1.AddToScheme(scheme)
    corev1.AddToScheme(scheme)
}

func main() {
    http.HandleFunc("/validate", validateHandler)
    http.HandleFunc("/mutate", mutateHandler)
    http.HandleFunc("/health", healthHandler)

    log.Println("Starting webhook server on :8443")
    log.Fatal(http.ListenAndServeTLS(":8443", "/tls/tls.crt", "/tls/tls.key", nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("healthy"))
}
```

This server listens on port 8443 with TLS enabled, required for admission webhooks.

## Implementing a Validating Webhook

Create validation logic that checks pod labels:

```go
// validate.go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func validateHandler(w http.ResponseWriter, r *http.Request) {
    // Read the admission review request
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, fmt.Sprintf("failed to read body: %v", err), http.StatusBadRequest)
        return
    }

    // Decode the admission review
    admissionReview := &admissionv1.AdmissionReview{}
    if _, _, err := codecs.UniversalDeserializer().Decode(body, nil, admissionReview); err != nil {
        http.Error(w, fmt.Sprintf("failed to decode admission review: %v", err), http.StatusBadRequest)
        return
    }

    // Extract the pod from the request
    pod := &corev1.Pod{}
    if err := json.Unmarshal(admissionReview.Request.Object.Raw, pod); err != nil {
        http.Error(w, fmt.Sprintf("failed to unmarshal pod: %v", err), http.StatusBadRequest)
        return
    }

    // Perform validation
    allowed, message := validatePod(pod)

    // Create the admission response
    admissionResponse := &admissionv1.AdmissionResponse{
        UID:     admissionReview.Request.UID,
        Allowed: allowed,
    }

    if !allowed {
        admissionResponse.Result = &metav1.Status{
            Message: message,
        }
    }

    // Send the response
    responseReview := &admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: admissionResponse,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(responseReview)
}

func validatePod(pod *corev1.Pod) (bool, string) {
    // Check required labels
    requiredLabels := []string{"team", "environment", "app"}
    for _, label := range requiredLabels {
        if _, exists := pod.Labels[label]; !exists {
            return false, fmt.Sprintf("missing required label: %s", label)
        }
    }

    // Check container image registries
    for _, container := range pod.Spec.Containers {
        if !isApprovedRegistry(container.Image) {
            return false, fmt.Sprintf("container %s uses unapproved registry", container.Name)
        }
    }

    // Check security context
    for _, container := range pod.Spec.Containers {
        if container.SecurityContext == nil {
            return false, fmt.Sprintf("container %s missing security context", container.Name)
        }
        if container.SecurityContext.RunAsNonRoot == nil || !*container.SecurityContext.RunAsNonRoot {
            return false, fmt.Sprintf("container %s must run as non-root", container.Name)
        }
    }

    return true, ""
}

func isApprovedRegistry(image string) bool {
    approvedPrefixes := []string{
        "registry.company.com/",
        "docker.io/library/",
        "gcr.io/",
    }

    for _, prefix := range approvedPrefixes {
        if len(image) >= len(prefix) && image[:len(prefix)] == prefix {
            return true
        }
    }
    return false
}
```

This webhook validates pod labels, image registries, and security contexts before allowing pod creation.

## Implementing a Mutating Webhook

Create mutation logic that injects defaults:

```go
// mutate.go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func mutateHandler(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, fmt.Sprintf("failed to read body: %v", err), http.StatusBadRequest)
        return
    }

    admissionReview := &admissionv1.AdmissionReview{}
    if _, _, err := codecs.UniversalDeserializer().Decode(body, nil, admissionReview); err != nil {
        http.Error(w, fmt.Sprintf("failed to decode admission review: %v", err), http.StatusBadRequest)
        return
    }

    pod := &corev1.Pod{}
    if err := json.Unmarshal(admissionReview.Request.Object.Raw, pod); err != nil {
        http.Error(w, fmt.Sprintf("failed to unmarshal pod: %v", err), http.StatusBadRequest)
        return
    }

    // Create JSON patch for mutations
    patches := mutatePod(pod)

    admissionResponse := &admissionv1.AdmissionResponse{
        UID:     admissionReview.Request.UID,
        Allowed: true,
    }

    if len(patches) > 0 {
        patchBytes, err := json.Marshal(patches)
        if err != nil {
            http.Error(w, fmt.Sprintf("failed to marshal patches: %v", err), http.StatusInternalServerError)
            return
        }
        admissionResponse.Patch = patchBytes
        patchType := admissionv1.PatchTypeJSONPatch
        admissionResponse.PatchType = &patchType
    }

    responseReview := &admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: admissionResponse,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(responseReview)
}

type JSONPatch struct {
    Op    string      `json:"op"`
    Path  string      `json:"path"`
    Value interface{} `json:"value,omitempty"`
}

func mutatePod(pod *corev1.Pod) []JSONPatch {
    var patches []JSONPatch

    // Add default labels if missing
    if pod.Labels == nil {
        patches = append(patches, JSONPatch{
            Op:    "add",
            Path:  "/metadata/labels",
            Value: map[string]string{},
        })
    }

    if _, exists := pod.Labels["managed-by"]; !exists {
        patches = append(patches, JSONPatch{
            Op:    "add",
            Path:  "/metadata/labels/managed-by",
            Value: "admission-webhook",
        })
    }

    // Inject security context if missing
    for i, container := range pod.Spec.Containers {
        if container.SecurityContext == nil {
            runAsNonRoot := true
            allowPrivilegeEscalation := false
            patches = append(patches, JSONPatch{
                Op:   "add",
                Path: fmt.Sprintf("/spec/containers/%d/securityContext", i),
                Value: &corev1.SecurityContext{
                    RunAsNonRoot:             &runAsNonRoot,
                    AllowPrivilegeEscalation: &allowPrivilegeEscalation,
                    RunAsUser:                int64Ptr(1000),
                    Capabilities: &corev1.Capabilities{
                        Drop: []corev1.Capability{"ALL"},
                    },
                },
            })
        }

        // Add resource limits if missing
        if container.Resources.Limits == nil {
            patches = append(patches, JSONPatch{
                Op:   "add",
                Path: fmt.Sprintf("/spec/containers/%d/resources/limits", i),
                Value: corev1.ResourceList{
                    corev1.ResourceCPU:    resource.MustParse("500m"),
                    corev1.ResourceMemory: resource.MustParse("512Mi"),
                },
            })
        }
    }

    return patches
}

func int64Ptr(i int64) *int64 {
    return &i
}
```

This mutating webhook injects labels, security contexts, and resource limits into pods that don't define them.

## Generating TLS Certificates

Create certificates for the webhook server:

```bash
#!/bin/bash
# generate-certs.sh

SERVICE_NAME=admission-webhook
NAMESPACE=default

# Create a private key
openssl genrsa -out tls.key 2048

# Create a certificate signing request
cat <<EOF | openssl req -new -key tls.key -out tls.csr -config -
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${SERVICE_NAME}
DNS.2 = ${SERVICE_NAME}.${NAMESPACE}
DNS.3 = ${SERVICE_NAME}.${NAMESPACE}.svc
DNS.4 = ${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local
EOF

# Self-sign the certificate
openssl x509 -req -days 365 -in tls.csr -signkey tls.key -out tls.crt

# Create Kubernetes secret
kubectl create secret tls admission-webhook-tls \
    --cert=tls.crt \
    --key=tls.key \
    -n ${NAMESPACE}
```

Run this script to generate certificates and store them in a Kubernetes secret.

## Creating the Webhook Deployment

Deploy the webhook to Kubernetes:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admission-webhook
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admission-webhook
  template:
    metadata:
      labels:
        app: admission-webhook
    spec:
      containers:
        - name: webhook
          image: yourregistry/admission-webhook:v1.0.0
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: tls
              mountPath: /tls
              readOnly: true
          livenessProbe:
            httpGet:
              path: /health
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: tls
          secret:
            secretName: admission-webhook-tls
---
apiVersion: v1
kind: Service
metadata:
  name: admission-webhook
  namespace: default
spec:
  ports:
    - port: 443
      targetPort: 8443
  selector:
    app: admission-webhook
```

## Registering the Webhook

Create webhook configuration resources:

```yaml
# validating-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: admission-webhook-validator
webhooks:
  - name: validate.admission-webhook.default.svc
    clientConfig:
      service:
        name: admission-webhook
        namespace: default
        path: /validate
      caBundle: <base64-encoded-ca-cert>
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    timeoutSeconds: 5
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: admission-webhook-mutator
webhooks:
  - name: mutate.admission-webhook.default.svc
    clientConfig:
      service:
        name: admission-webhook
        namespace: default
        path: /mutate
      caBundle: <base64-encoded-ca-cert>
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    timeoutSeconds: 5
```

Replace `<base64-encoded-ca-cert>` with your CA certificate:

```bash
cat tls.crt | base64 | tr -d '\n'
```

## Testing the Webhook

Test validation:

```bash
# This should be blocked
kubectl run test-bad --image=nginx:latest

# This should succeed
kubectl run test-good --image=registry.company.com/nginx:1.21 \
    --labels="team=platform,environment=dev,app=test"
```

Test mutation by checking injected fields:

```bash
kubectl run test-mutate --image=nginx:1.21
kubectl get pod test-mutate -o yaml | grep -A5 securityContext
```

## Conclusion

Custom admission webhooks built with Go and client-go provide unlimited flexibility for validation and mutation logic. Implement validation handlers that check business rules and security requirements, and mutation handlers that inject defaults and enforce standards. Use proper TLS configuration, deploy with high availability, and set appropriate timeouts and failure policies. Test webhooks thoroughly before production deployment, and monitor their performance to ensure they don't become bottlenecks in admission processing.

Building custom webhooks is essential when policy engines cannot express your requirements or when you need to integrate with external systems during admission.
