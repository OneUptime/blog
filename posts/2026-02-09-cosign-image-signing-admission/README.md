# How to Set Up Cosign Image Signing and Verification in Kubernetes Admission Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Cosign, Admission Controllers, Image Signing

Description: Implement Cosign image signing verification in Kubernetes admission controllers to ensure only cryptographically signed and verified container images can run in your clusters with automated policy enforcement.

---

Container image signing provides cryptographic proof of image authenticity and integrity. Cosign simplifies this process with keyless signing via OIDC or traditional key-based signing. By integrating Cosign verification into Kubernetes admission controllers, you create an enforcement layer that blocks unsigned or tampered images automatically. This guide shows you how to implement comprehensive image signing verification.

## Understanding Cosign and Admission Control

Cosign signs container images and stores signatures in OCI registries alongside the images. Admission controllers intercept deployment requests and verify signatures before allowing pods to start. This combination creates an automated security gate that cannot be bypassed, ensuring only approved images run in your cluster.

## Installing Cosign

Install Cosign locally and in CI/CD:

```bash
# Install Cosign
curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64"
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
sudo chmod +x /usr/local/bin/cosign

# Verify installation
cosign version
```

Generate signing keys:

```bash
# Generate key pair
cosign generate-key-pair

# This creates:
# - cosign.key (private key)
# - cosign.pub (public key)

# Store private key securely
kubectl create secret generic cosign-keys \
  --from-file=cosign.key=cosign.key \
  --from-file=cosign.pub=cosign.pub \
  -n kube-system
```

## Signing Images with Cosign

Sign images in your CI pipeline:

```bash
# Build image
docker build -t registry.example.com/myapp:v1.0.0 .
docker push registry.example.com/myapp:v1.0.0

# Sign the image
export COSIGN_PASSWORD=your-password
cosign sign --key cosign.key registry.example.com/myapp:v1.0.0

# Verify signature
cosign verify --key cosign.pub registry.example.com/myapp:v1.0.0
```

Use keyless signing with OIDC:

```bash
# Sign without keys (uses OIDC identity)
cosign sign registry.example.com/myapp:v1.0.0

# This opens browser for authentication
# Signature is stored with your identity

# Verify keyless signature
cosign verify \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://accounts.google.com \
  registry.example.com/myapp:v1.0.0
```

## Setting Up Kyverno for Verification

Install Kyverno admission controller:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update

kubectl create namespace kyverno
helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --set replicaCount=3
```

Create a policy to verify Cosign signatures:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8Z9...
                      -----END PUBLIC KEY-----
```

Load public key from secret:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: cosign-keys
                      namespace: kube-system
```

## Verifying Keyless Signatures

Configure Kyverno for keyless verification:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-keyless-signatures
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-keyless
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keyless:
                    subject: "https://github.com/myorg/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

## Creating a Custom Admission Webhook

Build a webhook for advanced verification:

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/google/go-containerregistry/pkg/name"
    "github.com/sigstore/cosign/v2/pkg/cosign"
    "github.com/sigstore/cosign/v2/pkg/oci/remote"
    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type AdmissionHandler struct {
    publicKey []byte
}

func (h *AdmissionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    var admissionReview admissionv1.AdmissionReview

    if err := json.NewDecoder(r.Body).Decode(&admissionReview); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    pod := &corev1.Pod{}
    if err := json.Unmarshal(admissionReview.Request.Object.Raw, pod); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    allowed := true
    var message string

    for _, container := range pod.Spec.Containers {
        if !h.verifyImage(container.Image) {
            allowed = false
            message = fmt.Sprintf("Image %s is not signed or verification failed", container.Image)
            break
        }
    }

    response := &admissionv1.AdmissionResponse{
        UID:     admissionReview.Request.UID,
        Allowed: allowed,
        Result: &metav1.Status{
            Message: message,
        },
    }

    admissionReview.Response = response
    json.NewEncoder(w).Encode(admissionReview)
}

func (h *AdmissionHandler) verifyImage(imageRef string) bool {
    ref, err := name.ParseReference(imageRef)
    if err != nil {
        return false
    }

    // Verify signature
    verifier, err := cosign.LoadPublicKey(context.Background(), h.publicKey)
    if err != nil {
        return false
    }

    sigs, _, err := remote.VerifyImageSignatures(context.Background(), ref, &cosign.CheckOpts{
        SigVerifier: verifier,
    })

    return err == nil && len(sigs) > 0
}

func main() {
    // Load public key
    publicKey := []byte(`-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8Z9...
-----END PUBLIC KEY-----`)

    handler := &AdmissionHandler{publicKey: publicKey}

    http.HandleFunc("/verify", handler.ServeHTTP)
    http.ListenAndServeTLS(":8443", "/etc/webhook/certs/tls.crt", "/etc/webhook/certs/tls.key", nil)
}
```

Deploy the webhook:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-verifier
  namespace: image-verification
spec:
  replicas: 2
  selector:
    matchLabels:
      app: image-verifier
  template:
    metadata:
      labels:
        app: image-verifier
    spec:
      containers:
        - name: webhook
          image: myregistry/image-verifier:latest
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: certs
              mountPath: /etc/webhook/certs
              readOnly: true
      volumes:
        - name: certs
          secret:
            secretName: image-verifier-certs

---
apiVersion: v1
kind: Service
metadata:
  name: image-verifier
  namespace: image-verification
spec:
  selector:
    app: image-verifier
  ports:
    - port: 443
      targetPort: 8443

---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-verifier
webhooks:
  - name: verify.images.example.com
    clientConfig:
      service:
        name: image-verifier
        namespace: image-verification
        path: "/verify"
      caBundle: <base64-encoded-ca-cert>
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    timeoutSeconds: 10
```

## Integrating with GitHub Actions

Automate signing in CI:

```yaml
name: Build and Sign
on: [push]

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Login to registry
        uses: docker/login-action@v2
        with:
          registry: registry.example.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build image
        run: |
          docker build -t registry.example.com/myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image
        env:
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          echo "${{ secrets.COSIGN_KEY }}" > cosign.key
          cosign sign --key cosign.key \
            registry.example.com/myapp:${{ github.sha }}

      - name: Verify signature
        run: |
          echo "${{ secrets.COSIGN_PUBLIC_KEY }}" > cosign.pub
          cosign verify --key cosign.pub \
            registry.example.com/myapp:${{ github.sha }}
```

## Creating Namespace-Specific Policies

Apply different policies per namespace:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: namespace-specific-verification
spec:
  validationFailureAction: Enforce
  rules:
    - name: production-strict
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "*"
          attestors:
            - count: 2
              entries:
                - keys:
                    secret:
                      name: prod-key-1
                      namespace: kube-system
                - keys:
                    secret:
                      name: prod-key-2
                      namespace: kube-system

    - name: staging-relaxed
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - staging
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: staging-key
                      namespace: kube-system
```

## Monitoring Verification Events

Track policy violations:

```bash
# View policy reports
kubectl get policyreport -A

# Check specific failures
kubectl describe policyreport -n production

# View admission controller logs
kubectl logs -n kyverno -l app.kubernetes.io/name=kyverno | grep verify
```

Create alerts for unsigned images:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
data:
  alerts.yaml: |
    groups:
      - name: image-verification
        rules:
          - alert: UnsignedImageAttempt
            expr: |
              increase(kyverno_policy_results_total{
                policy_name="verify-image-signatures",
                policy_result="fail"
              }[5m]) > 0
            annotations:
              summary: "Attempt to deploy unsigned image"
              description: "Pod deployment rejected due to missing signature"
```

## Handling Exceptions

Create allowlist for specific images:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-with-exceptions
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kube-public
          - resources:
              selector:
                matchLabels:
                  skip-verification: "true"
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: cosign-keys
                      namespace: kube-system
```

## Conclusion

Integrating Cosign image signing verification into Kubernetes admission controllers creates a robust defense against unauthorized or tampered images. By automatically verifying cryptographic signatures before allowing deployments, you ensure that only approved, authentic images run in your clusters. This approach works seamlessly with CI/CD pipelines, supports both key-based and keyless signing, and provides audit trails for compliance. Combined with proper key management and policy enforcement, Cosign verification becomes an essential component of Kubernetes security.
