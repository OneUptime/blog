# Validation Summary: kubectl rollout restart: Image Freshness and Safer Immutable Tags

## Status
validated

## Post Type
Technical troubleshooting guide with operational command examples.

## Technologies Covered
- Kubernetes Deployments, Pods, container status, and readiness probes
- kubectl inspection, strategic merge patches, rolling restarts, and image updates
- Container registries, image pull policies, caching, immutable tags, and digest pinning
- Multi-platform container images and runtime image identity
- Bash, JSON, and jq
- Image signatures and provenance verification

## Sources Consulted
- Kubernetes images: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl patch: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- kubectl rollout restart: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- kubectl rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl set image: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Pod API: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Docker image digests: https://docs.docker.com/dhi/explore/security-concepts/digests/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Docker Hub immutable tags: https://docs.docker.com/docker-hub/repos/manage/hub-images/immutable-tags/
- jq manual: https://jqlang.org/manual/
- Sigstore signature and attestation verification: https://docs.sigstore.dev/cosign/verifying/verify/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all five Bash examples. They passed `bash -n`; the strategic patch payload parsed as valid JSON. Both jq filters ran successfully against representative JSON, including a Pod without container statuses and a non-application container that must be excluded.
- Confirmed the documented kubectl resource syntax, namespace and selector flags, JSON/wide output, strategic patch option, named-container image assignment, and five-minute rollout timeout. The patch identifies the container by its merge key, preserving other containers.
- Confirmed the pull-policy behavior, creation-time defaulting, cached layer reuse, and the distinction between replacing Pods and selecting a new image. A mutable tag does not provide a consistent release identity across separate resolutions.
- Confirmed that template changes trigger Deployment rollouts and that controller constraints still apply. The examples assume an active Deployment; paused Deployments must be resumed before template changes roll out. RollingUpdate is the default strategy, while a Deployment configured with Recreate follows that strategy instead.
- Confirmed that runtime image identifiers require interpretation and that an image index and its platform manifests have distinct digests. Readiness alone does not verify release identity.
- Confirmed registry-enforced tag immutability, digest-based content selection, and the separate role of signature and provenance verification. Retaining the previous digest's registry content is necessary for recovery on nodes without cached content.
- All external links in the post resolved to the intended resources. No deprecated command or field was identified. The sample version tag is illustrative rather than a Kubernetes version requirement.
- Validation used documentation, local shell syntax checks, JSON parsing, and jq fixtures. No live cluster or registry rollout was executed. The commands require kubectl access, appropriate permissions, jq, the stated container/selector assumptions, and an approved image reference.
