# How to Write Validating Admission Webhooks in Go for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Go, Admission Control

Description: Learn how to implement validating admission webhooks in Go to enforce custom validation rules and policies for Kubernetes resources before they are persisted to etcd.

---

Schema validation catches type errors and basic constraints. But what about business rules? Like preventing deployments to production namespaces outside business hours, or ensuring every pod has resource limits, or validating that container images come from approved registries?

Validating admission webhooks let you implement these policies. They run during the admission phase, before resources reach etcd. Your webhook receives create, update, or delete requests and returns allow or deny decisions. This guide shows you how to build them in Go.

## Understanding the Admission Flow

When someone creates or modifies a resource, Kubernetes runs it through multiple admission controllers. Schema validation happens first. Then custom admission webhooks run. If any webhook denies the request, the entire operation fails.

Validating webhooks cannot modify the request. They only approve or reject. This makes them perfect for enforcing policies without worrying about unintended side effects.

## Setting Up the Project

Create a new Go project for your webhook server.

```bash
mkdir validation-webhook
cd validation-webhook
go mod init github.com/example/validation-webhook

# Install dependencies
go get k8s.io/api/admission/v1
go get k8s.io/apimachinery/pkg/apis/meta/v1
go get k8s.io/apimachinery/pkg/runtime
go get k8s.io/apimachinery/pkg/runtime/serializer
```

## Implementing the Webhook Server

Create the main webhook handler that processes admission reviews.

```go
// main.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "strings"

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
    corev1.AddToScheme(scheme)
    admissionv1.AddToScheme(scheme)
}

type WebhookServer struct {
    server *http.Server
}

func (ws *WebhookServer) serve(w http.ResponseWriter, r *http.Request) {
    var body []byte
    if r.Body != nil {
        if data, err := ioutil.ReadAll(r.Body); err == nil {
            body = data
        }
    }

    if len(body) == 0 {
        http.Error(w, "empty body", http.StatusBadRequest)
        return
    }

    contentType := r.Header.Get("Content-Type")
    if contentType != "application/json" {
        http.Error(w, "invalid Content-Type", http.StatusBadRequest)
        return
    }

    var admissionResponse *admissionv1.AdmissionResponse
    ar := admissionv1.AdmissionReview{}
    deserializer := codecs.UniversalDeserializer()
    if _, _, err := deserializer.Decode(body, nil, &ar); err != nil {
        admissionResponse = &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    } else {
        admissionResponse = ws.validate(&ar)
    }

    admissionReview := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
    }
    if admissionResponse != nil {
        admissionReview.Response = admissionResponse
        if ar.Request != nil {
            admissionReview.Response.UID = ar.Request.UID
        }
    }

    resp, err := json.Marshal(admissionReview)
    if err != nil {
        http.Error(w, fmt.Sprintf("marshaling error: %v", err), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(resp)
}

func (ws *WebhookServer) validate(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    req := ar.Request

    switch req.Kind.Kind {
    case "Pod":
        return validatePod(req)
    case "Deployment":
        return validateDeployment(req)
    case "Service":
        return validateService(req)
    default:
        return &admissionv1.AdmissionResponse{
            Allowed: true,
        }
    }
}

func main() {
    ws := &WebhookServer{
        server: &http.Server{
            Addr: ":8443",
        },
    }

    http.HandleFunc("/validate", ws.serve)
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    fmt.Println("Starting webhook server on :8443")
    if err := ws.server.ListenAndServeTLS("/certs/tls.crt", "/certs/tls.key"); err != nil {
        panic(err)
    }
}
```

## Implementing Pod Validation

Add validation logic for pods that enforces resource limits and approved registries.

```go
// validators.go
package main

import (
    "encoding/json"
    "fmt"
    "strings"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var approvedRegistries = []string{
    "docker.io/library",
    "gcr.io/mycompany",
    "registry.example.com",
}

func validatePod(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    var pod corev1.Pod
    if err := json.Unmarshal(req.Object.Raw, &pod); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Check for resource limits
    if err := validateResourceLimits(&pod); err != nil {
        return denyResponse(err.Error())
    }

    // Check for approved registries
    if err := validateImageRegistries(&pod); err != nil {
        return denyResponse(err.Error())
    }

    // Check for security context
    if err := validateSecurityContext(&pod); err != nil {
        return denyResponse(err.Error())
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
    }
}

func validateResourceLimits(pod *corev1.Pod) error {
    for _, container := range pod.Spec.Containers {
        if container.Resources.Limits.Cpu().IsZero() {
            return fmt.Errorf("container %s must have CPU limit set", container.Name)
        }
        if container.Resources.Limits.Memory().IsZero() {
            return fmt.Errorf("container %s must have memory limit set", container.Name)
        }
        if container.Resources.Requests.Cpu().IsZero() {
            return fmt.Errorf("container %s must have CPU request set", container.Name)
        }
        if container.Resources.Requests.Memory().IsZero() {
            return fmt.Errorf("container %s must have memory request set", container.Name)
        }
    }
    return nil
}

func validateImageRegistries(pod *corev1.Pod) error {
    for _, container := range pod.Spec.Containers {
        approved := false
        for _, registry := range approvedRegistries {
            if strings.HasPrefix(container.Image, registry) {
                approved = true
                break
            }
        }
        if !approved {
            return fmt.Errorf("container %s uses unapproved registry: %s",
                container.Name, container.Image)
        }
    }
    return nil
}

func validateSecurityContext(pod *corev1.Pod) error {
    // Deny privileged containers
    for _, container := range pod.Spec.Containers {
        if container.SecurityContext != nil &&
           container.SecurityContext.Privileged != nil &&
           *container.SecurityContext.Privileged {
            return fmt.Errorf("privileged containers are not allowed: %s", container.Name)
        }
    }

    // Require non-root user in production
    if strings.HasPrefix(pod.Namespace, "prod-") {
        for _, container := range pod.Spec.Containers {
            if container.SecurityContext == nil ||
               container.SecurityContext.RunAsNonRoot == nil ||
               !*container.SecurityContext.RunAsNonRoot {
                return fmt.Errorf("containers in production must run as non-root: %s",
                    container.Name)
            }
        }
    }

    return nil
}

func denyResponse(message string) *admissionv1.AdmissionResponse {
    return &admissionv1.AdmissionResponse{
        Allowed: false,
        Result: &metav1.Status{
            Status:  "Failure",
            Message: message,
            Reason:  metav1.StatusReasonInvalid,
            Code:    400,
        },
    }
}
```

## Validating Deployments

Add deployment-specific validation rules.

```go
func validateDeployment(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
    var deployment appsv1.Deployment
    if err := json.Unmarshal(req.Object.Raw, &deployment); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Validate replica count
    if deployment.Spec.Replicas != nil && *deployment.Spec.Replicas > 10 {
        return denyResponse("deployments cannot have more than 10 replicas")
    }

    // Ensure production deployments have multiple replicas
    if strings.HasPrefix(deployment.Namespace, "prod-") {
        if deployment.Spec.Replicas == nil || *deployment.Spec.Replicas < 2 {
            return denyResponse("production deployments must have at least 2 replicas")
        }
    }

    // Validate pod template
    pod := corev1.Pod{
        Spec: deployment.Spec.Template.Spec,
    }
    pod.Namespace = deployment.Namespace

    if err := validateResourceLimits(&pod); err != nil {
        return denyResponse(err.Error())
    }

    if err := validateImageRegistries(&pod); err != nil {
        return denyResponse(err.Error())
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
    }
}
```

## Building and Deploying the Webhook

Create a Dockerfile for the webhook.

```dockerfile
FROM golang:1.21 as builder
WORKDIR /workspace
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o webhook .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /workspace/webhook .
ENTRYPOINT ["./webhook"]
```

Build and push the image.

```bash
docker build -t registry.example.com/validation-webhook:v1.0.0 .
docker push registry.example.com/validation-webhook:v1.0.0
```

Deploy to Kubernetes.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: webhook-system

---
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
        ports:
        - containerPort: 8443
          name: webhook
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 8443
            scheme: HTTPS
      volumes:
      - name: certs
        secret:
          secretName: webhook-certs

---
apiVersion: v1
kind: Service
metadata:
  name: validation-webhook
  namespace: webhook-system
spec:
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: validation-webhook
```

## Configuring the ValidatingWebhookConfiguration

Register your webhook with Kubernetes.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: validation-webhook
webhooks:
- name: validate.pods.example.com
  clientConfig:
    service:
      name: validation-webhook
      namespace: webhook-system
      path: /validate
    caBundle: LS0tLS1CRUdJTi... # base64 encoded CA cert
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 10
  failurePolicy: Fail
  namespaceSelector:
    matchLabels:
      admission-webhook: enabled

- name: validate.deployments.example.com
  clientConfig:
    service:
      name: validation-webhook
      namespace: webhook-system
      path: /validate
    caBundle: LS0tLS1CRUdJTi...
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 10
  failurePolicy: Fail
```

## Testing the Webhook

Try creating a pod without resource limits.

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
EOF
```

You should see an error: "container nginx must have CPU limit set".

Try with proper limits.

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: docker.io/library/nginx:latest
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
EOF
```

This should succeed.

## Conclusion

Validating admission webhooks enforce policies that schema validation cannot express. They run before resources reach etcd, catching violations immediately.

Implement webhooks for business rules like approved registries, required labels, resource limits, and namespace restrictions. Keep validation logic fast to avoid slowing down cluster operations. Use proper error messages to help users understand why their requests were denied.

Deploy webhooks with high availability and configure appropriate timeouts and failure policies. Monitor webhook performance and error rates to ensure they don't become bottlenecks in your cluster.
