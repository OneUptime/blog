# Validation Summary: How to Troubleshoot ImagePullBackOff Errors in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Docker CLI
- Docker Hub API
- Docker Registry HTTP API V2

## Sources Consulted
- Portainer Applications docs: https://docs.portainer.io/user/kubernetes/applications
- Portainer "Add a new application using a form" docs: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Kubernetes registries docs: https://docs.portainer.io/2.27/user/kubernetes/cluster/registries
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes "Pull an Image from a Private Registry" docs: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes field selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes "Debug Services" docs: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Docker `docker manifest` reference: https://docs.docker.com/reference/cli/docker/manifest/
- Docker daemon proxy configuration docs: https://docs.docker.com/engine/daemon/proxy/
- Docker Hub API reference: https://docs.docker.com/reference/api/hub/latest/
- Docker Hub API deprecation notes: https://docs.docker.com/reference/api/hub/deprecated/
- CNCF Distribution HTTP API V2 spec: https://distribution.github.io/distribution/spec/api/

## Issues Found
- The `apps/v1` Deployment example was invalid because it omitted the required `.spec.selector` and matching pod template labels. I added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid for current Kubernetes.
- The Docker Hub tag-check example used a non-canonical API pattern. I replaced it with `docker manifest inspect`, which is documented and avoids relying on Docker Hub API authentication details.
- The proxy configuration example used outdated Docker daemon JSON keys (`httpProxy`, `httpsProxy`, `noProxy`). I updated them to the current documented keys (`http-proxy`, `https-proxy`, `no-proxy`), scoped the example to nodes using Docker as the container runtime, and added the required daemon restart step.
- The temporary `kubectl run` diagnostics did not use the disposable-pod pattern shown in Kubernetes docs. I added `--restart=Never` to align them with current guidance for one-off debug pods.
- The `docker manifest inspect --insecure` example was labeled as a generic private-registry command, but `--insecure` is specifically for insecure registries. I clarified that wording.
- The registry tag listing example used `Authorization: Bearer <base64(user:password)>`, which is not a correct Bearer-token flow. I replaced it with a basic-auth example and explicitly limited it to registries that accept basic auth directly.
- The diagnostic script attempted to pipe `kubectl` `jsonpath` output into `python3 -m json.tool`, which is not reliable because `jsonpath` output is not guaranteed to be JSON. I changed it to print `imagePullSecrets` names directly and quoted shell variables in the script.
- The Portainer navigation text used `Registries > Add Registry`, but the Kubernetes user docs place this under `Cluster > Registries`. I updated the path and adjusted the text about namespace access to match current Portainer behavior.
- The registry provider list included `GCR`, which is not part of the current provider list shown in the Portainer registry docs. I generalized that line to "another supported provider".

## Review Notes
- `kubectl create secret docker-registry` still documents `--docker-email`, but the email field is optional in current Kubernetes docs.
- The private-registry `curl` example now uses direct basic auth only as a conditional example. Many registries use token-based auth instead, so registry-specific auth flows may still be required in practice.
