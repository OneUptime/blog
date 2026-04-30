# Validation Summary: How to Run Init Containers Using Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes init containers
- Kubernetes manifests
- `kubectl`
- Portainer API

## Sources Consulted
- Portainer Create an application from a Manifest: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer Inspect an application: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer `kubectl shell`: https://docs.portainer.io/user/kubernetes/kubectl
- Portainer Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer Add an environment via the API: https://docs.portainer.io/admin/environments/add/api
- Kubernetes Init Containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Configure Pod Initialization: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-initialization/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
1. **The post conflated Kubernetes init containers with generic Docker container management**: Init containers are a Kubernetes Pod feature, not a Docker standalone or Compose feature. I rewrote the introduction, prerequisites, UI workflow, and conclusion so the post now correctly targets Portainer's Kubernetes application workflow.

2. **The Portainer navigation was wrong for this task**: The original instructions directed readers to **Containers** and **Stacks**, which is not how you define Kubernetes init containers in Portainer. I corrected the steps to use **Applications** > **Create from code** > **Manifest**.

3. **The main configuration example did not contain an init container at all**: The original `docker-compose.yml` example was unrelated to the article topic and would not demonstrate init container behavior. I replaced it with a valid Kubernetes manifest that uses `initContainers` and a shared `emptyDir` volume, following the Kubernetes documentation pattern.

4. **The CLI examples were for Docker, not Kubernetes**: Commands such as `docker inspect`, `docker stats`, and `docker exec` do not validate or troubleshoot Kubernetes init containers. I replaced them with relevant `kubectl get`, `kubectl describe`, and `kubectl logs` examples.

5. **The Portainer feature list described Docker container pages instead of Kubernetes application views**: The original feature list focused on the Docker container details UI. I updated it to match Portainer's Kubernetes application details, Events tab, YAML view, application container tools, and built-in `kubectl` shell.

6. **The troubleshooting section did not address actual init container failure modes**: The original problems covered container list visibility, Linux user permissions, and Docker resource limits. I replaced them with checks for `Init:0/1`, `Init:CrashLoopBackOff`, namespace selection, and init container completion state.

7. **The API example targeted Docker containers rather than this Kubernetes workflow**: The original example called `/api/endpoints/1/docker/containers/json`, which is Docker-specific and not useful for explaining Portainer-based init container deployment. I replaced it with a verified Portainer authentication example and an accurate description of the API's role.

8. **The post metadata was misleading**: The original metadata tagged the article with `Docker` even though the corrected workflow is Kubernetes-specific. I removed the misleading tag and clarified the description.

## Review Notes
- The example uses a Pod for simplicity. The same `initContainers` pattern also applies to controllers such as Deployments through `.spec.template.spec`.
- Direct YAML editing from the application details page is available in Portainer Business Edition only.
- The manifest example follows the official Kubernetes initialization tutorial pattern with a shared `emptyDir` volume. In production, image versions should be pinned according to local release and supply-chain policy.
