# How to Test Kubernetes Webhooks Locally with kind and Port Forwarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, kind, Testing

Description: Learn how to test admission webhooks locally using kind clusters and port forwarding, enabling rapid development iteration without deploying to remote clusters.

---

Testing Kubernetes webhooks typically requires deploying them to a cluster with proper TLS certificates, which slows down development. Using kind (Kubernetes in Docker) with port forwarding, you can run your webhook server locally on your development machine while the kind cluster calls it, dramatically speeding up the development cycle.

This approach lets you use debuggers, hot reload code changes, and see logs directly in your terminal, making webhook development much more productive.

## Setting Up kind

Install kind and create a cluster:

```bash
# Install kind
brew install kind  # macOS
# or
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Create a kind cluster
kind create cluster --name webhook-dev

# Verify
kubectl cluster-info --context kind-webhook-dev
```

## Running Webhook Server Locally

Create a simple webhook server that runs on localhost:

```go
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
    corev1.AddToScheme(scheme)
}

func handleValidate(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "failed to read request", http.StatusBadRequest)
        return
    }

    review := &admissionv1.AdmissionReview{}
    if _, _, err := codecs.UniversalDeserializer().Decode(body, nil, review); err != nil {
        http.Error(w, "failed to decode request", http.StatusBadRequest)
        return
    }

    log.Printf("Received webhook request for: %s/%s",
        review.Request.Namespace,
        review.Request.Name)

    // Validate the pod
    pod := &corev1.Pod{}
    if err := json.Unmarshal(review.Request.Object.Raw, pod); err != nil {
        http.Error(w, "failed to unmarshal pod", http.StatusBadRequest)
        return
    }

    // Simple validation: ensure pod has at least one container
    allowed := len(pod.Spec.Containers) > 0
    message := "Pod is valid"
    if !allowed {
        message = "Pod must have at least one container"
    }

    review.Response = &admissionv1.AdmissionResponse{
        UID:     review.Request.UID,
        Allowed: allowed,
        Result: &metav1.Status{
            Message: message,
        },
    }

    responseBytes, err := json.Marshal(review)
    if err != nil {
        http.Error(w, "failed to marshal response", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)

    log.Printf("Response: allowed=%v, message=%s", allowed, message)
}

func main() {
    http.HandleFunc("/validate", handleValidate)

    log.Println("Webhook server starting on :8443")
    // For local development, we'll use HTTP instead of HTTPS
    if err := http.ListenAndServe(":8443", nil); err != nil {
        log.Fatal(err)
    }
}
```

Run it locally:

```bash
go run main.go
```

## Using Host Network Access

Kind clusters need to access your host machine. Use the special DNS name `host.docker.internal` on Docker Desktop, or configure kind to allow host access:

Create a kind config that maps your local port:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 8443
    hostPort: 8443
    protocol: TCP
```

Create cluster with config:

```bash
kind create cluster --name webhook-dev --config kind-config.yaml
```

## Creating a Webhook Service Pointing to Host

Create a Service and Endpoints that point to your host machine:

```yaml
# webhook-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: webhook-service
  namespace: default
spec:
  type: ClusterIP
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: webhook-service
  namespace: default
subsets:
- addresses:
  # Use host.docker.internal for Docker Desktop
  # Or use kind cluster's gateway IP
  - ip: 172.18.0.1  # kind network gateway IP
  ports:
  - port: 8443
    protocol: TCP
```

Find the kind network gateway IP:

```bash
# Get kind network name
docker network ls | grep kind

# Inspect network to find gateway
docker network inspect kind | grep Gateway
```

Apply the service:

```bash
kubectl apply -f webhook-service.yaml
```

## Self-Signed Certificates for Testing

Generate a self-signed certificate for local testing:

```bash
#!/bin/bash

# Generate CA key and certificate
openssl req -x509 -newkey rsa:4096 -keyout ca.key -out ca.crt -days 365 -nodes \
  -subj "/CN=webhook-ca"

# Generate server key
openssl genrsa -out server.key 2048

# Generate certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/CN=webhook-service.default.svc"

# Create server certificate
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365

# Get base64 encoded CA for webhook config
cat ca.crt | base64 | tr -d '\n'
```

Update your webhook server to use TLS:

```go
func main() {
    http.HandleFunc("/validate", handleValidate)

    log.Println("Webhook server starting on :8443")

    // Use the generated certificates
    if err := http.ListenAndServeTLS(":8443", "server.crt", "server.key", nil); err != nil {
        log.Fatal(err)
    }
}
```

## Creating Webhook Configuration

Create the ValidatingWebhookConfiguration:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validator
webhooks:
- name: validate.pod.example.com
  clientConfig:
    # Point to the service we created
    service:
      name: webhook-service
      namespace: default
      path: /validate
    # Use the base64 CA from certificate generation
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  # Important: Use Ignore during development
  failurePolicy: Ignore
```

Apply the configuration:

```bash
kubectl apply -f webhook-config.yaml
```

## Testing the Webhook

Create a test pod:

```bash
# Valid pod - should succeed
kubectl run test-pod --image=nginx

# Check webhook server logs
# You should see the validation request

# Delete the pod
kubectl delete pod test-pod
```

## Using Webhook Certificates from cert-manager

For easier certificate management, use cert-manager:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=300s
```

Create a self-signed issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned-issuer
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
  secretName: webhook-tls
  dnsNames:
  - webhook-service.default.svc
  - webhook-service.default.svc.cluster.local
  issuerRef:
    name: selfsigned-issuer
```

Use the certificate in your local server:

```bash
# Extract cert from secret
kubectl get secret webhook-tls -o jsonpath='{.data.tls\.crt}' | base64 -d > server.crt
kubectl get secret webhook-tls -o jsonpath='{.data.tls\.key}' | base64 -d > server.key
kubectl get secret webhook-tls -o jsonpath='{.data.ca\.crt}' | base64 -d > ca.crt
```

## Hot Reloading During Development

Use a tool like `air` for hot reloading:

```bash
# Install air
go install github.com/cosmtrek/air@latest

# Create .air.toml config
cat > .air.toml <<EOF
root = "."
tmp_dir = "tmp"

[build]
  cmd = "go build -o ./tmp/webhook ."
  bin = "./tmp/webhook"
  include_ext = ["go"]
  exclude_dir = ["tmp", "vendor"]

[log]
  time = true
EOF

# Run with hot reload
air
```

Now changes to your code automatically restart the webhook server.

## Debugging with Delve

Attach a debugger to your webhook:

```bash
# Install delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Run webhook with debugger
dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient
```

Connect your IDE to the debugger at `localhost:2345`.

## Testing Different Scenarios

Create test cases:

```bash
# Test 1: Valid pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: valid-pod
spec:
  containers:
  - name: nginx
    image: nginx
EOF

# Test 2: Pod without containers (should be denied if your webhook validates this)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: invalid-pod
spec:
  containers: []
EOF

# Test 3: Update operation
kubectl patch pod valid-pod -p '{"metadata":{"labels":{"test":"updated"}}}'
```

## Viewing Webhook Logs

Check your webhook server output:

```bash
# In your terminal running the webhook
# You'll see:
# Received webhook request for: default/valid-pod
# Response: allowed=true, message=Pod is valid
```

Check kind cluster logs if webhook isn't being called:

```bash
# API server logs
docker exec webhook-dev-control-plane cat /var/log/kubernetes/kube-apiserver.log | grep webhook

# Look for webhook call errors
kubectl get events --all-namespaces | grep webhook
```

## Cleanup

When done testing:

```bash
# Delete webhook configuration
kubectl delete validatingwebhookconfiguration pod-validator

# Delete kind cluster
kind delete cluster --name webhook-dev
```

## Using ngrok for Remote Testing

If you need to test from a remote cluster, use ngrok:

```bash
# Start ngrok
ngrok http 8443

# Update webhook configuration with ngrok URL
# clientConfig:
#   url: https://abc123.ngrok.io/validate
```

Local webhook testing with kind dramatically accelerates development by providing immediate feedback, easy debugging, and rapid iteration without the overhead of building images and deploying to clusters.
