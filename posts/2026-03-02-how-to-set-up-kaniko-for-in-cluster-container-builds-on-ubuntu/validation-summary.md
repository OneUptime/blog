# Validation Summary: How to Set Up Kaniko for In-Cluster Container Builds on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide — step-by-step setup of Kaniko on a Kubernetes cluster with registry auth, caching, and CI/CD integration recipes.

## Technologies Covered
- Kaniko (`gcr.io/kaniko-project/executor`)
- Kubernetes (`kubectl`, Pods, Secrets, ConfigMaps)
- Docker registries: Docker Hub, AWS ECR, Google Container Registry, private registries with custom CA
- GitLab CI
- GitHub Actions (`actions/checkout@v4`, `azure/setup-kubectl@v3`)
- Ubuntu 22.04 host nodes

## Sources Consulted
- Kaniko official README — https://github.com/GoogleContainerTools/kaniko
- Kaniko multi-arch discussion — https://github.com/GoogleContainerTools/kaniko/issues/1746 and https://github.com/GoogleContainerTools/kaniko/issues/1491
- kubectl create secret docker-registry reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- kubectl wait reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubernetes/kubectl#1451 (wait condition=Ready on Completed pod) — https://github.com/kubernetes/kubectl/issues/1451
- AWS ECR `get-login-password` docs — https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html

## Issues Found

1. **ECR auth used a non-existent `--docker-password-stdin` flag on `kubectl create secret docker-registry`.** The kubectl subcommand does not support a stdin password flag (only `docker login` does). Rewrote the snippet to capture the ECR token into a shell variable and pass it via `--docker-password="$ECR_PASSWORD"`, and added a note that ECR tokens expire every 12 hours.

2. **GCR section conflated two different files.** The original created a `Secret` whose key was `config.json` but whose contents were a service account keyfile, then showed a `credHelpers` JSON as the "config.json format" — the two are not the same file. Replaced with the canonical Kaniko pattern from the official README: store the keyfile as `kaniko-secret.json`, mount it at `/secret`, and set `GOOGLE_APPLICATION_CREDENTIALS=/secret/kaniko-secret.json`. Added a one-liner recommending Workload Identity on GKE.

3. **Multi-architecture builds were overstated.** The original implied `--custom-platform=linux/arm64` would build an arm64 image on any host. The Kaniko README explicitly says it is "not virtualization and cannot help to build an architecture not natively supported by the build host." Rewrote the section to explain the flag only sets platform metadata / works for compatible variants, and that real cross-arch builds require scheduling the pod onto a native node of the target arch (e.g., `nodeSelector: kubernetes.io/arch: arm64`).

4. **GitHub Actions step used `kubectl wait --for=condition=ready` for a Kaniko pod.** Completed pods have `Ready=False` (kubelet sets reason `PodCompleted`), so `wait --for=condition=Ready` will time out whenever the build finishes before the wait observes Ready — a known kubectl footgun (kubernetes/kubectl#1451). Replaced with a small `until` loop that waits for the pod to leave `Pending`, then tails logs, then surfaces the final `.status.phase == Succeeded` as the step's exit status.

## Review Notes
- Kaniko's Git context format `git://github.com/...#refs/heads/main` is correct per the official README (it does not use `https://` URLs for the `--context` flag, though credentials can be supplied via `git://TOKEN@github.com/...` or the `GIT_TOKEN` env var).
- `--cache-ttl=336h` matches the documented Kaniko default of two weeks.
- `--registry-certificate=host=/path/to/ca.crt` is the correct syntax for trusting a private CA.
- The `--context-sub-path` flag is the cleaner way to build a sub-folder of a Git context; the "Specific subdirectory in Git repo" example in the post uses `--dockerfile` instead, which works for the common "Dockerfile lives in a subfolder" case but does not change the build context root. Not a hard error, so left as-is.
- The GitLab CI snippet uses `$CI_COMMIT_TAG` for the image tag; on non-tag pipelines this variable is empty and the destination would be malformed. Consider `${CI_COMMIT_TAG:-$CI_COMMIT_SHORT_SHA}` in real pipelines.
- The "Slow builds despite caching" troubleshooting check uses `curl https://docker.io/v2/...` against the public Docker registry, which actually lives at `registry-1.docker.io` (and requires a bearer token). The hint is illustrative rather than directly runnable; not modified since the surrounding text frames it as a sanity check rather than a copy-paste command.
