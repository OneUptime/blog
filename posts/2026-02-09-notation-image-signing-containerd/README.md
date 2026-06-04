# How to Use Container Image Signing with Notation and containerd in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Security, Image Signing

Description: Learn how to implement container image signing using Notation and containerd in Kubernetes for enhanced supply chain security and verified deployments.

---

Container image signing has become a critical security requirement for modern Kubernetes deployments. As supply chain attacks increase, organizations need mechanisms to verify that container images are authentic and haven't been tampered with. Notation, part of the Notary Project, provides a standard way to sign and verify container images using the OCI specification.

In this guide, we'll implement container image signing with Notation and configure containerd to enforce signature verification in a Kubernetes cluster.

## Understanding Notation and the Notary Project

Notation is a command-line tool that implements the Notary Project specifications for signing and verifying OCI artifacts. It supports multiple signature formats and integrates with various key management systems. Unlike the legacy Docker Content Trust, Notation follows the OCI distribution specification and stores signatures alongside images in registries.

The verification process happens at the container runtime level. When containerd receives a request to pull an image, it can verify signatures before allowing the image to run. This prevents unsigned or tampered images from executing in your cluster.

## Installing Notation CLI

Start by installing the Notation CLI on your system. Download the latest release for your platform.

```bash
# Download Notation for Linux

export NOTATION_VERSION=1.3.2
curl -LO https://github.com/notaryproject/notation/releases/download/v${NOTATION_VERSION}/notation_${NOTATION_VERSION}_linux_amd64.tar.gz
curl -LO https://github.com/notaryproject/notation/releases/download/v${NOTATION_VERSION}/notation_${NOTATION_VERSION}_checksums.txt
grep "notation_${NOTATION_VERSION}_linux_amd64.tar.gz" notation_${NOTATION_VERSION}_checksums.txt | shasum --check -

# Extract and install
tar xvzf notation_${NOTATION_VERSION}_linux_amd64.tar.gz
sudo mv notation /usr/local/bin/

# Verify installation
notation version
```

For macOS or Windows, download the appropriate binary from the releases page. The tool requires no additional dependencies.

## Generating Signing Keys

Before signing images, you need cryptographic keys. For testing, generate a self-signed certificate. In production environments, use keys from your certificate authority or a key management service.

```bash
# Generate a self-signed certificate for testing
notation cert generate-test --default "example.io"

# List certificates to verify
notation cert ls

# The output shows your certificate details
# STORE TYPE   STORE NAME   CERTIFICATE
# ca           example.io   example.io.crt
```

For production, integrate with external key providers like Azure Key Vault, AWS KMS, or HashiCorp Vault. Notation supports plugins for various key management systems.

```bash
# Example with Azure Key Vault (after installing the plugin)
notation key add azure-key \
  --default \
  --plugin azure-kv \
  --id https://myvault.vault.azure.net/keys/signing-key

notation cert add --type ca --store example.io azure-cert.pem
```

## Signing Container Images

With your signing key configured, sign container images before pushing them to your registry. The signature is stored as a separate artifact in the registry.

```bash
# Build and push your image
docker build -t myregistry.io/app:v1.0 .
docker push myregistry.io/app:v1.0

# Sign the image with Notation
notation sign myregistry.io/app:v1.0

# Create and import a trust policy for verification
cat <<EOF > ./trustpolicy.json
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name": "production-images",
      "registryScopes": [
        "myregistry.io/app"
      ],
      "signatureVerification": {
        "level": "strict"
      },
      "trustStores": [
        "ca:example.io"
      ],
      "trustedIdentities": [
        "*"
      ]
    }
  ]
}
EOF

notation policy import ./trustpolicy.json

# Verify the signature
notation verify myregistry.io/app:v1.0

# View signature details
notation list myregistry.io/app:v1.0
```

The signature includes metadata about who signed the image, when it was signed, and what signing key was used. This creates an audit trail for your container images.

## Configuring containerd for Signature Verification

To enforce signature verification in Kubernetes, configure containerd to verify images before pulling them. This requires containerd 2.1 or later so CRI pulls use the transfer service, which supports image verifier binaries.

First, create a containerd image verifier binary that runs Notation.

```bash
# Create the verifier directory
sudo mkdir -p /opt/containerd/image-verifier/bin

# Install a verifier script
sudo tee /opt/containerd/image-verifier/bin/notation-verify >/dev/null <<'EOF'
#!/bin/sh
set -eu

NAME=""
DIGEST=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    -name)
      NAME="$2"
      shift 2
      ;;
    -digest)
      DIGEST="$2"
      shift 2
      ;;
    -stdin-media-type)
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

case "$NAME" in
  *@sha256:*)
    REF="$NAME"
    ;;
  *)
    REF="${NAME}@${DIGEST}"
    ;;
esac

NOTATION_CONFIG=/etc/containerd/notation notation verify "$REF"
EOF

sudo chmod +x /opt/containerd/image-verifier/bin/notation-verify
```

Create a trust policy that defines which images must be signed and which keys are trusted. Save this as `/tmp/containerd-trustpolicy.json`.

```json
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name": "production-images",
      "registryScopes": [
        "myregistry.io/app"
      ],
      "signatureVerification": {
        "level": "strict"
      },
      "trustStores": [
        "ca:example.io"
      ],
      "trustedIdentities": [
        "*"
      ]
    }
  ]
}
```

Update your containerd configuration at `/etc/containerd/config.toml` to enable the verifier plugin.

```toml
version = 3

[plugins]
  [plugins."io.containerd.image-verifier.v1.bindir"]
    bin_dir = "/opt/containerd/image-verifier/bin"
    max_verifiers = 10
    per_verifier_timeout = "30s"
```

Import your trusted certificates and trust policy into the Notation configuration directory that the verifier script uses.

```bash
# Create notation configuration directory
sudo mkdir -p /etc/containerd/notation

# Add your CA certificate and import the trust policy
sudo env NOTATION_CONFIG=/etc/containerd/notation \
  notation cert add --type ca --store example.io example.io.crt

sudo env NOTATION_CONFIG=/etc/containerd/notation \
  notation policy import /tmp/containerd-trustpolicy.json

# Restart containerd to apply changes
sudo systemctl restart containerd
```

## Testing Signature Verification

Deploy a test pod to verify that signature checking works. Create a deployment with your signed image.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: verified-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: verified-app
  template:
    metadata:
      labels:
        app: verified-app
    spec:
      containers:
      - name: app
        image: myregistry.io/app:v1.0
        ports:
        - containerPort: 8080
```

Apply the deployment and check the pod status.

```bash
kubectl apply -f deployment.yaml

# Pod should start successfully with signed image
kubectl get pods

# Try deploying an unsigned image
kubectl run test --image=myregistry.io/unsigned:latest

# This should fail with verification error
kubectl describe pod test
# Events will show: Failed to pull image: signature verification failed
```

## Implementing Admission Webhooks for Additional Validation

For defense in depth, implement an admission webhook that validates image signatures before Kubernetes schedules pods. This provides an additional layer of protection beyond runtime verification.

Create a ValidatingWebhookConfiguration that checks image signatures.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-signature-validator
webhooks:
- name: validate.images.security.io
  clientConfig:
    service:
      name: image-validator
      namespace: security-system
      path: /validate
    caBundle: LS0tLS1CRUdJTi... # Your CA bundle
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments", "replicasets", "daemonsets", "statefulsets"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

The webhook service validates that all images are signed before allowing pod creation. This prevents unsigned images from even reaching the scheduler.

## Automating Signature Verification in CI/CD

Integrate signature verification into your continuous integration pipeline. Sign images as part of your build process and verify signatures during deployment.

```bash
#!/bin/bash
# ci-sign-image.sh

IMAGE=$1
TAG=$2
FULL_IMAGE="${IMAGE}:${TAG}"

# Build image
docker build -t ${FULL_IMAGE} .

# Push to registry
docker push ${FULL_IMAGE}

# Sign with Notation
notation sign ${FULL_IMAGE} --key example.io

# Verify signature
notation verify ${FULL_IMAGE}

if [ $? -eq 0 ]; then
  echo "Image signed and verified successfully"
  exit 0
else
  echo "Signature verification failed"
  exit 1
fi
```

Add this to your GitHub Actions or GitLab CI pipeline to ensure all images are signed before deployment.

## Monitoring and Auditing Signature Verification

Track signature verification events to detect potential security issues. Configure containerd to log verification attempts and integrate with your monitoring system.

```bash
# Enable debug logging in containerd
sudo sed -i 's/level = "info"/level = "debug"/' /etc/containerd/config.toml
sudo systemctl restart containerd

# Watch for verification events
sudo journalctl -u containerd -f | grep -i "notation\|signature\|verify"
```

Export these logs to your centralized logging system for security auditing. Set up alerts for failed verification attempts, which could indicate compromise attempts.

Container image signing with Notation and containerd provides strong supply chain security for Kubernetes clusters. By verifying signatures at the runtime level, you ensure that only trusted, authentic images execute in your environment. Combined with admission webhooks and CI/CD automation, this creates a comprehensive defense against image tampering and supply chain attacks.
