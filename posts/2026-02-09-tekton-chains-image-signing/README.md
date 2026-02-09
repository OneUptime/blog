# How to Configure Tekton Chains for Automated Image Signing and Attestation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, Security, CI/CD, Supply Chain Security

Description: Learn how to configure Tekton Chains to automatically sign container images and generate attestations for supply chain security in Kubernetes CI/CD pipelines.

---

Supply chain security has become critical in modern software development. Tekton Chains provides automated signing and attestation for artifacts produced by Tekton Pipelines, creating a verifiable chain of custody from build to deployment. This guide shows you how to configure Tekton Chains for comprehensive image signing and attestation.

## Understanding Tekton Chains

Tekton Chains observes completed TaskRuns and PipelineRuns, automatically signing artifacts and generating attestations without requiring pipeline modifications. It supports multiple signing formats including Cosign and x509, and can store signatures in OCI registries or transparency logs like Rekor.

## Installing Tekton Chains

First, ensure you have Tekton Pipelines installed, then deploy Tekton Chains:

```bash
# Install Tekton Pipelines (if not already installed)
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Chains
kubectl apply -f https://storage.googleapis.com/tekton-releases/chains/latest/release.yaml

# Verify installation
kubectl get pods -n tekton-chains
```

Tekton Chains runs as a controller that watches for completed TaskRuns and PipelineRuns.

## Generating Signing Keys

Tekton Chains supports multiple key types. For Cosign signing, generate a key pair:

```bash
# Generate Cosign key pair
cosign generate-key-pair k8s://tekton-chains/signing-secrets

# This creates a Kubernetes secret with the private key
# The public key is displayed for verification purposes
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
  artifacts.oci.signer: "cosign"

  # Enable transparency log
  transparency.enabled: "true"
  transparency.url: "https://rekor.sigstore.dev"

  # Configure signers
  signers.x509.fulcio.enabled: "true"
  signers.x509.fulcio.address: "https://fulcio.sigstore.dev"
  signers.x509.fulcio.issuer: "https://oauth2.sigstore.dev/auth"

  # Cosign configuration
  signers.cosign.key: "k8s://tekton-chains/signing-secrets"
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
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-and-sign
spec:
  params:
    - name: image
      description: Reference of the image to build
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

    - name: push-image
      runAfter: [build-image]
      taskRef:
        name: push-oci
      params:
        - name: IMAGE
          value: $(params.image)
```

Create a Task that produces signed artifacts:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: kaniko
spec:
  params:
    - name: IMAGE
  workspaces:
    - name: source
  results:
    - name: IMAGE_DIGEST
      description: Digest of the built image
    - name: IMAGE_URL
      description: URL of the built image

  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      args:
        - "--dockerfile=./Dockerfile"
        - "--context=./$(workspaces.source.path)"
        - "--destination=$(params.IMAGE)"
        - "--digest-file=/tekton/results/IMAGE_DIGEST"

    - name: write-url
      image: bash:latest
      script: |
        #!/bin/bash
        echo -n "$(params.IMAGE)" > /tekton/results/IMAGE_URL
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
  artifacts.taskrun.format: "in-toto"
  artifacts.pipelinerun.format: "in-toto"

  # SLSA provenance level
  artifacts.pipelinerun.slsa.level: "2"

  # Include pipeline definition in attestation
  artifacts.pipelinerun.include.pipeline: "true"

  # Include task results in attestation
  artifacts.taskrun.include.results: "true"
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
  artifacts.oci.repository: "registry.example.com/signatures"

  # Use the same repository as the image
  artifacts.oci.repository.insecure: "false"
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

  # Verify Rekor entry
  transparency.verify: "true"
```

Query Rekor for signature entries:

```bash
# Search Rekor for image signatures
rekor-cli search \
  --artifact ${IMAGE_URL}@${IMAGE_DIGEST}

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

# View signature reference
kubectl get taskrun <taskrun-name> \
  -o jsonpath='{.metadata.annotations.chains\.tekton\.dev/signature}'
```

## Configuring Multi-Format Signing

Sign artifacts in multiple formats simultaneously:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  # Primary format
  artifacts.taskrun.format: "in-toto"
  artifacts.taskrun.storage: "oci,tekton"

  # Additional formats
  artifacts.taskrun.format.additional: "slsa/v1"

  # Multiple storage backends
  artifacts.oci.storage: "oci"
  artifacts.tekton.storage: "tekton"
```

This creates multiple attestation formats for different verification tools.

## Troubleshooting Common Issues

If signatures are not being created:

```bash
# Check Chains has permissions
kubectl auth can-i create secrets \
  --as=system:serviceaccount:tekton-chains:tekton-chains-controller \
  -n tekton-chains

# Verify signing key exists
kubectl get secret signing-secrets -n tekton-chains

# Check TaskRun completed successfully
kubectl get taskrun <taskrun-name> -o jsonpath='{.status.conditions[0]}'
```

## Conclusion

Tekton Chains provides automated, transparent signing and attestation for CI/CD artifacts. By configuring Chains properly, you establish a verifiable supply chain that proves artifact provenance and integrity. This automated approach removes the burden of manual signing while maintaining strong security guarantees. Combined with admission controllers that verify signatures, Chains creates a complete supply chain security solution for Kubernetes deployments.
