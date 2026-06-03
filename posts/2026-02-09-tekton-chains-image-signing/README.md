# How to Configure Tekton Chains for Automated Image Signing and Attestation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, Security, CI/CD, Supply Chain Security

Description: Learn how to configure Tekton Chains to automatically sign container images and generate attestations for supply chain security in Kubernetes CI/CD pipelines.

---

Supply chain security has become critical in modern software development. Tekton Chains provides automated signing and attestation for artifacts produced by Tekton Pipelines, creating a verifiable chain of custody from build to deployment. This guide shows you how to configure Tekton Chains for comprehensive image signing and attestation.

## Understanding Tekton Chains

Tekton Chains observes completed TaskRuns and PipelineRuns, automatically signing artifacts and generating attestations without requiring pipeline modifications. It supports signing with x509, KMS, cosign-generated key pairs, and keyless Fulcio certificates, and can store signatures in OCI registries or upload entries to transparency logs like Rekor.

## Installing Tekton Chains

First, ensure you have Tekton Pipelines installed, then deploy Tekton Chains:

```bash
# Install Tekton Pipelines (if not already installed)

kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Chains
kubectl apply -f https://infra.tekton.dev/tekton-releases/chains/latest/release.yaml

# Verify installation
kubectl get pods -n tekton-chains
```

Tekton Chains runs as a controller that watches for completed TaskRuns and PipelineRuns.

## Generating Signing Keys

Tekton Chains supports multiple key types. For a cosign-generated key pair, generate the key in the `signing-secrets` Secret:

```bash
# Generate Cosign key pair
cosign generate-key-pair k8s://tekton-chains/signing-secrets

# This creates a Kubernetes secret with the private key and password
# The public key is written to cosign.pub for verification purposes
```

Alternatively, use keyless signing with OIDC:

```bash
# Configure Chains for keyless signing
kubectl patch configmap chains-config -n tekton-chains \
  --type merge \
  -p '{"data":{"signers.x509.fulcio.enabled":"true"}}'
```

## Configuring Chains for Image Signing

Configure the Chains controller through its ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  # Enable artifact signing
  artifacts.taskrun.format: "in-toto"
  artifacts.taskrun.storage: "oci"
  artifacts.taskrun.signer: "x509"

  # Configure OCI storage for signatures
  artifacts.oci.storage: "oci"
  artifacts.oci.format: "simplesigning"
  artifacts.oci.signer: "x509"

  # Enable transparency log
  transparency.enabled: "true"
  transparency.url: "https://rekor.sigstore.dev"

  # Use the key material in the signing-secrets Secret
  signers.x509.fulcio.enabled: "false"
```

Apply the configuration:

```bash
kubectl apply -f chains-config.yaml

# Restart Chains to pick up changes
kubectl rollout restart deployment tekton-chains-controller -n tekton-chains
```

## Creating a Signing-Enabled Pipeline

Create a pipeline that builds and pushes images. Chains will automatically sign the output:

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-and-sign
spec:
  params:
    - name: image
      type: string
      description: Reference of the image to build
  results:
    - name: IMAGE_DIGEST
      description: Digest of the built image
      value: $(tasks.build-image.results.IMAGE_DIGEST)
    - name: IMAGE_URL
      description: URL of the built image
      value: $(tasks.build-image.results.IMAGE_URL)
  workspaces:
    - name: shared-workspace

  tasks:
    - name: build-image
      taskRef:
        name: kaniko
      params:
        - name: IMAGE
          value: $(params.image)
      workspaces:
        - name: source
          workspace: shared-workspace
```

Create a Task that produces signed artifacts:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: kaniko
spec:
  params:
    - name: IMAGE
      type: string
  workspaces:
    - name: source
  results:
    - name: IMAGE_DIGEST
      type: string
      description: Digest of the built image
    - name: IMAGE_URL
      type: string
      description: URL of the built image

  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      args:
        - "--dockerfile=./Dockerfile"
        - "--context=$(workspaces.source.path)"
        - "--destination=$(params.IMAGE)"
        - "--digest-file=$(results.IMAGE_DIGEST.path)"

    - name: write-url
      image: bash:latest
      script: |
        #!/bin/bash
        echo -n "$(params.IMAGE)" > "$(results.IMAGE_URL.path)"
```

## Configuring Attestation Format

Tekton Chains supports multiple attestation formats. Configure in-toto attestation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  # SLSA v0.2 provenance; use slsa/v2alpha3 or slsa/v2alpha4 for SLSA v1.0
  artifacts.taskrun.format: "slsa/v1"
  artifacts.pipelinerun.format: "slsa/v1"

  # Store TaskRun and PipelineRun provenance in OCI
  artifacts.taskrun.storage: "oci"
  artifacts.pipelinerun.storage: "oci"

  # Inspect child TaskRuns when generating PipelineRun provenance
  artifacts.pipelinerun.enable-deep-inspection: "true"
```

## Verifying Signatures and Attestations

After a pipeline run completes, verify the signature:

```bash
# Get the image digest from the pipeline run
IMAGE_DIGEST=$(kubectl get pipelinerun build-run \
  -o jsonpath='{.status.pipelineResults[?(@.name=="IMAGE_DIGEST")].value}')

IMAGE_URL=$(kubectl get pipelinerun build-run \
  -o jsonpath='{.status.pipelineResults[?(@.name=="IMAGE_URL")].value}')

# Verify the signature using Cosign
cosign verify \
  --key k8s://tekton-chains/signing-secrets \
  ${IMAGE_URL}@${IMAGE_DIGEST}

# Download and inspect the attestation
cosign download attestation \
  ${IMAGE_URL}@${IMAGE_DIGEST} | jq .
```

## Storing Signatures in OCI Registry

Configure Chains to store signatures alongside images:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  artifacts.oci.storage: "oci"
  storage.oci.repository: "registry.example.com/signatures"

  # Use secure TLS verification when connecting to the repository
  storage.oci.repository.insecure: "false"
```

Signatures are stored as OCI artifacts with a reference to the signed image.

## Integrating with Rekor Transparency Log

Enable Rekor integration for public transparency:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  transparency.enabled: "true"
  transparency.url: "https://rekor.sigstore.dev"
```

Query Rekor for signature entries:

```bash
# Search Rekor for image signatures
rekor-cli search \
  --sha ${IMAGE_DIGEST#sha256:}

# Get entry details
rekor-cli get --uuid <uuid-from-search>
```

## Monitoring Chains Operations

Check Chains controller logs for signing operations:

```bash
# View Chains logs
kubectl logs -n tekton-chains \
  -l app.kubernetes.io/name=tekton-chains-controller \
  --tail=100 -f

# Check for signing errors
kubectl logs -n tekton-chains \
  -l app.kubernetes.io/name=tekton-chains-controller \
  | grep -i error
```

Add annotations to track signing status:

```bash
# Check if a TaskRun was signed
kubectl get taskrun <taskrun-name> \
  -o jsonpath='{.metadata.annotations.chains\.tekton\.dev/signed}'

# View signature annotations when using the tekton storage backend
kubectl get taskrun <taskrun-name> \
  -o jsonpath='{.metadata.annotations}' | jq .
```

## Configuring Multiple Storage Backends

Store signed artifacts in multiple backends simultaneously:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  # Attestation format
  artifacts.taskrun.format: "in-toto"
  artifacts.taskrun.storage: "oci,tekton"

  # Multiple storage backends
  artifacts.oci.storage: "oci"
```

This stores the same attestation in multiple backends for different verification workflows.

## Troubleshooting Common Issues

If signatures are not being created:

```bash
# Check Chains has permissions to read signing keys and update TaskRuns
kubectl auth can-i get secret/signing-secrets \
  --as=system:serviceaccount:tekton-chains:tekton-chains-controller \
  -n tekton-chains

kubectl auth can-i patch taskruns.tekton.dev \
  --as=system:serviceaccount:tekton-chains:tekton-chains-controller \
  --all-namespaces

# Verify signing key exists
kubectl get secret signing-secrets -n tekton-chains

# Check TaskRun completed successfully
kubectl get taskrun <taskrun-name> -o jsonpath='{.status.conditions[0]}'
```

## Conclusion

Tekton Chains provides automated, transparent signing and attestation for CI/CD artifacts. By configuring Chains properly, you establish a verifiable supply chain that proves artifact provenance and integrity. This automated approach removes the burden of manual signing while maintaining strong security guarantees. Combined with admission controllers that verify signatures, Chains creates a complete supply chain security solution for Kubernetes deployments.
