# Validation Summary: How to Fix 'Custom Registry Credentials Ignored' in Portainer - Ignored

## Status
validated

## Post Type
Guide / troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker Engine / Docker CLI
- Docker Registry HTTP API V2
- Kubernetes
- `kubectl`

## Sources Consulted
- Portainer docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer docs: Updating on Docker Swarm - https://docs.portainer.io/start/upgrade/swarm
- Portainer docs: Kubernetes registries - https://docs.portainer.io/user/kubernetes/cluster/registries
- Docker docs: `docker login` - https://docs.docker.com/reference/cli/docker/login/
- Docker docs: image reference format (`docker image tag`) - https://docs.docker.com/reference/cli/docker/image/tag/
- CNCF Distribution spec: HTTP API V2 - https://distribution.github.io/distribution/spec/api/
- Kubernetes docs: `kubectl create secret docker-registry` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Portainer source: Compose credential handling - https://github.com/portainer/portainer/blob/develop/pkg/libstack/compose/composeplugin.go
- Portainer source: Kubernetes registry secret creation - https://github.com/portainer/portainer/blob/develop/api/kubernetes/cli/registries.go
- Portainer source: Kubernetes registry access wiring `imagePullSecrets` onto the default ServiceAccount - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_registry_access.go

## Issues Found
- The post said the Portainer registry URL must not include `https://`. I corrected this because Portainer accepts registry URLs with or without a protocol and assumes `https://` when omitted; the scheme prohibition applies to Docker image references, not the Portainer registry URL.
- The post claimed cached host Docker credentials override Portainer's stored credentials. I corrected this to explain Docker credential-helper / `credsStore` precedence during manual testing and clarified that `docker logout` affects the local Docker CLI state, not Portainer's saved registry entry.
- The connectivity test used `https://registry.company.com/v2/_catalog`. I changed it to `https://registry.company.com/v2/`, which is the standard V2 API probe; `_catalog` may be disabled or restricted even when the registry is healthy.
- The Kubernetes section said Portainer requires manually created Kubernetes image pull secrets instead of registry entries. I corrected this because Portainer's Kubernetes registry access is namespace-scoped and Portainer creates the registry secret and wires it into the default ServiceAccount when access is granted; manual secrets are only needed outside that workflow.
- The Portainer command examples were partially incorrect or misleading. I fixed the server version command, replaced the agent version example with a safe image-tag inspection, updated the debug-run example to current Portainer docs, and reframed manual `docker login` as a diagnostic check instead of a daemon-side workaround.

## Review Notes
- No remaining technical issues found after the edits.
- The Portainer 1.x to 2.0.0 upgrade note is accurate but only relevant to older legacy installations.
- The `kubectl create secret docker-registry` example remains valid as a manual fallback, but for Kubernetes environments managed through Portainer, namespace registry access is the first thing to verify.
