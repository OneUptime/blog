# Validation Summary: How to Configure Init Containers in Kubernetes via Portainer - K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (Deployments, Pods, init containers, volumes, security contexts)
- Portainer (Kubernetes applications, manifest deployment, application inspection/logs)
- `kubectl`
- HashiCorp Vault Agent
- AWS CLI / Amazon S3

## Sources Consulted
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Security Context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Portainer Applications documentation: https://docs.portainer.io/user/kubernetes/applications
- Portainer Create an application from a Manifest documentation: https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer Inspect an application documentation: https://docs.portainer.io/user/kubernetes/applications/inspect
- Vault Agent documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent
- Vault CLI `agent` command reference: https://developer.hashicorp.com/vault/docs/commands/agent
- `groundnuty/k8s-wait-for` project README: https://github.com/groundnuty/k8s-wait-for

## Issues Found
1. **Invalid Deployment manifest.** The main Deployment example omitted `.spec.template.metadata.labels`, but in `apps/v1` Deployments the selector must match the pod template labels or the API rejects the manifest. Added the missing `app: web-app` label under the pod template.
2. **Broken multi-service wait example.** The original `groundnuty/k8s-wait-for` snippet passed multiple service names to a single invocation, but the tool's documented interface accepts a single resource name or selector per call. Replaced the snippet with a valid sequential init-container pattern that waits for PostgreSQL, Redis, and Kafka individually.
3. **Vault init container would block indefinitely.** `vault agent` runs in the foreground by default, so the init container would never complete and the subsequent `cp` command would not execute. Added `-exit-after-auth`, which is supported by the Vault CLI, so the init container can finish after authentication and template rendering.
4. **Portainer terminology and navigation were too imprecise.** Updated "YAML editor" to "web editor" and adjusted the log-viewing instructions to match Portainer's current Kubernetes Applications documentation more closely.

## Review Notes
- The post's explanation of init-container lifecycle is accurate: init containers run to completion, execute sequentially, and must all succeed before app containers start.
- The permission-fix example using a container-level `securityContext.runAsUser: 0` is valid, though in some workloads `fsGroup` may be a better fit than recursive `chown`.
- The revised multi-service wait example checks TCP reachability. That is a reasonable generic pattern, but service-specific health endpoints or readiness checks can be more reliable when simple port-open checks are not sufficient.
- The post still uses floating image tags such as `myapp:latest`, `amazon/aws-cli:latest`, and `hashicorp/vault:latest`. These are not technically incorrect, but pinning image versions would improve reproducibility.
