# How to Implement Custom Resource Defaulting with Mutating Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, CRD

Description: Learn how to use mutating webhooks to automatically set default values for custom resource fields, providing a better user experience and ensuring consistency across your CRDs.

---

When users create Kubernetes resources, they often omit optional fields. Built-in resources like Pods get sensible defaults automatically. You can provide the same experience for your custom resources using mutating admission webhooks that populate default values before resources are persisted to etcd.

Defaulting webhooks intercept resource creation and modification requests, fill in missing fields with appropriate defaults, and return the modified resource. This simplifies manifests, enforces organizational standards, and makes your CRDs easier to use.

## Why Use Webhooks for Defaulting

You could use OpenAPI schema defaults in your CRD, but webhooks provide more flexibility. Webhooks can compute defaults based on other fields, use external configuration, or apply complex business logic that schema-based defaults cannot handle.

Webhooks run before validation, so defaulted values get validated. This ensures defaults meet your validation rules and lets users override them when needed.

## Basic Mutating Webhook Structure

Create a webhook server that receives AdmissionReview requests and returns modified resources:

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/serializer"
    "k8s.io/klog/v2"
)

var (
    scheme = runtime.NewScheme()
    codecs = serializer.NewCodecFactory(scheme)
)

type DefaultingWebhook struct{}

func (w *DefaultingWebhook) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(rw, "failed to read request", http.StatusBadRequest)
        return
    }

    review := &admissionv1.AdmissionReview{}
    if _, _, err := codecs.UniversalDeserializer().Decode(body, nil, review); err != nil {
        http.Error(rw, "failed to decode request", http.StatusBadRequest)
        return
    }

    // Apply defaults
    review.Response = w.mutate(review.Request)
    review.Response.UID = review.Request.UID

    responseBytes, err := json.Marshal(review)
    if err != nil {
        http.Error(rw, "failed to encode response", http.StatusInternalServerError)
        return
    }

    rw.Header().Set("Content-Type", "application/json")
    rw.Write(responseBytes)
}

func (w *DefaultingWebhook) mutate(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    // Decode the object
    var obj map[string]interface{}
    if err := json.Unmarshal(req.Object.Raw, &obj); err != nil {
        return errorResponse(err)
    }

    // Apply defaults based on resource kind
    patches := w.applyDefaults(obj, req.Kind.Kind)

    if len(patches) == 0 {
        // No changes needed
        return &admissionv1.AdmissionResponse{
            Allowed: true,
        }
    }

    // Return JSON patch
    patchBytes, err := json.Marshal(patches)
    if err != nil {
        return errorResponse(err)
    }

    patchType := admissionv1.PatchTypeJSONPatch
    return &admissionv1.AdmissionResponse{
        Allowed:   true,
        Patch:     patchBytes,
        PatchType: &patchType,
    }
}

func errorResponse(err error) *admissionv1.AdmissionResponse {
    return &admissionv1.AdmissionResponse{
        Allowed: false,
        Result: &metav1.Status{
            Message: err.Error(),
        },
    }
}
```

## Implementing Application Defaulting

Here's a complete example for an Application custom resource:

```go
type ApplicationSpec struct {
    Image    string            `json:"image"`
    Replicas *int32            `json:"replicas,omitempty"`
    Port     *int32            `json:"port,omitempty"`
    Protocol string            `json:"protocol,omitempty"`
    Resources *ResourceRequirements `json:"resources,omitempty"`
    Labels   map[string]string `json:"labels,omitempty"`
}

func (w *DefaultingWebhook) applyDefaults(obj map[string]interface{}, kind string) []map[string]interface{} {
    if kind != "Application" {
        return nil
    }

    var patches []map[string]interface{}

    spec, ok := obj["spec"].(map[string]interface{})
    if !ok {
        return nil
    }

    // Default replicas to 1
    if _, exists := spec["replicas"]; !exists {
        patches = append(patches, map[string]interface{}{
            "op":    "add",
            "path":  "/spec/replicas",
            "value": 1,
        })
    }

    // Default port to 8080
    if _, exists := spec["port"]; !exists {
        patches = append(patches, map[string]interface{}{
            "op":    "add",
            "path":  "/spec/port",
            "value": 8080,
        })
    }

    // Default protocol to HTTP
    if _, exists := spec["protocol"]; !exists {
        patches = append(patches, map[string]interface{}{
            "op":    "add",
            "path":  "/spec/protocol",
            "value": "HTTP",
        })
    }

    // Add default resource requests if not specified
    if _, exists := spec["resources"]; !exists {
        patches = append(patches, map[string]interface{}{
            "op":   "add",
            "path": "/spec/resources",
            "value": map[string]interface{}{
                "requests": map[string]string{
                    "cpu":    "100m",
                    "memory": "128Mi",
                },
                "limits": map[string]string{
                    "cpu":    "500m",
                    "memory": "512Mi",
                },
            },
        })
    }

    // Add default labels
    if labels, exists := spec["labels"].(map[string]interface{}); !exists || labels == nil {
        patches = append(patches, map[string]interface{}{
            "op":   "add",
            "path": "/spec/labels",
            "value": map[string]string{
                "managed-by": "application-operator",
            },
        })
    }

    return patches
}
```

## Conditional Defaults Based on Other Fields

Set defaults based on other field values:

```go
func applyConditionalDefaults(spec map[string]interface{}) []map[string]interface{} {
    var patches []map[string]interface{}

    environment, _ := spec["environment"].(string)

    // Different defaults for production vs development
    if environment == "production" {
        if _, exists := spec["replicas"]; !exists {
            patches = append(patches, map[string]interface{}{
                "op":    "add",
                "path":  "/spec/replicas",
                "value": 3,  // Production: 3 replicas
            })
        }

        if _, exists := spec["resources"]; !exists {
            patches = append(patches, map[string]interface{}{
                "op":   "add",
                "path": "/spec/resources",
                "value": map[string]interface{}{
                    "requests": map[string]string{
                        "cpu":    "500m",
                        "memory": "1Gi",
                    },
                },
            })
        }
    } else {
        // Development: smaller defaults
        if _, exists := spec["replicas"]; !exists {
            patches = append(patches, map[string]interface{}{
                "op":    "add",
                "path":  "/spec/replicas",
                "value": 1,
            })
        }
    }

    return patches
}
```

## Using Kubebuilder's Defaulting Interface

If you're using Kubebuilder, implement the Defaulter interface:

```go
package v1

import (
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
)

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    Image     string            `json:"image"`
    Replicas  *int32            `json:"replicas,omitempty"`
    Port      *int32            `json:"port,omitempty"`
    Protocol  string            `json:"protocol,omitempty"`
    Resources *ResourceRequirements `json:"resources,omitempty"`
}

// Implement the Defaulter interface
func (a *Application) Default() {
    // Set default replicas
    if a.Spec.Replicas == nil {
        replicas := int32(1)
        a.Spec.Replicas = &replicas
    }

    // Set default port
    if a.Spec.Port == nil {
        port := int32(8080)
        a.Spec.Port = &port
    }

    // Set default protocol
    if a.Spec.Protocol == "" {
        a.Spec.Protocol = "HTTP"
    }

    // Set default resources
    if a.Spec.Resources == nil {
        a.Spec.Resources = &ResourceRequirements{
            Requests: map[string]string{
                "cpu":    "100m",
                "memory": "128Mi",
            },
            Limits: map[string]string{
                "cpu":    "500m",
                "memory": "512Mi",
            },
        }
    }
}

func (a *Application) SetupWebhookWithManager(mgr ctrl.Manager) error {
    return ctrl.NewWebhookManagedBy(mgr).
        For(a).
        Complete()
}
```

Add the webhook marker:

```go
// +kubebuilder:webhook:path=/mutate-example-com-v1-application,mutating=true,failurePolicy=fail,groups=example.com,resources=applications,verbs=create;update,versions=v1,name=mapplication.kb.io,sideEffects=None,admissionReviewVersions=v1
```

Run `make manifests` to generate the webhook configuration.

## Mutating Webhook Configuration

Deploy the webhook configuration:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: application-defaulting
webhooks:
- name: default.application.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: default
      path: /mutate-application
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["example.com"]
    apiVersions: ["v1"]
    resources: ["applications"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail  # Fail requests if webhook is unavailable
```

## Handling Arrays and Nested Structures

Default values in arrays require careful path construction:

```go
func defaultContainerPorts(obj map[string]interface{}) []map[string]interface{} {
    var patches []map[string]interface{}

    spec, _ := obj["spec"].(map[string]interface{})
    containers, _ := spec["containers"].([]interface{})

    for i, container := range containers {
        c, _ := container.(map[string]interface{})

        // Add default port if not specified
        if _, exists := c["containerPort"]; !exists {
            patches = append(patches, map[string]interface{}{
                "op":    "add",
                "path":  fmt.Sprintf("/spec/containers/%d/containerPort", i),
                "value": 8080,
            })
        }

        // Add default protocol
        if _, exists := c["protocol"]; !exists {
            patches = append(patches, map[string]interface{}{
                "op":    "add",
                "path":  fmt.Sprintf("/spec/containers/%d/protocol", i),
                "value": "TCP",
            })
        }
    }

    return patches
}
```

## Defaulting Based on Namespace

Apply different defaults based on the namespace:

```go
func (w *DefaultingWebhook) mutate(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    var obj map[string]interface{}
    json.Unmarshal(req.Object.Raw, &obj)

    namespace := req.Namespace
    var patches []map[string]interface{}

    // Apply environment-specific defaults
    if namespace == "production" {
        patches = w.applyProductionDefaults(obj)
    } else if namespace == "development" {
        patches = w.applyDevelopmentDefaults(obj)
    } else {
        patches = w.applyStandardDefaults(obj)
    }

    // Return patches
    patchBytes, _ := json.Marshal(patches)
    patchType := admissionv1.PatchTypeJSONPatch

    return &admissionv1.AdmissionResponse{
        Allowed:   true,
        Patch:     patchBytes,
        PatchType: &patchType,
    }
}
```

## Testing Defaulting Webhooks

Test webhook behavior:

```bash
# Create a minimal application
kubectl apply -f - <<EOF
apiVersion: example.com/v1
kind: Application
metadata:
  name: test-app
  namespace: default
spec:
  image: nginx:latest
EOF

# Check that defaults were applied
kubectl get application test-app -o yaml
```

You should see the defaulted fields:

```yaml
spec:
  image: nginx:latest
  replicas: 1
  port: 8080
  protocol: HTTP
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

## Logging Default Applications

Add logging to track what defaults get applied:

```go
func (w *DefaultingWebhook) applyDefaults(obj map[string]interface{}, kind string) []map[string]interface{} {
    patches := w.generatePatches(obj, kind)

    if len(patches) > 0 {
        name, _ := obj["metadata"].(map[string]interface{})["name"].(string)
        klog.Infof("Applied %d defaults to %s/%s", len(patches), kind, name)

        for _, patch := range patches {
            klog.V(2).Infof("  %s: %s = %v", patch["op"], patch["path"], patch["value"])
        }
    }

    return patches
}
```

## Error Handling

Handle errors gracefully:

```go
func (w *DefaultingWebhook) mutate(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    var obj map[string]interface{}
    if err := json.Unmarshal(req.Object.Raw, &obj); err != nil {
        klog.Errorf("Failed to unmarshal object: %v", err)
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("Failed to parse request: %v", err),
            },
        }
    }

    patches, err := w.applyDefaults(obj, req.Kind.Kind)
    if err != nil {
        klog.Errorf("Failed to apply defaults: %v", err)
        // Optionally fail the request or allow it through without defaults
        return &admissionv1.AdmissionResponse{
            Allowed: true,  // Allow but don't apply defaults
        }
    }

    // ... return patches
}
```

Mutating webhooks for defaulting improve the user experience by reducing boilerplate in resource manifests while ensuring consistency and best practices across your cluster.
