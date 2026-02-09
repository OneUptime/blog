# How to Test Kubernetes Admission Webhooks Locally Before Deploying to Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Admission Webhooks, Testing, Webhook Development, Local Development

Description: Learn how to test Kubernetes admission webhooks locally using tools like webhook-tester and kind clusters, enabling rapid development without deploying to production clusters.

---

Admission webhooks extend Kubernetes API functionality by intercepting resource creation and modification requests. Testing webhooks in live clusters is slow and risky, making local testing essential for rapid development. This guide shows how to test admission webhooks locally before cluster deployment.

We'll set up local testing environments using kind (Kubernetes in Docker), create test fixtures that simulate admission requests, and validate webhook behavior without affecting production systems.

## Understanding Admission Webhook Testing

Admission webhooks receive AdmissionReview requests from the API server containing the resource being created or modified. The webhook responds with an AdmissionResponse indicating whether to allow the request, potentially modifying the resource or providing rejection messages.

Local testing involves simulating these admission requests without a full Kubernetes cluster or using lightweight local clusters like kind. This approach provides fast feedback during development and prevents webhook bugs from affecting live environments.

Testing covers three aspects: validating webhook logic with sample admission requests, ensuring proper TLS certificate handling, and verifying integration with the Kubernetes API server in a controlled environment.

## Setting Up a Local Testing Environment

Install required tools:

```bash
# Install kind for local Kubernetes
brew install kind  # macOS
# OR
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install kubectl
brew install kubectl  # macOS

# Verify installations
kind version
kubectl version --client
```

Create a kind cluster:

```bash
# Create cluster with specific config
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30000
    hostPort: 30000
    protocol: TCP
EOF

# Verify cluster
kubectl cluster-info --context kind-kind
```

## Creating a Sample Admission Webhook

Build a simple validating webhook in Go:

```go
// webhook.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type WebhookServer struct{}

func (ws *WebhookServer) validate(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read request body", http.StatusBadRequest)
        return
    }

    var admissionReview admissionv1.AdmissionReview
    if err := json.Unmarshal(body, &admissionReview); err != nil {
        http.Error(w, "Failed to parse admission review", http.StatusBadRequest)
        return
    }

    // Extract pod from request
    var pod corev1.Pod
    if err := json.Unmarshal(admissionReview.Request.Object.Raw, &pod); err != nil {
        http.Error(w, "Failed to parse pod", http.StatusBadRequest)
        return
    }

    // Validation logic: require app label
    allowed := true
    message := ""

    if pod.Labels == nil || pod.Labels["app"] == "" {
        allowed = false
        message = "Pod must have 'app' label"
    }

    // Create response
    response := admissionv1.AdmissionResponse{
        UID:     admissionReview.Request.UID,
        Allowed: allowed,
        Result: &metav1.Status{
            Message: message,
        },
    }

    admissionReview.Response = &response

    responseBytes, err := json.Marshal(admissionReview)
    if err != nil {
        http.Error(w, "Failed to marshal response", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)
}

func main() {
    server := &WebhookServer{}
    http.HandleFunc("/validate", server.validate)

    fmt.Println("Webhook server listening on :8443")
    http.ListenAndServeTLS(":8443", "tls.crt", "tls.key", nil)
}
```

## Testing Webhooks with Sample Requests

Create test admission request JSON:

```json
// test-request.json
{
  "apiVersion": "admission.k8s.io/v1",
  "kind": "AdmissionReview",
  "request": {
    "uid": "test-uid-12345",
    "kind": {
      "group": "",
      "version": "v1",
      "kind": "Pod"
    },
    "resource": {
      "group": "",
      "version": "v1",
      "resource": "pods"
    },
    "operation": "CREATE",
    "object": {
      "apiVersion": "v1",
      "kind": "Pod",
      "metadata": {
        "name": "test-pod",
        "namespace": "default"
      },
      "spec": {
        "containers": [
          {
            "name": "nginx",
            "image": "nginx:latest"
          }
        ]
      }
    }
  }
}
```

Test webhook locally with curl:

```bash
# Generate self-signed certificates for testing
openssl req -x509 -newkey rsa:4096 -keyout tls.key -out tls.crt \
  -days 365 -nodes -subj "/CN=localhost"

# Run webhook server
go run webhook.go &

# Test with sample request
curl -k -X POST https://localhost:8443/validate \
  -H "Content-Type: application/json" \
  -d @test-request.json

# Expected response shows validation failure (missing app label)
```

## Building a Webhook Test Framework

Create a test harness for webhook logic:

```go
// webhook_test.go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
)

func TestValidateWebhook(t *testing.T) {
    tests := []struct {
        name          string
        pod           *corev1.Pod
        expectAllowed bool
        expectMessage string
    }{
        {
            name: "Pod with app label should be allowed",
            pod: &corev1.Pod{
                ObjectMeta: metav1.ObjectMeta{
                    Name: "test-pod",
                    Labels: map[string]string{
                        "app": "myapp",
                    },
                },
            },
            expectAllowed: true,
        },
        {
            name: "Pod without app label should be rejected",
            pod: &corev1.Pod{
                ObjectMeta: metav1.ObjectMeta{
                    Name: "test-pod",
                },
            },
            expectAllowed: false,
            expectMessage: "Pod must have 'app' label",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create admission request
            podBytes, _ := json.Marshal(tt.pod)
            admissionReview := admissionv1.AdmissionReview{
                TypeMeta: metav1.TypeMeta{
                    APIVersion: "admission.k8s.io/v1",
                    Kind:       "AdmissionReview",
                },
                Request: &admissionv1.AdmissionRequest{
                    UID: "test-uid",
                    Kind: metav1.GroupVersionKind{
                        Version: "v1",
                        Kind:    "Pod",
                    },
                    Object: runtime.RawExtension{
                        Raw: podBytes,
                    },
                },
            }

            body, _ := json.Marshal(admissionReview)
            req := httptest.NewRequest("POST", "/validate", bytes.NewReader(body))
            w := httptest.NewRecorder()

            // Call webhook handler
            server := &WebhookServer{}
            server.validate(w, req)

            // Parse response
            var response admissionv1.AdmissionReview
            json.NewDecoder(w.Body).Decode(&response)

            // Verify expectations
            if response.Response.Allowed != tt.expectAllowed {
                t.Errorf("Expected allowed=%v, got %v", tt.expectAllowed, response.Response.Allowed)
            }

            if tt.expectMessage != "" && response.Response.Result.Message != tt.expectMessage {
                t.Errorf("Expected message=%q, got %q", tt.expectMessage, response.Response.Result.Message)
            }
        })
    }
}
```

Run tests:

```bash
go test -v ./...
```

## Deploying Webhook to Kind Cluster

Create webhook deployment manifests:

```yaml
# webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admission-webhook
  namespace: default
spec:
  replicas: 1
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
        image: localhost/admission-webhook:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
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
```

Build and load image into kind:

```bash
# Build Docker image
docker build -t admission-webhook:latest .

# Load image into kind cluster
kind load docker-image admission-webhook:latest

# Deploy webhook
kubectl apply -f webhook-deployment.yaml
```

## Configuring Webhook Registration

Generate certificates and create ValidatingWebhookConfiguration:

```bash
# Generate CA and webhook certificates
./generate-certs.sh

# Create webhook configuration
cat <<EOF | kubectl apply -f -
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validator
webhooks:
- name: pod-validator.default.svc
  clientConfig:
    service:
      name: admission-webhook
      namespace: default
      path: "/validate"
    caBundle: $(cat ca.crt | base64 | tr -d '\n')
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 5
EOF
```

## Testing End-to-End in Kind

Test webhook by creating pods:

```bash
# This should be rejected (no app label)
kubectl run test-pod --image=nginx

# This should be allowed
kubectl run test-pod --image=nginx --labels=app=test

# View webhook logs
kubectl logs deployment/admission-webhook
```

## Debugging Webhook Failures

Enable verbose logging:

```bash
# Check webhook registration
kubectl get validatingwebhookconfiguration pod-validator -o yaml

# View API server audit logs
kubectl logs -n kube-system kube-apiserver-kind-control-plane | grep admission

# Test webhook connectivity
kubectl run debug --image=curlimages/curl -it --rm -- \
  curl -k https://admission-webhook.default.svc.cluster.local/validate
```

## Creating Automated Integration Tests

Build integration test script:

```bash
#!/bin/bash
# test-webhook-integration.sh

set -e

echo "Creating kind cluster..."
kind create cluster --wait 5m

echo "Building and loading webhook image..."
docker build -t admission-webhook:latest .
kind load docker-image admission-webhook:latest

echo "Deploying webhook..."
kubectl apply -f webhook-deployment.yaml
kubectl wait --for=condition=available deployment/admission-webhook --timeout=60s

echo "Registering webhook..."
kubectl apply -f webhook-config.yaml

echo "Testing webhook..."

# Test 1: Pod without label should fail
if kubectl run test-fail --image=nginx 2>/dev/null; then
  echo "FAIL: Pod without label was allowed"
  exit 1
fi
echo "PASS: Pod without label was rejected"

# Test 2: Pod with label should succeed
if ! kubectl run test-pass --image=nginx --labels=app=test; then
  echo "FAIL: Pod with label was rejected"
  exit 1
fi
echo "PASS: Pod with label was allowed"

echo "Cleaning up..."
kind delete cluster

echo "All tests passed!"
```

## Conclusion

Local testing of admission webhooks accelerates development by providing fast feedback without affecting production clusters. Tools like kind enable full end-to-end testing while unit tests validate webhook logic independently.

This testing approach catches webhook errors early, prevents production incidents, and enables confident deployment of admission controllers that enforce security and governance policies across Kubernetes clusters.

For production webhook development, implement comprehensive unit tests that cover all validation logic, run integration tests in temporary kind clusters, and validate webhook performance under load before deploying to live environments.
