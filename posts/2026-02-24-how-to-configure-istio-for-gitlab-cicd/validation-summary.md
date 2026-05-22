# Validation Summary: How to Configure Istio for GitLab CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- GitLab CI/CD
- GitLab Runner
- Kubernetes
- Docker / Docker-in-Docker
- kubectl
- istioctl

## Sources Consulted
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab CI/CD variables reference: https://docs.gitlab.com/ci/variables/
- GitLab Runner Kubernetes executor docs: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab protected environments docs: https://docs.gitlab.com/ci/environments/protected_environments/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The post listed custom registry variables (`REGISTRY_USER`, `REGISTRY_PASSWORD`, and `CONTAINER_REGISTRY`) while the pipeline used GitLab's predefined `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, and `CI_REGISTRY_IMAGE` variables. Updated the variable list to match GitLab's predefined registry variables.
- The examples pinned Istio 1.20.0 and kubectl/Kubernetes 1.28.0, which are no longer supported. Updated the version examples to Istio 1.30.0 and kubectl 1.36.0.
- The Docker login command passed the registry password with `-p`, which can expose the secret in process arguments. Updated it to use `--password-stdin`.
- The validation job used `bitnami/kubectl` and then ran `curl`, but kubectl images should not be assumed to include curl. Changed the validation job to use Alpine and install curl explicitly before downloading Istio.
- The Istio manifests used `networking.istio.io/v1beta1` for `VirtualService`. Updated the examples to the current `networking.istio.io/v1` API version used in Istio's reference documentation.
- The canary `VirtualService` routed to `stable` and `canary` subsets without showing the required `DestinationRule` subsets. Added a `DestinationRule` example and noted the required workload labels.
- The canary smoke test sent ingress traffic with `Host: my-app.example.com`, but the production `VirtualService` only matched `my-app` and did not bind to a Gateway. Updated the production `VirtualService` examples to use `my-app.example.com` with `my-app-gateway`, and updated the test URL to the ingress gateway service FQDN.
- The `curlimages/curl` job image has a non-shell entrypoint. Added a GitLab `image:entrypoint` override so the job script can run correctly.

## Review Notes
- The snippets still assume supporting resources such as the `my-app` Service, the stable Deployment, namespaces, and the `my-app-gateway` Gateway already exist.
- GitLab's `only` keyword remains valid, but `rules` is the more flexible modern option for future revisions.
- For production, storing kubeconfig as a file-type CI/CD variable or using a GitLab-supported Kubernetes authentication flow would reduce the need to base64-decode credentials in job scripts.
