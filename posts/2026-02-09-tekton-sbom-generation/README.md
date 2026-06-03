# How to Build a Tekton Pipeline That Generates and Publishes SBOMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, SBOM, Security

Description: Learn how to create a Tekton CI/CD pipeline that automatically generates Software Bill of Materials (SBOMs) for container images and publishes them to a registry for compliance and security tracking.

---

Software Bill of Materials (SBOM) documents provide a complete inventory of components in your container images. As software supply chain attacks increase and regulations like the US Executive Order 14028 mandate SBOMs, automating their generation becomes essential. This guide demonstrates building a Tekton pipeline that generates SBOMs using Syft, signs them with Cosign, and publishes them alongside container images.

## Why SBOMs Matter in Container Pipelines

Container images bundle hundreds of dependencies, many several layers deep in the dependency tree. When a vulnerability like Log4Shell emerges, you need to quickly identify which images contain the affected component. SBOMs make this possible by documenting every library, binary, and package in your images.

Beyond incident response, SBOMs enable proactive security. By scanning SBOMs against vulnerability databases, you detect issues before deployment. Many organizations also require SBOMs for compliance with government contracts or industry regulations. Generating them automatically in your CI/CD pipeline ensures every image has an associated, verifiable SBOM.

## Setting Up Tekton Prerequisites

Before building the pipeline, install Tekton Pipelines and required tasks on your Kubernetes cluster:

```bash
# Install Tekton Pipelines

kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Triggers (optional, for webhook automation)
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml

# Verify installation
kubectl get pods -n tekton-pipelines
```

Create a namespace for your pipeline resources:

```bash
kubectl create namespace sbom-pipeline

# Install catalog tasks used by the pipeline
tkn hub install task git-clone -n sbom-pipeline
tkn hub install task buildah -n sbom-pipeline

# Create a service account for the pipeline
kubectl create serviceaccount pipeline-sa -n sbom-pipeline
```

Configure registry credentials for pushing images and SBOMs:

```bash
# Create Docker registry secret
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=your-username \
  --docker-password=your-password \
  -n sbom-pipeline

# Link secret to service account
kubectl patch serviceaccount pipeline-sa \
  -n sbom-pipeline \
  -p '{"secrets": [{"name": "regcred"}]}'
```

## Creating the SBOM Generation Task

Tekton Tasks define reusable units of work. Create a Task that generates SBOMs using Syft:

```yaml
# task-generate-sbom.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: generate-sbom
  namespace: sbom-pipeline
spec:
  params:
    - name: IMAGE
      description: Full image reference (registry/repo:tag)
      type: string
    - name: FORMAT
      description: SBOM output format (cyclonedx-json, spdx-json, syft-json)
      type: string
      default: cyclonedx-json

  results:
    - name: sbom-digest
      description: SHA256 digest of the generated SBOM

  workspaces:
    - name: sbom-output
      description: Shared workspace for the generated SBOM file

  steps:
    - name: generate-sbom
      image: anchore/syft:v1.44.0-debug
      script: |
        #!/bin/sh
        set -e

        IMAGE="$(params.IMAGE)"
        FORMAT="$(params.FORMAT)"

        echo "Generating SBOM for ${IMAGE}"

        # Generate SBOM and save to file
        syft "${IMAGE}" -o "${FORMAT}" > $(workspaces.sbom-output.path)/sbom.json

        # Calculate digest for verification
        DIGEST=$(sha256sum $(workspaces.sbom-output.path)/sbom.json | cut -d' ' -f1)
        echo -n "${DIGEST}" | tee $(results.sbom-digest.path)

        echo "SBOM generated successfully"
        echo "Format: ${FORMAT}"
        echo "Digest: ${DIGEST}"

    - name: validate-sbom
      image: alpine:3.23
      script: |
        #!/bin/sh
        set -e

        apk add --no-cache jq

        # Basic validation - ensure SBOM has content
        if [ ! -s $(workspaces.sbom-output.path)/sbom.json ]; then
          echo "ERROR: SBOM file is empty"
          exit 1
        fi

        # Validate JSON structure
        if ! jq empty $(workspaces.sbom-output.path)/sbom.json 2>/dev/null; then
          echo "ERROR: SBOM is not valid JSON"
          exit 1
        fi

        # Check for minimum expected fields in CycloneDX, SPDX, or Syft JSON output
        COMPONENT_COUNT=$(jq '(.components // .packages // .artifacts // []) | length' $(workspaces.sbom-output.path)/sbom.json)
        if [ "${COMPONENT_COUNT}" -lt 1 ]; then
          echo "ERROR: SBOM contains no components"
          exit 1
        fi

        echo "SBOM validation passed - ${COMPONENT_COUNT} components found"
```

This Task generates an SBOM, validates its structure, and outputs the digest for downstream verification.

## Creating the SBOM Publishing Task

Create a Task that publishes SBOMs to your container registry as an image layer:

```yaml
# task-publish-sbom.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: publish-sbom
  namespace: sbom-pipeline
spec:
  params:
    - name: IMAGE
      description: Image reference the SBOM documents
      type: string
    - name: SBOM_DIGEST
      description: SHA256 digest of the SBOM
      type: string

  workspaces:
    - name: sbom-output
      description: Shared workspace containing sbom.json

  steps:
    - name: package-sbom
      image: alpine:3.23
      script: |
        #!/bin/sh
        set -e

        # crane append expects tarball layers, so package the SBOM first
        tar -C $(workspaces.sbom-output.path) -cf $(workspaces.sbom-output.path)/sbom.tar sbom.json

    - name: publish-sbom
      image: gcr.io/go-containerregistry/crane:latest
      command: ["/ko-app/crane"]
      args:
        - append
        - --new_layer
        - $(workspaces.sbom-output.path)/sbom.tar
        - --new_tag
        - $(params.IMAGE).sbom
        - --base
        - scratch

    - name: show-published-sbom
      image: alpine:3.23
      script: |
        #!/bin/sh
        set -e

        SBOM_REF="$(params.IMAGE).sbom"
        SBOM_DIGEST="$(params.SBOM_DIGEST)"

        echo "SBOM published successfully"
        echo "Reference: ${SBOM_REF}"
        echo "Digest: ${SBOM_DIGEST}"
```

This Task publishes the SBOM as a registry image containing the SBOM file, making it easy to retrieve and verify alongside the image.

## Signing SBOMs with Cosign

For supply chain security, sign SBOMs to prove authenticity. Create a Task using Cosign:

```yaml
# task-sign-sbom.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: sign-sbom
  namespace: sbom-pipeline
spec:
  params:
    - name: IMAGE
      description: Image reference
      type: string

  steps:
    - name: sign-sbom
      image: ghcr.io/sigstore/cosign/cosign:latest
      command: ["/ko-app/cosign"]
      args:
        - sign
        - --yes
        - $(params.IMAGE).sbom
```

Cosign keyless signing uses OIDC identity for signatures without managing keys.

## Building the Complete Pipeline

Combine all Tasks into a Pipeline that builds images, generates SBOMs, publishes, and signs:

```yaml
# pipeline-build-with-sbom.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-with-sbom
  namespace: sbom-pipeline
spec:
  params:
    - name: git-url
      type: string
      description: Git repository URL
    - name: git-revision
      type: string
      description: Git revision (branch, tag, commit)
      default: main
    - name: image-reference
      type: string
      description: Full image reference (registry/repo:tag)
    - name: sbom-format
      type: string
      description: SBOM format
      default: cyclonedx-json

  workspaces:
    - name: source-workspace
    - name: sbom-workspace

  tasks:
    # Clone source code
    - name: fetch-source
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: source-workspace

    # Build container image
    - name: build-image
      taskRef:
        name: buildah
      runAfter: [fetch-source]
      params:
        - name: IMAGE
          value: $(params.image-reference)
        - name: CONTEXT
          value: .
      workspaces:
        - name: source
          workspace: source-workspace

    # Generate SBOM
    - name: generate-sbom
      taskRef:
        name: generate-sbom
      runAfter: [build-image]
      params:
        - name: IMAGE
          value: $(params.image-reference)
        - name: FORMAT
          value: $(params.sbom-format)
      workspaces:
        - name: sbom-output
          workspace: sbom-workspace

    # Publish SBOM
    - name: publish-sbom
      taskRef:
        name: publish-sbom
      runAfter: [generate-sbom]
      params:
        - name: IMAGE
          value: $(params.image-reference)
        - name: SBOM_DIGEST
          value: $(tasks.generate-sbom.results.sbom-digest)
      workspaces:
        - name: sbom-output
          workspace: sbom-workspace

    # Sign SBOM
    - name: sign-sbom
      taskRef:
        name: sign-sbom
      runAfter: [publish-sbom]
      params:
        - name: IMAGE
          value: $(params.image-reference)
```

## Running the Pipeline

Create a PipelineRun to execute the pipeline:

```yaml
# pipelinerun-example.yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: build-myapp-with-sbom
  namespace: sbom-pipeline
spec:
  pipelineRef:
    name: build-with-sbom

  params:
    - name: git-url
      value: https://github.com/your-org/your-app
    - name: git-revision
      value: main
    - name: image-reference
      value: registry.example.com/myapp:v1.2.3
    - name: sbom-format
      value: cyclonedx-json

  workspaces:
    - name: source-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi
    - name: sbom-workspace
      emptyDir: {}

  serviceAccountName: pipeline-sa
```

Apply and watch the pipeline:

```bash
kubectl apply -f pipelinerun-example.yaml
tkn pipelinerun logs -f build-myapp-with-sbom -n sbom-pipeline
```

## Automating with Tekton Triggers

Set up automatic pipeline execution on Git pushes using Tekton Triggers:

```yaml
# trigger-template.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: build-sbom-template
  namespace: sbom-pipeline
spec:
  params:
    - name: git-url
    - name: git-revision
    - name: image-tag

  resourcetemplates:
    - apiVersion: tekton.dev/v1
      kind: PipelineRun
      metadata:
        generateName: build-sbom-run-
      spec:
        pipelineRef:
          name: build-with-sbom
        params:
          - name: git-url
            value: $(tt.params.git-url)
          - name: git-revision
            value: $(tt.params.git-revision)
          - name: image-reference
            value: registry.example.com/myapp:$(tt.params.image-tag)
        workspaces:
          - name: source-workspace
            volumeClaimTemplate:
              spec:
                accessModes: [ReadWriteOnce]
                resources:
                  requests:
                    storage: 1Gi
          - name: sbom-workspace
            emptyDir: {}
        serviceAccountName: pipeline-sa
---
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-push-binding
  namespace: sbom-pipeline
spec:
  params:
    - name: git-url
      value: $(body.repository.clone_url)
    - name: git-revision
      value: $(body.head_commit.id)
    - name: image-tag
      value: $(body.head_commit.id)
---
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
  namespace: sbom-pipeline
spec:
  serviceAccountName: pipeline-sa
  triggers:
    - name: github-push
      bindings:
        - ref: github-push-binding
      template:
        ref: build-sbom-template
```

Expose the EventListener and configure GitHub webhooks to trigger builds automatically.

## Verifying Published SBOMs

Verify SBOMs are correctly published and signed:

```bash
# Download SBOM
crane export registry.example.com/myapp:v1.2.3.sbom sbom.tar
tar -xOf sbom.tar sbom.json > sbom.json

# Verify signature
cosign verify registry.example.com/myapp:v1.2.3.sbom \
  --certificate-identity="<expected OIDC identity>" \
  --certificate-oidc-issuer="<expected OIDC issuer>"

# Query SBOM for specific packages
jq '.components[] | select(.name == "log4j")' sbom.json
```

This workflow ensures every image has a verifiable SBOM for compliance and security analysis.

## Conclusion

Automating SBOM generation in Tekton pipelines ensures every container image has complete, verifiable component documentation. By integrating Syft for generation, OCI registries for storage, and Cosign for signing, you build a robust supply chain security foundation that meets regulatory requirements while enabling rapid vulnerability response.

The pipeline-as-code approach makes SBOM generation consistent across all projects, and the declarative Tekton resources integrate seamlessly with GitOps workflows. This automation transforms SBOMs from a compliance checkbox into a practical tool for managing software supply chain risk.
