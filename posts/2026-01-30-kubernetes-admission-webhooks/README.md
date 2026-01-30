# How to Implement Kubernetes Admission Webhooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Security, Validation

Description: Build admission webhooks for Kubernetes to validate and mutate resources before they are persisted with validating and mutating controllers.

---

Kubernetes admission webhooks intercept API requests before objects are stored in etcd. They give you fine-grained control over what gets deployed to your cluster. This post walks through building both validating and mutating webhooks from scratch.

## What Are Admission Webhooks?

When you create, update, or delete a Kubernetes resource, the request passes through several phases. Admission webhooks sit between authentication/authorization and persistence. They can reject requests or modify objects on the fly.

The admission process follows this order:

1. Authentication - Who is making the request?
2. Authorization - Are they allowed to do this?
3. Mutating Admission - Modify the object if needed
4. Schema Validation - Does the object match the API schema?
5. Validating Admission - Run custom validation logic
6. Persist to etcd - Store the object

## Validating vs Mutating Webhooks

Here is a comparison of the two webhook types:

| Aspect | Validating Webhook | Mutating Webhook |
|--------|-------------------|------------------|
| Purpose | Accept or reject requests | Modify request objects |
| Execution Order | Runs after mutating webhooks | Runs first |
| Response | Allowed (true/false) with reason | Allowed plus optional patch |
| Use Cases | Policy enforcement, security checks | Injecting sidecars, setting defaults |
| Can Modify Objects | No | Yes |
| Parallel Execution | Yes, all run in parallel | Sequential by default |

## Project Structure

Let's build a complete webhook server. Here is the project layout:

```
admission-webhook/
├── cmd/
│   └── webhook/
│       └── main.go
├── pkg/
│   ├── handlers/
│   │   ├── validate.go
│   │   └── mutate.go
│   └── server/
│       └── server.go
├── deploy/
│   ├── webhook-deployment.yaml
│   ├── webhook-service.yaml
│   ├── validating-webhook-config.yaml
│   └── mutating-webhook-config.yaml
├── scripts/
│   └── generate-certs.sh
├── go.mod
└── Dockerfile
```

## Setting Up the Go Module

Initialize your Go module with the required dependencies:

```bash
mkdir admission-webhook && cd admission-webhook
go mod init github.com/yourorg/admission-webhook
go get k8s.io/api/admission/v1
go get k8s.io/apimachinery/pkg/runtime
go get k8s.io/apimachinery/pkg/runtime/serializer
```

## The Webhook Server

This server handles HTTPS connections and routes requests to the appropriate handler. The TLS configuration is mandatory since Kubernetes only communicates with webhooks over HTTPS.

```go
// pkg/server/server.go
package server

import (
    "context"
    "crypto/tls"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/yourorg/admission-webhook/pkg/handlers"
)

// WebhookServer holds the configuration for our admission webhook server
type WebhookServer struct {
    server *http.Server
    // CertFile is the path to the TLS certificate
    CertFile string
    // KeyFile is the path to the TLS private key
    KeyFile string
    // Port is the port to listen on
    Port int
}

// NewWebhookServer creates a new webhook server instance
func NewWebhookServer(certFile, keyFile string, port int) *WebhookServer {
    return &WebhookServer{
        CertFile: certFile,
        KeyFile:  keyFile,
        Port:     port,
    }
}

// Start begins serving webhook requests
func (ws *WebhookServer) Start() error {
    // Load TLS certificate pair
    cert, err := tls.LoadX509KeyPair(ws.CertFile, ws.KeyFile)
    if err != nil {
        return fmt.Errorf("failed to load key pair: %v", err)
    }

    // Configure TLS with modern settings
    tlsConfig := &tls.Config{
        Certificates: []tls.Certificate{cert},
        MinVersion:   tls.VersionTLS12,
    }

    // Set up HTTP routes
    mux := http.NewServeMux()
    mux.HandleFunc("/validate", handlers.HandleValidate)
    mux.HandleFunc("/mutate", handlers.HandleMutate)
    mux.HandleFunc("/health", handlers.HandleHealth)

    ws.server = &http.Server{
        Addr:         fmt.Sprintf(":%d", ws.Port),
        Handler:      mux,
        TLSConfig:    tlsConfig,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    // Handle graceful shutdown
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        fmt.Printf("Starting webhook server on port %d\n", ws.Port)
        if err := ws.server.ListenAndServeTLS("", ""); err != http.ErrServerClosed {
            fmt.Printf("Server error: %v\n", err)
            os.Exit(1)
        }
    }()

    <-stop
    fmt.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    return ws.server.Shutdown(ctx)
}
```

## The Validating Webhook Handler

This handler validates Pod specifications. It enforces that all containers must have resource limits defined, which is a common security and stability requirement.

```go
// pkg/handlers/validate.go
package handlers

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/serializer"
)

var (
    // Universal deserializer for decoding admission requests
    runtimeScheme = runtime.NewScheme()
    codecFactory  = serializer.NewCodecFactory(runtimeScheme)
    deserializer  = codecFactory.UniversalDeserializer()
)

// HandleValidate processes validation admission requests
func HandleValidate(w http.ResponseWriter, r *http.Request) {
    // Read the request body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, fmt.Sprintf("could not read request body: %v", err), http.StatusBadRequest)
        return
    }

    // Parse the AdmissionReview request
    var admissionReview admissionv1.AdmissionReview
    if _, _, err := deserializer.Decode(body, nil, &admissionReview); err != nil {
        http.Error(w, fmt.Sprintf("could not decode body: %v", err), http.StatusBadRequest)
        return
    }

    // Validate the pod and build the response
    response := validatePod(admissionReview.Request)

    // Construct the AdmissionReview response
    admissionReview.Response = response
    admissionReview.Response.UID = admissionReview.Request.UID

    // Send the response
    respBytes, err := json.Marshal(admissionReview)
    if err != nil {
        http.Error(w, fmt.Sprintf("could not marshal response: %v", err), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(respBytes)
}

// validatePod checks if a pod meets our requirements
func validatePod(request *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    // Only validate Pod resources
    if request.Kind.Kind != "Pod" {
        return &admissionv1.AdmissionResponse{Allowed: true}
    }

    // Parse the Pod object from the request
    var pod corev1.Pod
    if err := json.Unmarshal(request.Object.Raw, &pod); err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("could not unmarshal pod: %v", err),
            },
        }
    }

    // Skip validation for system namespaces
    if pod.Namespace == "kube-system" || pod.Namespace == "kube-public" {
        return &admissionv1.AdmissionResponse{Allowed: true}
    }

    // Validate each container has resource limits
    for _, container := range pod.Spec.Containers {
        if container.Resources.Limits == nil {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: fmt.Sprintf("container %s must have resource limits defined", container.Name),
                    Reason:  metav1.StatusReasonForbidden,
                    Code:    403,
                },
            }
        }

        // Check for CPU limit
        if _, ok := container.Resources.Limits[corev1.ResourceCPU]; !ok {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: fmt.Sprintf("container %s must have CPU limit defined", container.Name),
                    Reason:  metav1.StatusReasonForbidden,
                    Code:    403,
                },
            }
        }

        // Check for memory limit
        if _, ok := container.Resources.Limits[corev1.ResourceMemory]; !ok {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: fmt.Sprintf("container %s must have memory limit defined", container.Name),
                    Reason:  metav1.StatusReasonForbidden,
                    Code:    403,
                },
            }
        }
    }

    // All validations passed
    return &admissionv1.AdmissionResponse{
        Allowed: true,
        Result: &metav1.Status{
            Message: "validation passed",
        },
    }
}
```

## The Mutating Webhook Handler

This handler automatically injects labels and annotations into Pods. It uses JSON Patch format to modify the object, which is required by the Kubernetes API.

```go
// pkg/handlers/mutate.go
package handlers

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// patchOperation represents a single JSON Patch operation
type patchOperation struct {
    Op    string      `json:"op"`
    Path  string      `json:"path"`
    Value interface{} `json:"value,omitempty"`
}

// HandleMutate processes mutating admission requests
func HandleMutate(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, fmt.Sprintf("could not read request body: %v", err), http.StatusBadRequest)
        return
    }

    var admissionReview admissionv1.AdmissionReview
    if _, _, err := deserializer.Decode(body, nil, &admissionReview); err != nil {
        http.Error(w, fmt.Sprintf("could not decode body: %v", err), http.StatusBadRequest)
        return
    }

    response := mutatePod(admissionReview.Request)
    admissionReview.Response = response
    admissionReview.Response.UID = admissionReview.Request.UID

    respBytes, err := json.Marshal(admissionReview)
    if err != nil {
        http.Error(w, fmt.Sprintf("could not marshal response: %v", err), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(respBytes)
}

// mutatePod adds default labels and annotations to pods
func mutatePod(request *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    if request.Kind.Kind != "Pod" {
        return &admissionv1.AdmissionResponse{Allowed: true}
    }

    var pod corev1.Pod
    if err := json.Unmarshal(request.Object.Raw, &pod); err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("could not unmarshal pod: %v", err),
            },
        }
    }

    // Skip mutation for system namespaces
    if pod.Namespace == "kube-system" || pod.Namespace == "kube-public" {
        return &admissionv1.AdmissionResponse{Allowed: true}
    }

    // Build the patch operations
    var patches []patchOperation

    // Add labels if they do not exist
    if pod.Labels == nil {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/metadata/labels",
            Value: map[string]string{},
        })
    }

    // Add a managed-by label if not present
    if _, exists := pod.Labels["managed-by"]; !exists {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/metadata/labels/managed-by",
            Value: "admission-webhook",
        })
    }

    // Add annotations if they do not exist
    if pod.Annotations == nil {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/metadata/annotations",
            Value: map[string]string{},
        })
    }

    // Add timestamp annotation
    patches = append(patches, patchOperation{
        Op:    "add",
        Path:  "/metadata/annotations/webhook.example.com~1mutated",
        Value: "true",
    })

    // If there are no patches, just allow the request
    if len(patches) == 0 {
        return &admissionv1.AdmissionResponse{Allowed: true}
    }

    // Serialize the patches to JSON
    patchBytes, err := json.Marshal(patches)
    if err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("could not marshal patch: %v", err),
            },
        }
    }

    // Return the response with the patch
    patchType := admissionv1.PatchTypeJSONPatch
    return &admissionv1.AdmissionResponse{
        Allowed:   true,
        Patch:     patchBytes,
        PatchType: &patchType,
    }
}

// HandleHealth responds to health check requests
func HandleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
}
```

## The Main Entry Point

This file ties everything together and starts the webhook server with configuration from environment variables.

```go
// cmd/webhook/main.go
package main

import (
    "fmt"
    "os"
    "strconv"

    "github.com/yourorg/admission-webhook/pkg/server"
)

func main() {
    // Read configuration from environment variables
    certFile := getEnv("TLS_CERT_FILE", "/etc/webhook/certs/tls.crt")
    keyFile := getEnv("TLS_KEY_FILE", "/etc/webhook/certs/tls.key")
    port := getEnvInt("WEBHOOK_PORT", 8443)

    // Create and start the webhook server
    ws := server.NewWebhookServer(certFile, keyFile, port)

    fmt.Printf("Webhook server configured with cert=%s, key=%s, port=%d\n", certFile, keyFile, port)

    if err := ws.Start(); err != nil {
        fmt.Printf("Failed to start server: %v\n", err)
        os.Exit(1)
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}
```

## Certificate Management

Kubernetes requires TLS for webhook communication. You have several options for certificate management:

| Method | Complexity | Production Ready | Auto-Renewal |
|--------|------------|------------------|--------------|
| Self-signed certificates | Low | No | No |
| cert-manager | Medium | Yes | Yes |
| Kubernetes CA API | Medium | Yes | Manual |
| External CA | High | Yes | Depends |

Here is a script to generate self-signed certificates for development:

```bash
#!/bin/bash
# scripts/generate-certs.sh
# Generate self-signed certificates for the webhook server

set -e

SERVICE_NAME=${SERVICE_NAME:-admission-webhook}
NAMESPACE=${NAMESPACE:-default}
SECRET_NAME=${SECRET_NAME:-webhook-certs}
CERT_DIR=${CERT_DIR:-./certs}

mkdir -p ${CERT_DIR}

# Generate CA private key
openssl genrsa -out ${CERT_DIR}/ca.key 2048

# Generate CA certificate
openssl req -x509 -new -nodes \
    -key ${CERT_DIR}/ca.key \
    -days 365 \
    -out ${CERT_DIR}/ca.crt \
    -subj "/CN=Admission Webhook CA"

# Generate server private key
openssl genrsa -out ${CERT_DIR}/tls.key 2048

# Create a config file for the server certificate
cat > ${CERT_DIR}/server.conf <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
CN = ${SERVICE_NAME}.${NAMESPACE}.svc

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${SERVICE_NAME}
DNS.2 = ${SERVICE_NAME}.${NAMESPACE}
DNS.3 = ${SERVICE_NAME}.${NAMESPACE}.svc
DNS.4 = ${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local
EOF

# Generate server CSR
openssl req -new \
    -key ${CERT_DIR}/tls.key \
    -out ${CERT_DIR}/server.csr \
    -config ${CERT_DIR}/server.conf

# Sign the server certificate with our CA
openssl x509 -req \
    -in ${CERT_DIR}/server.csr \
    -CA ${CERT_DIR}/ca.crt \
    -CAkey ${CERT_DIR}/ca.key \
    -CAcreateserial \
    -out ${CERT_DIR}/tls.crt \
    -days 365 \
    -extensions v3_req \
    -extfile ${CERT_DIR}/server.conf

# Get the CA bundle in base64 for the webhook configuration
CA_BUNDLE=$(cat ${CERT_DIR}/ca.crt | base64 | tr -d '\n')
echo "CA_BUNDLE=${CA_BUNDLE}"

# Create the Kubernetes secret
kubectl create secret tls ${SECRET_NAME} \
    --cert=${CERT_DIR}/tls.crt \
    --key=${CERT_DIR}/tls.key \
    --namespace=${NAMESPACE} \
    --dry-run=client -o yaml > ${CERT_DIR}/webhook-secret.yaml

echo "Certificates generated in ${CERT_DIR}"
echo "Secret manifest: ${CERT_DIR}/webhook-secret.yaml"
```

For production environments, use cert-manager:

```yaml
# cert-manager-issuer.yaml
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
  name: webhook-cert
  namespace: default
spec:
  secretName: webhook-certs
  duration: 8760h # 1 year
  renewBefore: 720h # 30 days before expiry
  subject:
    organizations:
      - yourorg
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
  dnsNames:
    - admission-webhook
    - admission-webhook.default
    - admission-webhook.default.svc
    - admission-webhook.default.svc.cluster.local
  issuerRef:
    name: webhook-selfsigned
    kind: Issuer
```

## Kubernetes Deployment Manifests

Deploy the webhook server as a Deployment with a Service:

```yaml
# deploy/webhook-deployment.yaml
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
          env:
            - name: TLS_CERT_FILE
              value: /etc/webhook/certs/tls.crt
            - name: TLS_KEY_FILE
              value: /etc/webhook/certs/tls.key
            - name: WEBHOOK_PORT
              value: "8443"
          volumeMounts:
            - name: certs
              mountPath: /etc/webhook/certs
              readOnly: true
          resources:
            limits:
              cpu: 200m
              memory: 128Mi
            requests:
              cpu: 100m
              memory: 64Mi
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
      volumes:
        - name: certs
          secret:
            secretName: webhook-certs
---
apiVersion: v1
kind: Service
metadata:
  name: admission-webhook
  namespace: default
spec:
  selector:
    app: admission-webhook
  ports:
    - port: 443
      targetPort: 8443
      protocol: TCP
```

## WebhookConfiguration Resources

Register your webhooks with Kubernetes using these configuration resources.

### Validating Webhook Configuration

```yaml
# deploy/validating-webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validation
  annotations:
    # If using cert-manager, add this annotation for automatic CA injection
    cert-manager.io/inject-ca-from: default/webhook-cert
webhooks:
  - name: validate.pods.example.com
    # The CA bundle must match the certificate used by the webhook server
    clientConfig:
      service:
        name: admission-webhook
        namespace: default
        path: /validate
        port: 443
      # Replace with your actual CA bundle if not using cert-manager
      caBundle: ${CA_BUNDLE}
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
        scope: "Namespaced"
    # Which objects trigger this webhook
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values:
            - kube-system
            - kube-public
            - kube-node-lease
    # Fail open or closed when the webhook is unavailable
    failurePolicy: Fail
    # How long to wait for a response
    timeoutSeconds: 10
    # Reduce API server load by only sending relevant fields
    matchPolicy: Equivalent
    # API version sent to the webhook
    admissionReviewVersions: ["v1"]
    # How side effects are handled
    sideEffects: None
```

### Mutating Webhook Configuration

```yaml
# deploy/mutating-webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: pod-mutation
  annotations:
    cert-manager.io/inject-ca-from: default/webhook-cert
webhooks:
  - name: mutate.pods.example.com
    clientConfig:
      service:
        name: admission-webhook
        namespace: default
        path: /mutate
        port: 443
      caBundle: ${CA_BUNDLE}
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
        scope: "Namespaced"
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values:
            - kube-system
            - kube-public
            - kube-node-lease
    failurePolicy: Ignore
    timeoutSeconds: 10
    matchPolicy: Equivalent
    admissionReviewVersions: ["v1"]
    sideEffects: None
    # Control ordering of mutating webhooks
    reinvocationPolicy: Never
```

## Failure Policies

The `failurePolicy` field determines what happens when the webhook is unavailable:

| Policy | Behavior | Use Case |
|--------|----------|----------|
| Fail | Reject the request if webhook fails | Security-critical validation |
| Ignore | Allow the request if webhook fails | Non-critical mutations |

Choose wisely:
- Use `Fail` for security validation to prevent bypassing checks
- Use `Ignore` for mutations that add convenience features
- Always ensure high availability for `Fail` policy webhooks

## Testing Your Webhooks

### Unit Testing the Handlers

```go
// pkg/handlers/validate_test.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
)

func TestValidatePod_WithResourceLimits(t *testing.T) {
    // Create a pod with proper resource limits
    pod := &corev1.Pod{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "test-pod",
            Namespace: "default",
        },
        Spec: corev1.PodSpec{
            Containers: []corev1.Container{
                {
                    Name:  "test-container",
                    Image: "nginx:latest",
                    Resources: corev1.ResourceRequirements{
                        Limits: corev1.ResourceList{
                            corev1.ResourceCPU:    resource.MustParse("100m"),
                            corev1.ResourceMemory: resource.MustParse("128Mi"),
                        },
                    },
                },
            },
        },
    }

    // Serialize the pod
    podBytes, err := json.Marshal(pod)
    if err != nil {
        t.Fatalf("failed to marshal pod: %v", err)
    }

    // Create the admission request
    admissionReview := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Request: &admissionv1.AdmissionRequest{
            UID: "test-uid",
            Kind: metav1.GroupVersionKind{
                Group:   "",
                Version: "v1",
                Kind:    "Pod",
            },
            Resource: metav1.GroupVersionResource{
                Group:    "",
                Version:  "v1",
                Resource: "pods",
            },
            Namespace: "default",
            Operation: admissionv1.Create,
            Object: runtime.RawExtension{
                Raw: podBytes,
            },
        },
    }

    // Serialize the admission review
    reviewBytes, err := json.Marshal(admissionReview)
    if err != nil {
        t.Fatalf("failed to marshal admission review: %v", err)
    }

    // Create test request
    req := httptest.NewRequest(http.MethodPost, "/validate", bytes.NewReader(reviewBytes))
    req.Header.Set("Content-Type", "application/json")

    // Create response recorder
    recorder := httptest.NewRecorder()

    // Call the handler
    HandleValidate(recorder, req)

    // Check response
    if recorder.Code != http.StatusOK {
        t.Errorf("expected status 200, got %d", recorder.Code)
    }

    // Parse the response
    var responseReview admissionv1.AdmissionReview
    if err := json.Unmarshal(recorder.Body.Bytes(), &responseReview); err != nil {
        t.Fatalf("failed to unmarshal response: %v", err)
    }

    if !responseReview.Response.Allowed {
        t.Errorf("expected request to be allowed, but it was denied: %s",
            responseReview.Response.Result.Message)
    }
}

func TestValidatePod_WithoutResourceLimits(t *testing.T) {
    // Create a pod without resource limits
    pod := &corev1.Pod{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "test-pod",
            Namespace: "default",
        },
        Spec: corev1.PodSpec{
            Containers: []corev1.Container{
                {
                    Name:  "test-container",
                    Image: "nginx:latest",
                    // No resource limits defined
                },
            },
        },
    }

    podBytes, _ := json.Marshal(pod)
    admissionReview := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Request: &admissionv1.AdmissionRequest{
            UID: "test-uid",
            Kind: metav1.GroupVersionKind{
                Kind: "Pod",
            },
            Namespace: "default",
            Operation: admissionv1.Create,
            Object: runtime.RawExtension{
                Raw: podBytes,
            },
        },
    }

    reviewBytes, _ := json.Marshal(admissionReview)
    req := httptest.NewRequest(http.MethodPost, "/validate", bytes.NewReader(reviewBytes))
    req.Header.Set("Content-Type", "application/json")
    recorder := httptest.NewRecorder()

    HandleValidate(recorder, req)

    var responseReview admissionv1.AdmissionReview
    json.Unmarshal(recorder.Body.Bytes(), &responseReview)

    if responseReview.Response.Allowed {
        t.Error("expected request to be denied, but it was allowed")
    }
}
```

### Integration Testing with kind

Create a test script that deploys the webhook to a local cluster:

```bash
#!/bin/bash
# scripts/integration-test.sh

set -e

# Create a kind cluster
kind create cluster --name webhook-test

# Build and load the webhook image
docker build -t admission-webhook:test .
kind load docker-image admission-webhook:test --name webhook-test

# Generate certificates
./scripts/generate-certs.sh

# Apply the secret
kubectl apply -f certs/webhook-secret.yaml

# Deploy the webhook
kubectl apply -f deploy/

# Wait for the webhook to be ready
kubectl wait --for=condition=available --timeout=60s deployment/admission-webhook

# Test: Create a pod without resource limits (should fail)
echo "Testing validation webhook - expecting failure..."
if kubectl run test-pod --image=nginx 2>&1 | grep -q "must have resource limits"; then
    echo "PASS: Validation webhook correctly rejected pod without limits"
else
    echo "FAIL: Validation webhook did not reject pod"
    exit 1
fi

# Test: Create a pod with resource limits (should succeed)
echo "Testing validation webhook - expecting success..."
kubectl run test-pod-valid --image=nginx \
    --limits=cpu=100m,memory=128Mi

# Check if the mutation was applied
echo "Testing mutation webhook..."
LABEL=$(kubectl get pod test-pod-valid -o jsonpath='{.metadata.labels.managed-by}')
if [ "$LABEL" == "admission-webhook" ]; then
    echo "PASS: Mutation webhook correctly added label"
else
    echo "FAIL: Mutation webhook did not add label"
    exit 1
fi

# Cleanup
kind delete cluster --name webhook-test
echo "All tests passed!"
```

## Dockerfile

Build a minimal container image for the webhook server:

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
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o webhook ./cmd/webhook

# Use a minimal runtime image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/webhook .

# Run as non-root user
RUN adduser -D -g '' webhook
USER webhook

EXPOSE 8443

ENTRYPOINT ["./webhook"]
```

## Common Pitfalls and Solutions

### Problem: Webhook Timeout

If your webhook takes too long, requests will fail. Set appropriate timeouts:

```yaml
timeoutSeconds: 10  # Default is 10, max is 30
```

Keep your webhook logic fast. Move heavy processing to async workers if needed.

### Problem: CA Bundle Mismatch

The CA bundle in your webhook configuration must match the certificate authority that signed your server certificate. Symptoms include:

```
Error from server: Internal error occurred: failed calling webhook
```

Verify your CA bundle:

```bash
# Decode and check the CA bundle
echo "$CA_BUNDLE" | base64 -d | openssl x509 -text -noout
```

### Problem: DNS Resolution

The API server must resolve your webhook service name. Check that the service exists and has endpoints:

```bash
kubectl get endpoints admission-webhook
```

### Problem: Webhook Not Invoked

Check your rules and selectors. Common issues:
- Namespace selector excludes your target namespace
- API version mismatch
- Operation type not covered

Debug with:

```bash
kubectl get validatingwebhookconfigurations -o yaml
kubectl get mutatingwebhookconfigurations -o yaml
```

## Production Considerations

Before deploying to production, address these items:

1. **High Availability**: Run multiple replicas with pod anti-affinity
2. **Monitoring**: Export metrics and set up alerts for failures
3. **Logging**: Log all admission decisions for audit trails
4. **Rate Limiting**: Protect against excessive requests
5. **Certificate Rotation**: Use cert-manager for automatic renewal
6. **Namespace Exclusions**: Always exclude system namespaces
7. **Failure Policy**: Choose based on your reliability requirements

Add metrics to your webhook:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    admissionRequests = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "admission_requests_total",
            Help: "Total number of admission requests",
        },
        []string{"operation", "resource", "allowed"},
    )

    admissionLatency = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "admission_latency_seconds",
            Help:    "Admission request latency",
            Buckets: prometheus.DefBuckets,
        },
        []string{"operation", "resource"},
    )
)

func init() {
    prometheus.MustRegister(admissionRequests, admissionLatency)
}
```

## Summary

Kubernetes admission webhooks provide powerful extensibility for enforcing policies and modifying resources. Key takeaways:

- Validating webhooks run after mutating webhooks and cannot modify objects
- Mutating webhooks use JSON Patch format to modify resources
- TLS is mandatory, so plan your certificate management strategy
- Use appropriate failure policies based on your requirements
- Test thoroughly with both unit and integration tests
- Monitor your webhooks in production

The complete source code for this webhook is available as a starting point for your own implementations. Extend the validation and mutation logic to match your organization's requirements.
