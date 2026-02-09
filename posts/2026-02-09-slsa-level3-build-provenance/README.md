# How to Implement SLSA Level 3 Build Provenance for Kubernetes Container Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLSA, Supply Chain Security, Container Security, Build Provenance, Sigstore

Description: Learn how to implement SLSA Level 3 build provenance for Kubernetes container images using Tekton Chains and Sigstore for verifiable supply chain security.

---

Supply chain attacks are increasing. How do you prove your container images were built from specific source code, in a secure environment, without tampering? SLSA (Supply-chain Levels for Software Artifacts) provides a framework for build provenance. SLSA Level 3 requires cryptographically signed attestations proving build integrity. This guide shows you how to implement SLSA Level 3 for Kubernetes container images.

## Understanding SLSA Levels

SLSA defines four levels of supply chain security:

- **Level 1**: Documentation of build process
- **Level 2**: Signed provenance with service-generated authentication
- **Level 3**: Signed provenance with build isolation and non-falsifiable metadata
- **Level 4**: Two-party review and hermetic builds

Level 3 is the practical target for most organizations.

## SLSA Level 3 Requirements

To achieve Level 3:

1. **Build service**: Isolated build environment (Kubernetes, GitHub Actions)
2. **Provenance generation**: Automated attestation of build inputs/outputs
3. **Non-falsifiable**: Build service generates provenance, not user scripts
4. **Isolated**: Build runs in separate environment from development
5. **Signed**: Cryptographically signed with ephemeral keys

## Architecture Overview

Components for SLSA Level 3:

- **Tekton**: Isolated build pipeline
- **Tekton Chains**: Provenance generation
- **Sigstore**: Keyless signing infrastructure
- **Cosign**: Image signature verification
- **Rekor**: Transparency log

## Installing Tekton Chains

Tekton Chains generates and signs provenance automatically:

```bash
# Install Tekton Pipelines
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Chains
kubectl apply -f https://storage.googleapis.com/tekton-releases/chains/latest/release.yaml

# Verify installation
kubectl get pods -n tekton-chains
```

## Configuring Tekton Chains

Configure Chains to use keyless signing with Sigstore:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chains-config
  namespace: tekton-chains
data:
  # Use keyless signing with Fulcio
  artifacts.taskrun.format: in-toto
  artifacts.taskrun.storage: oci
  artifacts.pipelinerun.format: in-toto
  artifacts.pipelinerun.storage: oci

  # Transparency log
  transparency.enabled: "true"
  transparency.url: https://rekor.sigstore.dev

  # Storage configuration
  storage.oci.repository: registry.io/yourorg/signatures

  # Sigstore configuration
  signers.x509.fulcio.enabled: "true"
  signers.x509.fulcio.address: https://fulcio.sigstore.dev

  # OIDC issuer for authentication
  signers.x509.fulcio.issuer: https://oauth2.sigstore.dev/auth
  signers.x509.identity.token.file: /var/run/sigstore/cosign/oidc-token
```

Apply the configuration:

```bash
kubectl apply -f chains-config.yaml
kubectl rollout restart deployment tekton-chains-controller -n tekton-chains
```

## Creating a SLSA-Compliant Pipeline

Build pipeline that generates provenance:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: slsa-build-pipeline
  annotations:
    chains.tekton.dev/transparency-upload: "true"
spec:
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
    - name: image-url
      type: string

  workspaces:
    - name: source-ws

  tasks:
    # Task 1: Clone source
    - name: git-clone
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: source-ws

    # Task 2: Run tests
    - name: test
      taskRef:
        name: golang-test
      workspaces:
        - name: source
          workspace: source-ws
      runAfter:
        - git-clone

    # Task 3: Build image
    - name: build-push
      taskRef:
        name: kaniko
      params:
        - name: IMAGE
          value: $(params.image-url)
      workspaces:
        - name: source
          workspace: source-ws
      runAfter:
        - test

  results:
    - name: IMAGE_URL
      value: $(tasks.build-push.results.IMAGE_URL)
    - name: IMAGE_DIGEST
      value: $(tasks.build-push.results.IMAGE_DIGEST)
```

## Kaniko Task with Digest Output

Kaniko task that outputs image digest for provenance:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: kaniko
spec:
  params:
    - name: IMAGE
      description: Image reference

  workspaces:
    - name: source

  results:
    - name: IMAGE_URL
      description: Complete image URL
    - name: IMAGE_DIGEST
      description: Image digest

  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      env:
        - name: DOCKER_CONFIG
          value: /kaniko/.docker
      args:
        - --dockerfile=Dockerfile
        - --context=$(workspaces.source.path)
        - --destination=$(params.IMAGE)
        - --digest-file=/tekton/results/IMAGE_DIGEST
        - --image-name-with-digest-file=/tekton/results/IMAGE_URL
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker

  volumes:
    - name: docker-config
      secret:
        secretName: registry-credentials
```

## Running the Pipeline

Execute the pipeline:

```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: slsa-build-run
spec:
  pipelineRef:
    name: slsa-build-pipeline
  params:
    - name: git-url
      value: https://github.com/yourorg/yourapp
    - name: git-revision
      value: main
    - name: image-url
      value: registry.io/yourorg/yourapp:latest
  workspaces:
    - name: source-ws
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi
```

Run it:

```bash
kubectl apply -f pipelinerun.yaml

# Monitor execution
tkn pipelinerun logs slsa-build-run -f
```

## Viewing Generated Provenance

After the pipeline completes, Tekton Chains generates signed provenance:

```bash
# Get PipelineRun UID
PIPELINERUN_UID=$(kubectl get pipelinerun slsa-build-run -o jsonpath='{.metadata.uid}')

# View provenance (stored as OCI artifact annotation)
cosign download attestation registry.io/yourorg/yourapp:latest | jq .
```

Provenance includes:

```json
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "subject": [
    {
      "name": "registry.io/yourorg/yourapp",
      "digest": {
        "sha256": "abc123..."
      }
    }
  ],
  "predicate": {
    "builder": {
      "id": "https://tekton.dev/chains/v2"
    },
    "buildType": "https://tekton.dev/attestations/chains/pipelinerun@v2",
    "invocation": {
      "configSource": {
        "uri": "https://github.com/yourorg/yourapp",
        "digest": {
          "sha1": "def456..."
        }
      }
    },
    "materials": [
      {
        "uri": "registry.io/kaniko-project/executor:latest",
        "digest": {
          "sha256": "ghi789..."
        }
      }
    ]
  }
}
```

## Verifying Provenance

Verify the provenance signature:

```bash
# Verify signature
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/yourorg" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  registry.io/yourorg/yourapp:latest
```

For Tekton Chains with Sigstore:

```bash
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-oidc-issuer="https://oauth2.sigstore.dev/auth" \
  registry.io/yourorg/yourapp:latest
```

## Policy Enforcement with Kyverno

Enforce SLSA verification before deployment:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-slsa-provenance
spec:
  validationFailureAction: enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-provenance
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.io/yourorg/*"
          attestations:
            - predicateType: https://slsa.dev/provenance/v0.2
              attestors:
                - entries:
                    - keyless:
                        subject: "https://github.com/yourorg/*"
                        issuer: "https://token.actions.githubusercontent.com"
                        rekor:
                          url: https://rekor.sigstore.dev
```

This prevents deploying images without valid SLSA provenance.

## GitHub Actions Integration

Generate SLSA provenance in GitHub Actions:

```yaml
name: Build with SLSA
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest

      - uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v1.9.0
        with:
          image: ghcr.io/${{ github.repository }}
          digest: ${{ steps.build.outputs.digest }}
```

## Viewing Transparency Logs

All signatures are recorded in Rekor transparency log:

```bash
# Search for image in Rekor
rekor-cli search --artifact registry.io/yourorg/yourapp:latest

# Get specific log entry
rekor-cli get --uuid <uuid-from-search>
```

This provides an immutable audit trail.

## SLSA Level 3 Checklist

Verify your implementation:

- [ ] Builds run in isolated Kubernetes environment
- [ ] Provenance generated automatically by Chains
- [ ] Provenance signed with ephemeral keys (Fulcio)
- [ ] Signatures recorded in transparency log (Rekor)
- [ ] Provenance includes source repository and commit
- [ ] Build materials (base images) recorded in provenance
- [ ] Policy enforcement prevents deploying unverified images
- [ ] Audit trail available via transparency log

## Advanced: Hermetic Builds

For SLSA Level 4, use hermetic builds:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hermetic-build
spec:
  steps:
    - name: build
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --dockerfile=Dockerfile
        - --context=/workspace/source
        - --destination=registry.io/yourorg/app:latest
        - --reproducible  # Hermetic build
        - --snapshot-mode=redo
        - --use-new-run
      env:
        - name: SSL_CERT_DIR
          value: /kaniko/ssl/certs
        - name: DOCKER_CONFIG
          value: /kaniko/.docker
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
```

## Monitoring and Alerting

Track SLSA compliance:

```yaml
# Prometheus alert
groups:
  - name: slsa-compliance
    rules:
      - alert: ImageWithoutProvenance
        expr: |
          kube_pod_container_info{image!~".*@sha256:.*"}
        for: 5m
        annotations:
          summary: "Container running without digest reference"
          description: "Pod {{ $labels.pod }} is running image without digest"
```

## Best Practices

1. **Always use digests**: Reference images by digest, not tag
2. **Store provenance with images**: Use OCI registry for provenance
3. **Verify on deployment**: Enforce verification with admission controllers
4. **Monitor transparency logs**: Regular audits of Rekor entries
5. **Rotate signing keys**: Even with keyless, rotate OIDC tokens
6. **Document build process**: Maintain build documentation
7. **Regular compliance checks**: Audit SLSA level periodically

## Troubleshooting

**Provenance not generated:**
```bash
# Check Chains controller logs
kubectl logs -n tekton-chains deployment/tekton-chains-controller

# Verify Chains configuration
kubectl get configmap chains-config -n tekton-chains -o yaml
```

**Signature verification fails:**
```bash
# Check certificate details
cosign verify-attestation \
  --insecure-ignore-tlog \
  registry.io/yourorg/app:latest

# Verify Rekor entry
rekor-cli search --artifact registry.io/yourorg/app:latest
```

**Policy enforcement blocks valid images:**
```bash
# Test policy in audit mode first
spec:
  validationFailureAction: audit

# View Kyverno logs
kubectl logs -n kyverno deployment/kyverno
```

## Conclusion

SLSA Level 3 build provenance provides cryptographic proof of your container image supply chain integrity. Using Tekton Chains with Sigstore, you get automated provenance generation, keyless signing, and transparent audit logs. Combined with policy enforcement, you ensure only verified images deploy to production. While the initial setup requires infrastructure, the security benefits and compliance advantages make SLSA Level 3 essential for production Kubernetes environments handling sensitive workloads.
