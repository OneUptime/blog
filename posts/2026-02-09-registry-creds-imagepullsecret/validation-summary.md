# Validation Summary: How to Use Registry-Creds for Automated ImagePullSecret Propagation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- ImagePullSecrets
- Kubernetes Secrets and ServiceAccounts
- Kubernetes RBAC
- registry-creds v1.10
- AWS ECR
- Google Container Registry
- Azure Container Registry
- Docker Hub / private registries

## Sources Consulted
- registry-creds GitHub repository and v1.10 source: https://github.com/upmc-enterprises/registry-creds
- registry-creds v1.10 README and Kubernetes manifests: https://github.com/upmc-enterprises/registry-creds/tree/v1.10
- Kubernetes documentation, Pull an Image from a Private Registry: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes kubectl reference, create secret generic: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal

## Issues Found
- The post described registry-creds as maintaining a master set of credentials and only reacting to namespace creation. Updated the explanation to match the v1.10 source: it reads provider credentials, processes namespace add and update events, updates generated ImagePullSecrets, patches the default service account, and refreshes on a 60-minute timer.
- The deployment used unsupported Docker Hub environment variables (`DOCKER_USER` and `DOCKER_PASSWORD`). Replaced them with the registry-creds v1.10 variables `DOCKER_PRIVATE_REGISTRY_SERVER`, `DOCKER_PRIVATE_REGISTRY_USER`, and `DOCKER_PRIVATE_REGISTRY_PASSWORD`.
- The GCR configuration used unsupported environment variables. Changed the example to use `gcrurl` and mount `application_default_credentials.json` at `/root/.config/gcloud`, matching the registry-creds deployment pattern.
- The private registry example created a `kubernetes.io/dockerconfigjson` secret that registry-creds would not consume as provider input. Replaced it with the supported registry-creds Docker private registry secret format and added separate GCR and ACR credential examples.
- The verification examples listed `dockerhub-secret`, which is not a registry-creds default. Updated the generated secret names to `dpr-secret`, `awsecr-cred`, `gcr-secret`, and `acr-secret`.
- The credential rotation example updated the wrong secret name and keys. Updated it to rotate `registry-creds-dpr` using the supported Docker private registry keys.
- The namespace exclusion annotation `registry-creds/ignore` is not supported by the UPMC registry-creds v1.10 source. Replaced that section with the supported `--skip-kube-system=false` flag behavior and noted that annotation-based exclusions require a different tool.
- The sample log lines did not match registry-creds v1.10 log output. Replaced them with representative messages from the source.

## Review Notes
The post now matches the pinned `upmcenterprises/registry-creds:1.10` behavior. One production caveat remains: the upstream project is old and uses older client-go dependencies, so teams should test it carefully on modern Kubernetes clusters or consider current alternatives such as kubelet image credential providers, external secret operators, or purpose-built secret replication controllers.
