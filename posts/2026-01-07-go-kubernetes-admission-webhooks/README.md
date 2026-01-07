# How to Build Kubernetes Admission Webhooks in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kubernetes, Webhooks, Security, DevOps, Admission Controllers

Description: Build Kubernetes admission webhooks in Go for validating and mutating pod configurations to enforce security policies and best practices.

---

Kubernetes admission controllers are powerful gatekeepers that intercept requests to the Kubernetes API server before objects are persisted. Among these, admission webhooks allow you to implement custom validation and mutation logic outside the Kubernetes codebase. In this comprehensive guide, we'll build both validating and mutating admission webhooks in Go to enforce security policies and automatically inject configurations into pods.

## Understanding Admission Webhooks

Admission webhooks are HTTP callbacks that receive admission requests from the Kubernetes API server. There are two types:

1. **Validating Webhooks**: Validate requests and can reject them if they don't meet certain criteria. They cannot modify the object.

2. **Mutating Webhooks**: Can modify the object before it's persisted. They run before validating webhooks.

The flow works as follows:
1. A user submits a resource (e.g., Pod) to the API server
2. The API server authenticates and authorizes the request
3. Mutating webhooks are called (can modify the resource)
4. Schema validation occurs
5. Validating webhooks are called (can accept or reject)
6. The resource is persisted to etcd

## Project Structure

Let's start by setting up our project structure:

```
admission-webhook/
├── cmd/
│   └── webhook/
│       └── main.go
├── pkg/
│   ├── handler/
│   │   ├── handler.go
│   │   ├── validate.go
│   │   └── mutate.go
│   └── webhook/
│       └── server.go
├── deploy/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── webhook-config.yaml
│   └── tls/
│       └── generate-certs.sh
├── go.mod
└── go.sum
```

## Setting Up the Go Module

Initialize the Go module and add required dependencies for working with Kubernetes admission reviews:

```go
// go.mod
module github.com/yourorg/admission-webhook

go 1.21

require (
    k8s.io/api v0.29.0
    k8s.io/apimachinery v0.29.0
)
```

## The Webhook Server

The webhook server is the core component that handles HTTPS requests from the Kubernetes API server. It must serve over TLS as Kubernetes requires secure communication:

```go
// pkg/webhook/server.go
package webhook

import (
    "context"
    "crypto/tls"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/yourorg/admission-webhook/pkg/handler"
)

// Server represents the webhook server configuration
type Server struct {
    server   *http.Server
    certFile string
    keyFile  string
}

// NewServer creates a new webhook server with the specified TLS certificates
func NewServer(port int, certFile, keyFile string) *Server {
    mux := http.NewServeMux()

    // Register the validation and mutation endpoints
    mux.HandleFunc("/validate", handler.HandleValidate)
    mux.HandleFunc("/mutate", handler.HandleMutate)
    mux.HandleFunc("/health", handleHealth)

    return &Server{
        server: &http.Server{
            Addr:         fmt.Sprintf(":%d", port),
            Handler:      mux,
            ReadTimeout:  10 * time.Second,
            WriteTimeout: 10 * time.Second,
        },
        certFile: certFile,
        keyFile:  keyFile,
    }
}

// handleHealth provides a health check endpoint for Kubernetes probes
func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
}

// Run starts the webhook server and handles graceful shutdown
func (s *Server) Run() error {
    // Load TLS certificate
    cert, err := tls.LoadX509KeyPair(s.certFile, s.keyFile)
    if err != nil {
        return fmt.Errorf("failed to load TLS certificates: %w", err)
    }

    s.server.TLSConfig = &tls.Config{
        Certificates: []tls.Certificate{cert},
        MinVersion:   tls.VersionTLS12,
    }

    // Channel to listen for shutdown signals
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

    // Start server in goroutine
    go func() {
        fmt.Printf("Starting webhook server on %s\n", s.server.Addr)
        if err := s.server.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
            fmt.Printf("Server error: %v\n", err)
            os.Exit(1)
        }
    }()

    // Wait for shutdown signal
    <-stop
    fmt.Println("Shutting down server...")

    // Graceful shutdown with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    return s.server.Shutdown(ctx)
}
```

## Admission Request Handler

The handler package processes incoming admission review requests. This is where we parse the request and route it to the appropriate validation or mutation logic:

```go
// pkg/handler/handler.go
package handler

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/serializer"
)

var (
    // Universal deserializer for Kubernetes objects
    runtimeScheme = runtime.NewScheme()
    codecs        = serializer.NewCodecFactory(runtimeScheme)
    deserializer  = codecs.UniversalDeserializer()
)

// AdmissionResponse wraps the response with helper methods
type AdmissionResponse struct {
    Allowed bool
    Message string
    Patch   []byte
}

// parseAdmissionReview extracts the AdmissionReview from the HTTP request
func parseAdmissionReview(r *http.Request) (*admissionv1.AdmissionReview, error) {
    // Read the request body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        return nil, fmt.Errorf("failed to read request body: %w", err)
    }

    if len(body) == 0 {
        return nil, fmt.Errorf("empty request body")
    }

    // Verify content type
    contentType := r.Header.Get("Content-Type")
    if contentType != "application/json" {
        return nil, fmt.Errorf("expected Content-Type 'application/json', got '%s'", contentType)
    }

    // Decode the AdmissionReview
    ar := &admissionv1.AdmissionReview{}
    if _, _, err := deserializer.Decode(body, nil, ar); err != nil {
        return nil, fmt.Errorf("failed to decode admission review: %w", err)
    }

    return ar, nil
}

// sendResponse writes the AdmissionReview response back to the API server
func sendResponse(w http.ResponseWriter, ar *admissionv1.AdmissionReview, response *admissionv1.AdmissionResponse) {
    ar.Response = response
    ar.Response.UID = ar.Request.UID

    resp, err := json.Marshal(ar)
    if err != nil {
        http.Error(w, fmt.Sprintf("failed to marshal response: %v", err), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(resp)
}

// createAllowedResponse creates a response that allows the admission request
func createAllowedResponse() *admissionv1.AdmissionResponse {
    return &admissionv1.AdmissionResponse{
        Allowed: true,
        Result: &metav1.Status{
            Status: metav1.StatusSuccess,
        },
    }
}

// createDeniedResponse creates a response that denies the admission request with a reason
func createDeniedResponse(reason string) *admissionv1.AdmissionResponse {
    return &admissionv1.AdmissionResponse{
        Allowed: false,
        Result: &metav1.Status{
            Status:  metav1.StatusFailure,
            Message: reason,
            Reason:  metav1.StatusReasonForbidden,
        },
    }
}

// createPatchResponse creates a response with JSON patches for mutation
func createPatchResponse(patch []byte) *admissionv1.AdmissionResponse {
    patchType := admissionv1.PatchTypeJSONPatch
    return &admissionv1.AdmissionResponse{
        Allowed:   true,
        Patch:     patch,
        PatchType: &patchType,
        Result: &metav1.Status{
            Status: metav1.StatusSuccess,
        },
    }
}
```

## Validating Webhook Implementation

The validating webhook enforces security policies. In this example, we check for privileged containers, host network usage, and required labels:

```go
// pkg/handler/validate.go
package handler

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
)

// ValidationConfig holds the validation rules configuration
type ValidationConfig struct {
    RequiredLabels      []string
    DeniedImages        []string
    AllowPrivileged     bool
    AllowHostNetwork    bool
    AllowHostPID        bool
    MaxCPULimit         string
    MaxMemoryLimit      string
}

// DefaultValidationConfig returns sensible security defaults
func DefaultValidationConfig() *ValidationConfig {
    return &ValidationConfig{
        RequiredLabels:   []string{"app", "owner"},
        DeniedImages:     []string{"latest"},
        AllowPrivileged:  false,
        AllowHostNetwork: false,
        AllowHostPID:     false,
    }
}

// HandleValidate is the HTTP handler for validation requests
func HandleValidate(w http.ResponseWriter, r *http.Request) {
    // Parse the admission review from the request
    ar, err := parseAdmissionReview(r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Only process Pod resources
    if ar.Request.Kind.Kind != "Pod" {
        sendResponse(w, ar, createAllowedResponse())
        return
    }

    // Unmarshal the Pod from the admission request
    pod := &corev1.Pod{}
    if err := json.Unmarshal(ar.Request.Object.Raw, pod); err != nil {
        sendResponse(w, ar, createDeniedResponse(fmt.Sprintf("failed to unmarshal pod: %v", err)))
        return
    }

    // Validate the pod against security policies
    config := DefaultValidationConfig()
    if violations := validatePod(pod, config); len(violations) > 0 {
        sendResponse(w, ar, createDeniedResponse(strings.Join(violations, "; ")))
        return
    }

    sendResponse(w, ar, createAllowedResponse())
}

// validatePod checks the pod against security policies and returns violations
func validatePod(pod *corev1.Pod, config *ValidationConfig) []string {
    var violations []string

    // Check required labels
    violations = append(violations, validateLabels(pod, config.RequiredLabels)...)

    // Check container security settings
    violations = append(violations, validateContainers(pod.Spec.Containers, config)...)
    violations = append(violations, validateContainers(pod.Spec.InitContainers, config)...)

    // Check host namespace usage
    violations = append(violations, validateHostSettings(pod, config)...)

    return violations
}

// validateLabels ensures required labels are present on the pod
func validateLabels(pod *corev1.Pod, requiredLabels []string) []string {
    var violations []string

    for _, label := range requiredLabels {
        if _, exists := pod.Labels[label]; !exists {
            violations = append(violations, fmt.Sprintf("missing required label: %s", label))
        }
    }

    return violations
}

// validateContainers checks each container for security policy violations
func validateContainers(containers []corev1.Container, config *ValidationConfig) []string {
    var violations []string

    for _, container := range containers {
        // Check for denied image tags (e.g., :latest)
        for _, denied := range config.DeniedImages {
            if strings.HasSuffix(container.Image, ":"+denied) ||
               (!strings.Contains(container.Image, ":") && denied == "latest") {
                violations = append(violations,
                    fmt.Sprintf("container %s uses denied image tag: %s", container.Name, denied))
            }
        }

        // Check for privileged containers
        if container.SecurityContext != nil {
            if container.SecurityContext.Privileged != nil && *container.SecurityContext.Privileged {
                if !config.AllowPrivileged {
                    violations = append(violations,
                        fmt.Sprintf("container %s: privileged containers are not allowed", container.Name))
                }
            }

            // Check for root user
            if container.SecurityContext.RunAsUser != nil && *container.SecurityContext.RunAsUser == 0 {
                violations = append(violations,
                    fmt.Sprintf("container %s: running as root is not allowed", container.Name))
            }

            // Check for privilege escalation
            if container.SecurityContext.AllowPrivilegeEscalation != nil &&
               *container.SecurityContext.AllowPrivilegeEscalation {
                violations = append(violations,
                    fmt.Sprintf("container %s: privilege escalation is not allowed", container.Name))
            }
        }

        // Check for resource limits
        if container.Resources.Limits == nil {
            violations = append(violations,
                fmt.Sprintf("container %s: resource limits must be specified", container.Name))
        }
    }

    return violations
}

// validateHostSettings checks for dangerous host namespace usage
func validateHostSettings(pod *corev1.Pod, config *ValidationConfig) []string {
    var violations []string

    if pod.Spec.HostNetwork && !config.AllowHostNetwork {
        violations = append(violations, "hostNetwork is not allowed")
    }

    if pod.Spec.HostPID && !config.AllowHostPID {
        violations = append(violations, "hostPID is not allowed")
    }

    if pod.Spec.HostIPC {
        violations = append(violations, "hostIPC is not allowed")
    }

    return violations
}
```

## Mutating Webhook Implementation

The mutating webhook modifies pod configurations before they're created. This example injects sidecar containers, adds labels, and sets security defaults:

```go
// pkg/handler/mutate.go
package handler

import (
    "encoding/json"
    "fmt"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
)

// PatchOperation represents a JSON Patch operation for mutating resources
type PatchOperation struct {
    Op    string      `json:"op"`
    Path  string      `json:"path"`
    Value interface{} `json:"value,omitempty"`
}

// MutationConfig holds the mutation settings
type MutationConfig struct {
    InjectSidecar       bool
    SidecarImage        string
    DefaultLabels       map[string]string
    DefaultAnnotations  map[string]string
    EnforceNonRoot      bool
    DefaultCPURequest   string
    DefaultMemoryRequest string
}

// DefaultMutationConfig returns the default mutation configuration
func DefaultMutationConfig() *MutationConfig {
    return &MutationConfig{
        InjectSidecar: true,
        SidecarImage:  "busybox:1.35",
        DefaultLabels: map[string]string{
            "managed-by": "admission-webhook",
            "version":    "v1",
        },
        DefaultAnnotations: map[string]string{
            "webhook.example.com/mutated": "true",
        },
        EnforceNonRoot:       true,
        DefaultCPURequest:    "100m",
        DefaultMemoryRequest: "128Mi",
    }
}

// HandleMutate is the HTTP handler for mutation requests
func HandleMutate(w http.ResponseWriter, r *http.Request) {
    // Parse the admission review from the request
    ar, err := parseAdmissionReview(r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Only process Pod resources
    if ar.Request.Kind.Kind != "Pod" {
        sendResponse(w, ar, createAllowedResponse())
        return
    }

    // Unmarshal the Pod from the admission request
    pod := &corev1.Pod{}
    if err := json.Unmarshal(ar.Request.Object.Raw, pod); err != nil {
        sendResponse(w, ar, createDeniedResponse(fmt.Sprintf("failed to unmarshal pod: %v", err)))
        return
    }

    // Generate patches for the pod
    config := DefaultMutationConfig()
    patches, err := mutatePod(pod, config)
    if err != nil {
        sendResponse(w, ar, createDeniedResponse(fmt.Sprintf("failed to mutate pod: %v", err)))
        return
    }

    // If there are no patches, just allow the request
    if len(patches) == 0 {
        sendResponse(w, ar, createAllowedResponse())
        return
    }

    // Marshal patches to JSON
    patchBytes, err := json.Marshal(patches)
    if err != nil {
        sendResponse(w, ar, createDeniedResponse(fmt.Sprintf("failed to marshal patches: %v", err)))
        return
    }

    sendResponse(w, ar, createPatchResponse(patchBytes))
}

// mutatePod generates JSON patches to modify the pod
func mutatePod(pod *corev1.Pod, config *MutationConfig) ([]PatchOperation, error) {
    var patches []PatchOperation

    // Add default labels
    patches = append(patches, addLabels(pod, config.DefaultLabels)...)

    // Add default annotations
    patches = append(patches, addAnnotations(pod, config.DefaultAnnotations)...)

    // Inject sidecar container if enabled
    if config.InjectSidecar {
        patches = append(patches, injectSidecar(pod, config)...)
    }

    // Add security context defaults
    if config.EnforceNonRoot {
        patches = append(patches, addSecurityContext(pod)...)
    }

    return patches, nil
}

// addLabels creates patches to add missing labels to the pod
func addLabels(pod *corev1.Pod, labels map[string]string) []PatchOperation {
    var patches []PatchOperation

    // If no labels exist, create the labels map first
    if pod.Labels == nil {
        patches = append(patches, PatchOperation{
            Op:    "add",
            Path:  "/metadata/labels",
            Value: map[string]string{},
        })
    }

    // Add each label if it doesn't exist
    for key, value := range labels {
        if _, exists := pod.Labels[key]; !exists {
            patches = append(patches, PatchOperation{
                Op:    "add",
                Path:  fmt.Sprintf("/metadata/labels/%s", escapeJSONPointer(key)),
                Value: value,
            })
        }
    }

    return patches
}

// addAnnotations creates patches to add missing annotations to the pod
func addAnnotations(pod *corev1.Pod, annotations map[string]string) []PatchOperation {
    var patches []PatchOperation

    // If no annotations exist, create the annotations map first
    if pod.Annotations == nil {
        patches = append(patches, PatchOperation{
            Op:    "add",
            Path:  "/metadata/annotations",
            Value: map[string]string{},
        })
    }

    // Add each annotation if it doesn't exist
    for key, value := range annotations {
        if _, exists := pod.Annotations[key]; !exists {
            patches = append(patches, PatchOperation{
                Op:    "add",
                Path:  fmt.Sprintf("/metadata/annotations/%s", escapeJSONPointer(key)),
                Value: value,
            })
        }
    }

    return patches
}

// injectSidecar adds a sidecar container to the pod
func injectSidecar(pod *corev1.Pod, config *MutationConfig) []PatchOperation {
    var patches []PatchOperation

    // Check if sidecar already exists
    for _, container := range pod.Spec.Containers {
        if container.Name == "logging-sidecar" {
            return patches // Sidecar already exists
        }
    }

    // Define the sidecar container
    sidecar := corev1.Container{
        Name:  "logging-sidecar",
        Image: config.SidecarImage,
        Command: []string{
            "/bin/sh",
            "-c",
            "while true; do echo 'sidecar running'; sleep 60; done",
        },
        Resources: corev1.ResourceRequirements{
            Limits: corev1.ResourceList{
                corev1.ResourceCPU:    mustParseQuantity("50m"),
                corev1.ResourceMemory: mustParseQuantity("64Mi"),
            },
            Requests: corev1.ResourceList{
                corev1.ResourceCPU:    mustParseQuantity("10m"),
                corev1.ResourceMemory: mustParseQuantity("32Mi"),
            },
        },
    }

    // If containers array is empty, add it; otherwise append
    if len(pod.Spec.Containers) == 0 {
        patches = append(patches, PatchOperation{
            Op:    "add",
            Path:  "/spec/containers",
            Value: []corev1.Container{sidecar},
        })
    } else {
        patches = append(patches, PatchOperation{
            Op:    "add",
            Path:  "/spec/containers/-",
            Value: sidecar,
        })
    }

    return patches
}

// addSecurityContext adds security context defaults to enforce non-root execution
func addSecurityContext(pod *corev1.Pod) []PatchOperation {
    var patches []PatchOperation

    // Add pod-level security context if not present
    if pod.Spec.SecurityContext == nil {
        nonRoot := true
        runAsUser := int64(1000)
        runAsGroup := int64(1000)
        fsGroup := int64(1000)

        patches = append(patches, PatchOperation{
            Op:   "add",
            Path: "/spec/securityContext",
            Value: corev1.PodSecurityContext{
                RunAsNonRoot: &nonRoot,
                RunAsUser:    &runAsUser,
                RunAsGroup:   &runAsGroup,
                FSGroup:      &fsGroup,
            },
        })
    }

    return patches
}

// escapeJSONPointer escapes special characters in JSON Pointer paths
func escapeJSONPointer(s string) string {
    // Replace ~ with ~0 and / with ~1 as per RFC 6901
    s = strings.ReplaceAll(s, "~", "~0")
    s = strings.ReplaceAll(s, "/", "~1")
    return s
}

// mustParseQuantity is a helper to parse resource quantities
func mustParseQuantity(s string) resource.Quantity {
    q, err := resource.ParseQuantity(s)
    if err != nil {
        panic(fmt.Sprintf("failed to parse quantity %s: %v", s, err))
    }
    return q
}
```

Add the missing imports at the top of mutate.go:

```go
import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
)
```

## Main Entry Point

The main function initializes and starts the webhook server with the configured TLS certificates:

```go
// cmd/webhook/main.go
package main

import (
    "flag"
    "fmt"
    "os"

    "github.com/yourorg/admission-webhook/pkg/webhook"
)

func main() {
    // Parse command-line flags
    var (
        port     int
        certFile string
        keyFile  string
    )

    flag.IntVar(&port, "port", 8443, "Webhook server port")
    flag.StringVar(&certFile, "cert", "/etc/webhook/certs/tls.crt", "TLS certificate file")
    flag.StringVar(&keyFile, "key", "/etc/webhook/certs/tls.key", "TLS private key file")
    flag.Parse()

    // Verify certificate files exist
    if _, err := os.Stat(certFile); os.IsNotExist(err) {
        fmt.Printf("Certificate file not found: %s\n", certFile)
        os.Exit(1)
    }
    if _, err := os.Stat(keyFile); os.IsNotExist(err) {
        fmt.Printf("Key file not found: %s\n", keyFile)
        os.Exit(1)
    }

    // Create and start the webhook server
    server := webhook.NewServer(port, certFile, keyFile)
    if err := server.Run(); err != nil {
        fmt.Printf("Failed to run server: %v\n", err)
        os.Exit(1)
    }
}
```

## TLS Certificate Generation

Kubernetes requires webhooks to use TLS. This script generates self-signed certificates for development and testing. In production, use cert-manager or a proper CA:

```bash
#!/bin/bash
# deploy/tls/generate-certs.sh

set -e

# Configuration
SERVICE_NAME="admission-webhook"
NAMESPACE="default"
SECRET_NAME="webhook-tls"

# Generate CA key and certificate
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 \
    -out ca.crt \
    -subj "/CN=Admission Webhook CA"

# Generate server key
openssl genrsa -out server.key 2048

# Create CSR config
cat > csr.conf <<EOF
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

# Generate server CSR and certificate
openssl req -new -key server.key -out server.csr \
    -subj "/CN=${SERVICE_NAME}.${NAMESPACE}.svc" \
    -config csr.conf

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 365 \
    -extensions v3_req -extfile csr.conf

# Create Kubernetes secret
kubectl create secret tls ${SECRET_NAME} \
    --cert=server.crt \
    --key=server.key \
    -n ${NAMESPACE} \
    --dry-run=client -o yaml > ../webhook-tls-secret.yaml

# Get CA bundle for webhook configuration (base64 encoded)
CA_BUNDLE=$(cat ca.crt | base64 | tr -d '\n')
echo "CA_BUNDLE=${CA_BUNDLE}"

# Clean up
rm -f ca.key ca.srl csr.conf server.csr

echo "Certificates generated successfully!"
echo "Server cert: server.crt"
echo "Server key: server.key"
echo "CA cert: ca.crt"
```

## Kubernetes Deployment Manifests

Deploy the webhook server as a Kubernetes Deployment with the TLS secret mounted:

```yaml
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admission-webhook
  namespace: default
  labels:
    app: admission-webhook
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
      serviceAccountName: admission-webhook
      containers:
      - name: webhook
        image: yourorg/admission-webhook:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8443
          name: https
        args:
        - --port=8443
        - --cert=/etc/webhook/certs/tls.crt
        - --key=/etc/webhook/certs/tls.key
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
        livenessProbe:
          httpGet:
            path: /health
            port: https
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: https
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 10
        volumeMounts:
        - name: webhook-certs
          mountPath: /etc/webhook/certs
          readOnly: true
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      volumes:
      - name: webhook-certs
        secret:
          secretName: webhook-tls
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
    protocol: TCP
  selector:
    app: admission-webhook
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admission-webhook
  namespace: default
```

## Webhook Configuration

Register the webhook with Kubernetes using ValidatingWebhookConfiguration and MutatingWebhookConfiguration resources:

```yaml
# deploy/webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validation-webhook
webhooks:
- name: validate.pods.example.com
  admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: admission-webhook
      namespace: default
      path: /validate
      port: 443
    # Replace with your CA bundle (base64 encoded)
    caBundle: ${CA_BUNDLE}
  rules:
  - apiGroups:
    - ""
    apiVersions:
    - v1
    operations:
    - CREATE
    - UPDATE
    resources:
    - pods
    scope: Namespaced
  # Only validate pods in namespaces with this label
  namespaceSelector:
    matchLabels:
      admission-webhook: enabled
  failurePolicy: Fail
  sideEffects: None
  timeoutSeconds: 10
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: pod-mutation-webhook
webhooks:
- name: mutate.pods.example.com
  admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: admission-webhook
      namespace: default
      path: /mutate
      port: 443
    # Replace with your CA bundle (base64 encoded)
    caBundle: ${CA_BUNDLE}
  rules:
  - apiGroups:
    - ""
    apiVersions:
    - v1
    operations:
    - CREATE
    resources:
    - pods
    scope: Namespaced
  namespaceSelector:
    matchLabels:
      admission-webhook: enabled
  failurePolicy: Fail
  sideEffects: None
  # Mutating webhooks run before validating webhooks
  reinvocationPolicy: IfNeeded
  timeoutSeconds: 10
```

## Dockerfile

Build the webhook server as a minimal container image using multi-stage builds:

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo \
    -o webhook ./cmd/webhook

# Final stage - use distroless for minimal attack surface
FROM gcr.io/distroless/static:nonroot

WORKDIR /

COPY --from=builder /app/webhook .

USER 65532:65532

ENTRYPOINT ["/webhook"]
```

## Testing the Webhook

Test the webhook locally before deploying to Kubernetes. Create a test pod manifest that violates security policies:

```yaml
# test/invalid-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: invalid-pod
  labels:
    # Missing required labels: 'app' and 'owner'
    test: "true"
spec:
  containers:
  - name: nginx
    # Using :latest tag (denied)
    image: nginx:latest
    # No resource limits specified
    securityContext:
      # Running as root (denied)
      runAsUser: 0
      # Privilege escalation allowed (denied)
      allowPrivilegeEscalation: true
  # Using host network (denied)
  hostNetwork: true
```

Deploy the valid test pod that passes all validations:

```yaml
# test/valid-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: valid-pod
  labels:
    app: my-application
    owner: platform-team
spec:
  containers:
  - name: nginx
    image: nginx:1.24
    resources:
      limits:
        cpu: "200m"
        memory: "256Mi"
      requests:
        cpu: "100m"
        memory: "128Mi"
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

## Deployment Steps

Follow these steps to deploy the admission webhook to your cluster:

```bash
# 1. Enable the webhook for a namespace
kubectl label namespace default admission-webhook=enabled

# 2. Generate TLS certificates
cd deploy/tls
chmod +x generate-certs.sh
./generate-certs.sh

# 3. Create the TLS secret
kubectl apply -f ../webhook-tls-secret.yaml

# 4. Build and push the webhook image
docker build -t yourorg/admission-webhook:latest .
docker push yourorg/admission-webhook:latest

# 5. Deploy the webhook server
kubectl apply -f deploy/deployment.yaml

# 6. Wait for the webhook to be ready
kubectl wait --for=condition=ready pod -l app=admission-webhook --timeout=60s

# 7. Update the CA bundle in webhook configuration and apply
# Replace ${CA_BUNDLE} with the actual base64-encoded CA certificate
export CA_BUNDLE=$(cat deploy/tls/ca.crt | base64 | tr -d '\n')
envsubst < deploy/webhook-config.yaml | kubectl apply -f -

# 8. Test with an invalid pod (should be rejected)
kubectl apply -f test/invalid-pod.yaml
# Expected error: admission webhook denied the request...

# 9. Test with a valid pod (should be accepted and mutated)
kubectl apply -f test/valid-pod.yaml
kubectl get pod valid-pod -o yaml
# Verify sidecar was injected and labels were added
```

## Best Practices

When building production admission webhooks, consider these best practices:

1. **High Availability**: Run multiple replicas of your webhook server with anti-affinity rules to ensure availability.

2. **Failure Policy**: Use `failurePolicy: Ignore` during initial rollout to prevent blocking all pod creation if the webhook fails.

3. **Namespace Selectors**: Use namespace selectors to limit which namespaces the webhook applies to, reducing blast radius.

4. **Timeouts**: Keep webhook timeout low (5-10 seconds) to avoid delaying API requests.

5. **Idempotency**: Ensure mutations are idempotent as webhooks may be called multiple times.

6. **Logging**: Log all admission decisions for audit trails and debugging.

7. **Metrics**: Expose Prometheus metrics for monitoring webhook latency and error rates.

8. **Certificate Rotation**: Use cert-manager for automatic certificate rotation in production.

## Troubleshooting

Common issues and solutions when working with admission webhooks:

**Webhook not being called:**
- Verify the namespace has the correct label for the namespace selector
- Check if the webhook configuration is correctly applied: `kubectl get validatingwebhookconfiguration`
- Ensure the CA bundle is correctly base64-encoded without newlines

**TLS errors:**
- Verify the certificate SAN includes the service DNS name
- Check certificate expiration: `openssl x509 -in server.crt -text -noout`
- Ensure the secret is mounted correctly in the pod

**Webhook timing out:**
- Check webhook pod logs: `kubectl logs -l app=admission-webhook`
- Verify network policies allow traffic from the API server
- Check if the webhook service is correctly targeting pods

## Conclusion

Building Kubernetes admission webhooks in Go provides powerful capabilities for enforcing security policies and automating configuration management. The validating webhook ensures pods meet your organization's security standards before creation, while the mutating webhook automatically injects necessary configurations like sidecars, labels, and security contexts.

Key takeaways from this guide:

- Admission webhooks intercept Kubernetes API requests before persistence
- Mutating webhooks run before validating webhooks
- TLS is mandatory for webhook communication with the API server
- Use JSON Patch format for mutations
- Implement proper error handling and logging for production use

By implementing these webhooks, you can shift security left and ensure consistent configurations across your Kubernetes clusters. Start with simple validations and gradually add more policies as you gain confidence in your webhook implementation.
