# Validation Summary: How to Restrict Public Repository Usage in Portainer - Repo Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Hub
- Kubernetes
- kubectl
- OPA Gatekeeper
- Sigstore policy-controller

## Sources Consulted
- Portainer registries documentation: https://docs.portainer.io/admin/registries
- Portainer Docker host registry access documentation: https://docs.portainer.io/user/docker/host/registries
- Portainer Docker, Swarm, or Podman registry policy documentation: https://docs.portainer.io/admin/environments/policies/docker-policies/registry-policy
- Portainer Kubernetes registry policy documentation: https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-registry-policy
- Docker Engine `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker image reference documentation: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Hub usage and limits: https://docs.docker.com/docker-hub/usage/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper Library allowed images policy: https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedreposv2/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes list container images task: https://kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/
- Sigstore policy-controller overview: https://docs.sigstore.dev/policy-controller/overview/

## Issues Found
- Corrected the description because Portainer cannot universally prevent public registry pulls in every environment. The description now says the post covers limiting users to approved registries and enforcing image-source policy where supported.
- Replaced the inaccurate "Disable Public Registries" Portainer steps with the documented **Hide for all users** action for Docker Hub (anonymous), including the caveat that this hides the UI option but does not fully disable Docker Hub access.
- Replaced nonexistent environment security toggles with documented environment registry access management via **Host > Registries** or **Swarm > Registries** and **Manage access**.
- Replaced the vague environment security method with current Portainer Business Edition registry policies, including the Edge (Standard) Agent 2.37.0+ scope and Kubernetes 1.30+ requirement for **Restrict to allowed sources**.
- Removed the invalid `/etc/docker/daemon.json` example. Docker Engine supports `registry-mirrors` and `insecure-registries`, but not `blocked-registries` or a daemon-level registry allow-list.
- Updated the Gatekeeper `ConstraintTemplate` from `templates.gatekeeper.sh/v1beta1` to `templates.gatekeeper.sh/v1` and added the required structural `openAPIV3Schema` with `type: object`.
- Updated the Gatekeeper Rego to check regular containers, init containers, and ephemeral containers, and changed allowed prefixes to include trailing slashes to avoid matching lookalike hostnames.
- Fixed the Docker and Kubernetes audit commands so they extract registry hosts, normalize unqualified image references to `docker.io`, and include init and ephemeral container images for Kubernetes.
- Reworded the conclusion from generic "Cosign policies" to Sigstore policy-controller checks, because Cosign signs and verifies artifacts while policy-controller is the Kubernetes admission enforcement component.

## Review Notes
Docker, kubectl, and OPA were not installed in the local environment, so those snippets were reviewed statically against official documentation. The registry-parsing `awk` logic was tested locally with representative image references.
