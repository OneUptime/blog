# Validation Summary: How to Store Docker Registry Credentials in Git with SOPS and Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- GitOps
- Kubernetes Secrets
- Kubernetes imagePullSecrets
- SOPS
- age
- Docker and OCI container registries
- GitHub Container Registry
- Docker Hub
- Amazon ECR
- AWS CLI

## Sources Consulted
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes container images and imagePullSecrets documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- SOPS documentation: https://sops.pages.dev/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI get-login-password command reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/ecr/get-login-password.html

## Issues Found
- The Amazon ECR secret example called `aws ecr get-login-password` without a region while using a `us-east-1` registry endpoint. I added `--region us-east-1` so the token is requested from the matching ECR region.
- The credential rotation example encrypted `/tmp/new-secret.yaml` directly. With the post's `.sops.yaml` `path_regex`, that temporary path may not match the creation rule. I added `--filename-override clusters/my-cluster/secrets/ghcr-pull-secret.yaml` so SOPS evaluates the intended repository path.
- The disposable pull-test pod did not reference `ghcr-pull-secret`, so it would only test the secret if the default ServiceAccount had already been configured with that pull secret. I added a `kubectl run --overrides` pod spec fragment that sets `imagePullSecrets` on the test pod.

## Review Notes
- `kubectl` and `sops` were not installed in the local environment, so command validation was performed against official documentation rather than local CLI help.
- The examples use current Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization fields and current Kubernetes Secret and image pull secret patterns.
