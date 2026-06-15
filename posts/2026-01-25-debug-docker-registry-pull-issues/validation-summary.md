# Validation Summary: How to Debug Docker Registry Pull Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Registry HTTP API V2
- Docker Hub authentication and rate limiting
- Private Docker registries and TLS certificates
- AWS Elastic Container Registry
- Google Artifact Registry and Google Container Registry
- Azure Container Registry
- Kubernetes image pull secrets
- Linux networking, DNS, proxies, and certificate stores

## Sources Consulted
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- Docker daemon proxy configuration documentation: https://docs.docker.com/engine/daemon/proxy/
- Docker Registry HTTP API V2 documentation: https://docs.docker.com/reference/api/registry/latest/
- Docker Registry authentication documentation: https://docs.docker.com/reference/api/registry/auth/
- Docker `dockerd` insecure registry and certificate documentation: https://docs.docker.com/reference/cli/dockerd/
- Docker Hub pull usage and limits documentation: https://docs.docker.com/docker-hub/usage/pulls/
- Docker `docker system events` documentation: https://docs.docker.com/reference/cli/docker/system/events/
- AWS CLI `ecr get-login-password` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Google Artifact Registry Docker authentication and push/pull documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Azure CLI `az acr login` documentation: https://learn.microsoft.com/en-us/cli/azure/acr
- Azure Container Registry authentication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Kubernetes private registry pull secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes `kubectl create secret docker-registry` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The sequence diagram showed the Docker client using `POST /token` for registry token authentication. Docker Registry token authentication uses a `GET` request with query parameters such as `service` and `scope`, so this was changed to `GET /token`.
- The layer debugging example used Docker Hub blob URLs for `library/nginx` but did not show how to obtain a token scoped to `repository:library/nginx:pull`. Added the matching token command so the subsequent blob checks use an appropriate bearer token.
- The debugging script treated any first image component containing a colon as a registry. That would incorrectly classify a single-component image such as `nginx:alpine` as a registry because the colon is the tag separator. The script now only treats the first component as a registry when the image contains a slash and the first component has a dot, port, or is `localhost`.
- The debugging script appended `:443` to the registry value for TLS checks, which broke registries that already include a port such as `localhost:5000`. The script now splits host and port and defaults to port 443 only when no port is present.
- The debugging script used the full registry value for DNS lookup, which fails for port-qualified registries. The DNS check now uses the host portion only.

## Review Notes
- The `docker login -u username -p password` example is valid but Docker documents `--password-stdin` as the safer non-interactive approach because command-line passwords can appear in shell history or process listings.
- Docker Hub rate-limit values and account tiers can change. The post correctly demonstrates checking current rate-limit headers instead of relying only on fixed numbers.
- Some registry API endpoints, such as `_catalog`, may be disabled or restricted by registry implementations even when authentication is valid.
