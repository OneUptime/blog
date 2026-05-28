# Validation Summary: How to Create a Multi-Architecture Docker Build for ARM and x86 Using Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Buildx
- Docker manifest lists
- QEMU/binfmt emulation
- Google Cloud Build
- Artifact Registry
- Google Kubernetes Engine
- Kubernetes scheduling, tolerations, and topology spread constraints
- Go
- Alpine Linux

## Sources Consulted
- Docker multi-platform build documentation: https://docs.docker.com/build/building/multi-platform/
- Docker Buildx CLI help from local Docker installation
- Docker manifest CLI documentation: https://docs.docker.com/reference/cli/docker/manifest/
- Google Cloud Build configuration schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud builders documentation: https://docs.cloud.google.com/build/docs/cloud-builders
- GKE Arm workloads documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/arm-on-gke
- GKE Arm workload deployment preparation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/prepare-arm-workloads-for-deployment
- GKE Arm cluster and node pool creation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/create-arm-clusters-nodes
- gcloud container clusters create reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- gcloud container node-pools create reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Kubernetes node label documentation: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Go runtime package documentation: https://pkg.go.dev/runtime
- Go release policy: https://go.dev/doc/devel/release
- Docker Official Image for Go tags: https://hub.docker.com/_/golang/
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The Dockerfile used `golang:1.22-alpine` and `alpine:3.19`. Go 1.22 is outside the current Go support window, and Alpine 3.19 reached end of support on November 1, 2025. Updated the examples to `golang:1.26-alpine` and `alpine:3.23`.
- The QEMU setup examples used `multiarch/qemu-user-static`. Docker's current multi-platform build documentation recommends `tonistiigi/binfmt --install all`. Updated both Cloud Build snippets to use `docker run --privileged --rm tonistiigi/binfmt --install all`.
- The "Building Each Architecture Separately" section said each architecture could be built natively, but the sample still builds arm64 under QEMU in Cloud Build. Reworded the explanation to say the example builds separate tags and still uses emulation for arm64 unless a native Arm builder is used.
- The GKE deployment section said no manifest changes were needed for mixed x86 and Arm nodes. GKE Standard taints Arm nodes with `kubernetes.io/arch=arm64:NoSchedule`, so a workload that should run on both architectures needs a matching toleration. Added the toleration to the Deployment example and corrected the surrounding explanation.
- The topology spread explanation said the constraint ensures distribution across architectures. With `whenUnsatisfiable: ScheduleAnyway`, Kubernetes treats the constraint as a scheduling preference. Updated the wording to say it asks the scheduler to prefer a balanced spread.

## Review Notes
- `gcloud` was not installed in the local workspace, so gcloud command verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
- Local Docker CLI help confirmed the Docker `buildx`, `build`, `run`, and `manifest` flags used in the post.
