# How to Build a Webhook Server That Handles Multiple Admission Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Admission Control

Description: Learn how to build a single webhook server that handles multiple admission webhook configurations for different resources, operations, and validation logic in Kubernetes.

---

Kubernetes admission webhooks intercept API requests before resources are persisted to etcd, allowing you to validate or mutate them. Instead of deploying separate webhook servers for each resource type, you can build one server that handles multiple webhooks, reducing operational overhead and resource usage.

A well-designed webhook server routes incoming requests to appropriate handlers based on the resource type and operation, applies the relevant validation or mutation logic, and returns structured responses. This approach scales better than running separate webhook deployments.

## Webhook Request Structure

When the Kubernetes API server calls your webhook, it sends an AdmissionReview object containing details about the requested operation:

```go
type AdmissionReview struct {
    Request *AdmissionRequest `json:"request,omitempty"`
    Response *AdmissionResponse `json:"response,omitempty"`
}

type AdmissionRequest struct {
    UID         types.UID
    Kind        metav1.GroupVersionKind
    Resource    metav1.GroupVersionResource
    SubResource string
    Operation   admissionv1.Operation  // CREATE, UPDATE, DELETE
    Object      runtime.RawExtension    // The object being created/updated
    OldObject   runtime.RawExtension    // For UPDATE operations
    UserInfo    authenticationv1.UserInfo
    Namespace   string
}
```

Your webhook examines these fields to determine which handler should process the request.

## Building a Multi-Handler Webhook Server

Here's a webhook server that routes requests to different handlers based on resource type:

```go
package main

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
    "k8s.io/klog/v2"
)

var (
    scheme = runtime.NewScheme()
    codecs = serializer.NewCodecFactory(scheme)
)

func init() {
    corev1.AddToScheme(scheme)
}

// Handler interface for admission logic
type AdmissionHandler interface {
    Handle(*admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse
}

// WebhookServer manages multiple handlers
type WebhookServer struct {
    handlers map[string]AdmissionHandler  // Key: resource kind
}

func NewWebhookServer() *WebhookServer {
    return &WebhookServer{
        handlers: make(map[string]AdmissionHandler),
    }
}

// Register a handler for a specific resource kind
func (s *WebhookServer) RegisterHandler(kind string, handler AdmissionHandler) {
    s.handlers[kind] = handler
}

// ServeHTTP implements http.Handler
func (s *WebhookServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Read the request body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        klog.Errorf("Failed to read request body: %v", err)
        http.Error(w, "Failed to read request", http.StatusBadRequest)
        return
    }

    // Decode the AdmissionReview
    review := &admissionv1.AdmissionReview{}
    if _, _, err := codecs.UniversalDeserializer().Decode(body, nil, review); err != nil {
        klog.Errorf("Failed to decode admission review: %v", err)
        http.Error(w, "Failed to decode request", http.StatusBadRequest)
        return
    }

    // Route to appropriate handler
    kind := review.Request.Kind.Kind
    handler, exists := s.handlers[kind]
    if !exists {
        // Default: allow the request if no handler registered
        review.Response = &admissionv1.AdmissionResponse{
            UID:     review.Request.UID,
            Allowed: true,
        }
    } else {
        review.Response = handler.Handle(review.Request)
        review.Response.UID = review.Request.UID
    }

    // Encode and send response
    responseBytes, err := json.Marshal(review)
    if err != nil {
        klog.Errorf("Failed to marshal response: %v", err)
        http.Error(w, "Failed to encode response", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)
}

func main() {
    server := NewWebhookServer()

    // Register handlers for different resources
    server.RegisterHandler("Pod", &PodValidator{})
    server.RegisterHandler("ConfigMap", &ConfigMapMutator{})
    server.RegisterHandler("Deployment", &DeploymentValidator{})

    // Start HTTPS server
    mux := http.NewServeMux()
    mux.Handle("/validate", server)
    mux.Handle("/mutate", server)

    klog.Info("Starting webhook server on :8443")
    if err := http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", mux); err != nil {
        klog.Fatalf("Failed to start server: %v", err)
    }
}
```

## Implementing Resource-Specific Handlers

Each handler implements the AdmissionHandler interface. Here's a Pod validator that enforces security policies:

```go
type PodValidator struct{}

func (v *PodValidator) Handle(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    // Decode the Pod object
    pod := &corev1.Pod{}
    if err := json.Unmarshal(req.Object.Raw, pod); err != nil {
        return denyResponse("Failed to decode Pod: " + err.Error())
    }

    // Validation logic
    var violations []string

    // Check 1: Ensure no privileged containers
    for _, container := range pod.Spec.Containers {
        if container.SecurityContext != nil &&
           container.SecurityContext.Privileged != nil &&
           *container.SecurityContext.Privileged {
            violations = append(violations,
                fmt.Sprintf("Container %s runs in privileged mode", container.Name))
        }
    }

    // Check 2: Require resource limits
    for _, container := range pod.Spec.Containers {
        if container.Resources.Limits == nil ||
           container.Resources.Limits.Memory().IsZero() {
            violations = append(violations,
                fmt.Sprintf("Container %s missing memory limit", container.Name))
        }
    }

    // Return response
    if len(violations) > 0 {
        return denyResponse("Pod validation failed: " +
            fmt.Sprintf("%v", violations))
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
    }
}

func denyResponse(message string) *admissionv1.AdmissionResponse {
    return &admissionv1.AdmissionResponse{
        Allowed: false,
        Result: &metav1.Status{
            Message: message,
        },
    }
}
```

## Creating a Mutating Webhook Handler

Mutating webhooks modify resources before they're persisted. Here's a ConfigMap mutator that adds labels:

```go
type ConfigMapMutator struct{}

func (m *ConfigMapMutator) Handle(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    configMap := &corev1.ConfigMap{}
    if err := json.Unmarshal(req.Object.Raw, configMap); err != nil {
        return denyResponse("Failed to decode ConfigMap: " + err.Error())
    }

    // Add labels if missing
    if configMap.Labels == nil {
        configMap.Labels = make(map[string]string)
    }

    if _, exists := configMap.Labels["managed-by"]; !exists {
        configMap.Labels["managed-by"] = "admission-webhook"
    }

    // Create JSON patch
    patches := []map[string]interface{}{
        {
            "op":    "add",
            "path":  "/metadata/labels/managed-by",
            "value": "admission-webhook",
        },
    }

    patchBytes, err := json.Marshal(patches)
    if err != nil {
        return denyResponse("Failed to create patch: " + err.Error())
    }

    patchType := admissionv1.PatchTypeJSONPatch
    return &admissionv1.AdmissionResponse{
        Allowed:   true,
        Patch:     patchBytes,
        PatchType: &patchType,
    }
}
```

## Registering Multiple Webhook Configurations

You need separate ValidatingWebhookConfiguration and MutatingWebhookConfiguration resources for each webhook:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validator
webhooks:
- name: pod.validator.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: default
      path: /validate
    caBundle: <BASE64_ENCODED_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: configmap-mutator
webhooks:
- name: configmap.mutator.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: default
      path: /mutate
    caBundle: <BASE64_ENCODED_CA_CERT>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["configmaps"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

## Handling Different Operations

Differentiate behavior based on the operation type:

```go
type DeploymentValidator struct{}

func (v *DeploymentValidator) Handle(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    switch req.Operation {
    case admissionv1.Create:
        return v.handleCreate(req)
    case admissionv1.Update:
        return v.handleUpdate(req)
    case admissionv1.Delete:
        return v.handleDelete(req)
    default:
        return &admissionv1.AdmissionResponse{Allowed: true}
    }
}

func (v *DeploymentValidator) handleUpdate(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    // Compare old and new objects
    oldDeploy := &appsv1.Deployment{}
    newDeploy := &appsv1.Deployment{}

    json.Unmarshal(req.OldObject.Raw, oldDeploy)
    json.Unmarshal(req.Object.Raw, newDeploy)

    // Prevent scaling down below minimum
    oldReplicas := *oldDeploy.Spec.Replicas
    newReplicas := *newDeploy.Spec.Replicas

    if newReplicas < oldReplicas && newReplicas < 2 {
        return denyResponse("Cannot scale deployment below 2 replicas")
    }

    return &admissionv1.AdmissionResponse{Allowed: true}
}
```

## Error Handling and Logging

Add structured logging and error handling:

```go
func (s *WebhookServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    defer func() {
        klog.Infof("Request processed in %v", time.Since(start))
    }()

    // ... request handling ...

    // Log the decision
    klog.Infof("Resource: %s/%s, Operation: %s, Allowed: %v",
        review.Request.Kind.Kind,
        review.Request.Name,
        review.Request.Operation,
        review.Response.Allowed)
}
```

## Testing Multiple Webhooks

Test each webhook independently:

```bash
# Test pod validation
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: nginx
    image: nginx
    securityContext:
      privileged: true  # Should be denied
EOF

# Test configmap mutation
kubectl create configmap test-cm --from-literal=key=value
kubectl get configmap test-cm -o yaml  # Should have managed-by label
```

A multi-handler webhook server consolidates admission logic into a single deployment, making it easier to manage certificates, monitor performance, and maintain consistent error handling across different resource types.
