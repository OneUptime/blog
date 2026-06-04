# Validation Summary: How to use Linux capabilities to grant minimal privileges to containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux capabilities
- Kubernetes Pods and securityContext
- Kubernetes Pod Security Standards
- Docker container capability flags
- Open Policy Agent / Rego
- Nginx containers
- PostgreSQL containers

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes API reference: Pod v1 / SecurityContext - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Linux man-pages: capabilities(7) - https://man7.org/linux/man-pages/man7/capabilities.7.html
- Docker documentation: Running containers / runtime privilege and Linux capabilities - https://docs.docker.com/engine/containers/run/
- Docker CLI reference: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Open Policy Agent documentation: Kubernetes admission control policy primer - https://www.openpolicyagent.org/docs/kubernetes/primer
- Open Policy Agent documentation: Rego `if` keyword and v1 syntax - https://www.openpolicyagent.org/docs/policy-reference/keywords/if

## Issues Found
- The introduction implied containers either run as root with all privileges or non-root with none. Docker's documentation distinguishes privileged containers from normal containers, and Kubernetes/Docker normally apply a runtime-defined capability set. Updated the wording to refer to the runtime default capability set and explicitly added privileges.
- The Nginx section claimed to show running non-root "with capabilities," but the Dockerfile changes Nginx to listen on port 8080 and the Pod drops all capabilities. Updated the section title and explanation to match the no-capabilities configuration.
- The Pod Security Standards Baseline description was inaccurate. Kubernetes Baseline does not allow arbitrary capabilities except privilege-escalating ones; it restricts added capabilities to an allowed list. Updated the description.
- The OPA policy snippet used pre-OPA-v1 Rego syntax and was fenced as YAML. Updated it to current Rego syntax with `import rego.v1`, `deny contains msg if`, robust `object.get` lookups, and a `rego` code fence.

## Review Notes
- The Kubernetes securityContext examples use valid current fields for Linux containers and correctly omit the `CAP_` prefix in capability names, as required by Kubernetes manifests.
- The Docker `--cap-drop=ALL` and `--cap-add=NET_BIND_SERVICE` examples use valid Docker flags.
- I could not run a local `opa` parse check because the `opa` binary is not installed in this workspace.
