# How to Use Podman with Tekton Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Tekton, Kubernetes, CI/CD, Cloud Native

Description: Learn how to use Podman in Tekton Pipelines for building, testing, and deploying container images in a Kubernetes-native CI/CD workflow.

---

> Tekton and Podman are a natural pair: both are cloud-native, both run without a daemon, and both fit well into Kubernetes-centric workflows.

Tekton is a Kubernetes-native CI/CD framework that runs pipelines as Kubernetes resources. Using Podman inside Tekton tasks gives you a daemonless container tool for building, testing, and pushing images. Because each Tekton task runs in its own Pod, this guide saves the built image into the shared workspace so later tasks can load and reuse it.

---

## Setting Up a Podman Task in Tekton

Create a Tekton Task that uses a Podman container image to build container images.

```yaml
# tekton/tasks/podman-build.yaml

# Tekton Task that builds a container image using Podman
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: podman-build
spec:
  params:
    - name: IMAGE
      description: The image name and tag to build
      type: string
    - name: CONTEXT
      description: Build context directory
      type: string
      default: "."
    - name: CONTAINERFILE
      description: Path to the Containerfile
      type: string
      default: "Containerfile"
    - name: ARCHIVE
      description: File name for the saved image archive in the shared workspace
      type: string
      default: "podman-image.tar"

  workspaces:
    - name: source
      description: The workspace containing the source code

  results:
    - name: IMAGE_DIGEST
      description: Digest of the built image

  steps:
    # Build the container image using Podman
    - name: build
      image: quay.io/podman/stable:latest
      workingDir: $(workspaces.source.path)
      securityContext:
        runAsUser: 0
        privileged: true
      script: |
        #!/bin/bash
        set -e

        # Configure storage for the CI environment
        mkdir -p /var/lib/containers
        export STORAGE_DRIVER=vfs

        # Build the image
        podman build \
          --tag "$(params.IMAGE)" \
          --file "$(params.CONTAINERFILE)" \
          "$(params.CONTEXT)"

        # Get and store the image digest
        DIGEST=$(podman image inspect --format '{{.Digest}}' "$(params.IMAGE)")
        echo -n "$DIGEST" > "$(results.IMAGE_DIGEST.path)"

        # Save the image into the shared workspace for later tasks
        podman save \
          --format oci-archive \
          --output "$(workspaces.source.path)/$(params.ARCHIVE)" \
          "$(params.IMAGE)"

        echo "Built image: $(params.IMAGE)"
        echo "Digest: $DIGEST"
        echo "Saved image archive: $(workspaces.source.path)/$(params.ARCHIVE)"
```

## Creating a Push Task

Create a separate task for pushing images to a registry.

```yaml
# tekton/tasks/podman-push.yaml
# Tekton Task that pushes a container image to a registry
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: podman-push
spec:
  params:
    - name: IMAGE
      description: The fully qualified image name to push
      type: string
    - name: ARCHIVE
      description: File name of the saved image archive in the shared workspace
      type: string
      default: "podman-image.tar"

  workspaces:
    - name: source
      description: Shared workspace containing the saved image archive
    - name: registry-credentials
      description: Workspace containing registry credentials

  steps:
    - name: push
      image: quay.io/podman/stable:latest
      securityContext:
        runAsUser: 0
        privileged: true
      script: |
        #!/bin/bash
        set -e

        export STORAGE_DRIVER=vfs

        # Load the image archive created by the build task
        podman load --input "$(workspaces.source.path)/$(params.ARCHIVE)"

        # Configure registry authentication from the workspace
        CRED_DIR="$(workspaces.registry-credentials.path)"
        mkdir -p "${HOME}/.docker"
        if [ -f "${CRED_DIR}/config.json" ]; then
          cp "${CRED_DIR}/config.json" "${HOME}/.docker/config.json"
        elif [ -f "${CRED_DIR}/.dockerconfigjson" ]; then
          cp "${CRED_DIR}/.dockerconfigjson" "${HOME}/.docker/config.json"
        fi

        # Push the image to the registry
        podman push "$(params.IMAGE)"

        echo "Pushed: $(params.IMAGE)"
```

## Building a Complete Pipeline

Combine tasks into a Tekton Pipeline for a full build-test-push workflow.

```yaml
# tekton/pipelines/build-test-push.yaml
# Tekton Pipeline that builds, tests, and pushes a container image
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: podman-ci-pipeline
spec:
  params:
    - name: repo-url
      type: string
    - name: image-name
      type: string
    - name: revision
      type: string
      default: "main"

  workspaces:
    - name: shared-workspace
    - name: registry-creds

  tasks:
    # Clone the source repository
    - name: fetch-source
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-workspace
      params:
        - name: url
          value: $(params.repo-url)
        - name: revision
          value: $(params.revision)

    # Build the container image
    - name: build-image
      runAfter: ["fetch-source"]
      taskRef:
        name: podman-build
      workspaces:
        - name: source
          workspace: shared-workspace
      params:
        - name: IMAGE
          value: $(params.image-name):$(params.revision)

    # Run tests inside the built image
    - name: run-tests
      runAfter: ["build-image"]
      taskRef:
        name: podman-test
      workspaces:
        - name: source
          workspace: shared-workspace
      params:
        - name: IMAGE
          value: $(params.image-name):$(params.revision)

    # Push to registry after tests pass
    - name: push-image
      runAfter: ["run-tests"]
      taskRef:
        name: podman-push
      workspaces:
        - name: source
          workspace: shared-workspace
        - name: registry-credentials
          workspace: registry-creds
      params:
        - name: IMAGE
          value: $(params.image-name):$(params.revision)
```

## Creating a Test Task

Define a Tekton Task that runs tests inside the built container.

```yaml
# tekton/tasks/podman-test.yaml
# Tekton Task that runs tests in a Podman container
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: podman-test
spec:
  params:
    - name: IMAGE
      description: The image to test
      type: string
    - name: ARCHIVE
      description: File name of the saved image archive in the shared workspace
      type: string
      default: "podman-image.tar"
    - name: TEST_COMMAND
      description: The test command to run
      type: string
      default: "npm test"

  workspaces:
    - name: source

  steps:
    - name: test
      image: quay.io/podman/stable:latest
      workingDir: $(workspaces.source.path)
      securityContext:
        runAsUser: 0
        privileged: true
      script: |
        #!/bin/bash
        set -e

        export STORAGE_DRIVER=vfs

        # Load the image archive created by the build task
        podman load --input "$(workspaces.source.path)/$(params.ARCHIVE)"

        # Run the test suite inside the container
        podman run --rm "$(params.IMAGE)" $(params.TEST_COMMAND)

        echo "Tests passed successfully"
```

## Running the Pipeline

Trigger the pipeline with a PipelineRun resource.

```yaml
# tekton/runs/pipeline-run.yaml
# PipelineRun that triggers the CI pipeline
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: podman-ci-run-
spec:
  pipelineRef:
    name: podman-ci-pipeline
  params:
    - name: repo-url
      value: https://github.com/myorg/myapp.git
    - name: image-name
      value: registry.example.com/myorg/myapp
    - name: revision
      value: main

  workspaces:
    - name: shared-workspace
      persistentVolumeClaim:
        claimName: tekton-workspace-pvc
    - name: registry-creds
      secret:
        secretName: registry-credentials
```

```bash
#!/bin/bash
# Apply the pipeline resources and trigger a run

# Install the catalog git-clone Task if it is not already present
kubectl apply -f \
  https://raw.githubusercontent.com/tektoncd/catalog/main/task/git-clone/0.6/git-clone.yaml

# Apply tasks and pipeline
kubectl apply -f tekton/tasks/
kubectl apply -f tekton/pipelines/

# Trigger the pipeline run
kubectl create -f tekton/runs/pipeline-run.yaml

# Watch the pipeline progress
tkn pipelinerun logs --last -f
```

## Summary

Tekton and Podman are a natural combination for Kubernetes-native CI/CD. Podman runs inside Tekton task steps without needing a daemon, and the vfs storage driver works reliably in container environments. By breaking your pipeline into modular tasks for building, testing, and pushing, you can reuse components across different pipelines. In a multi-task pipeline, save the built image into a shared workspace and load it again in later tasks, because each Tekton task runs in its own Pod. Kubernetes secrets can provide registry credentials securely, and PipelineRuns let you trigger builds and monitor them with the Tekton CLI.
