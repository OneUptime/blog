# Validation Summary: How to Align Knative Startup Probes with the Revision Progress Deadline

## Status
validated

## Post Type
Technical troubleshooting guide with a Knative Service YAML example and kubectl diagnostic commands.

## Technologies Covered
- Knative Serving: Services, Revisions, queue-proxy, progress deadlines, and initial scaling.
- Kubernetes: startup, readiness, and liveness probes; container lifecycle and pod events.
- kubectl and YAML configuration.

## Sources Consulted
- [Knative: Configuring probes](https://knative.dev/docs/serving/services/configure-probing/), including the progress-deadline section and readiness-probe rewriting.
- [Knative: Configure Deployment resources](https://knative.dev/docs/serving/configuration/deployment/#configuring-progress-deadlines), including the per-Revision annotation and global configuration.
- [Knative: About Revisions](https://knative.dev/docs/serving/revisions/).
- [Kubernetes: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/).
- [Kubernetes: kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/).
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/).

## Issues Found
- The endpoint description said `/live` should succeed when restarting a stuck process would help. Reversed this guidance: the endpoint succeeds while healthy and fails when stuck, because failed liveness probes trigger restarts.
- The Kubernetes startup-gating explanation needed a Knative-specific qualification. Added that queue-proxy executes rewritten application readiness probes and that `/ready` must remain unsuccessful until initialization completes. Kubelet startup gating must not be assumed to gate those independent checks.

## Review Notes
- Confirmed the `serving.knative.dev/v1` Service structure, HTTP probe fields, port values, and annotation placement under `spec.template.metadata.annotations` against official examples. `12m` is a valid duration; 96 checks at a five-second period give an approximate 480-second budget, not an exact rollout deadline.
- Confirmed that the per-Revision annotation overrides the installation default and that failure to achieve initial scale can fail the Revision. Scheduling and image availability must be considered alongside application startup.
- Checked the namespace, label-selector, YAML-output, container-selection, and timestamp options used by the diagnostic commands. The sample image and pod name are intentional placeholders; the namespace, image, and application endpoints must exist in the target environment.
- Revision list output alone does not expose all condition timestamps. Detailed Revision YAML or describe output and application instrumentation can help reconstruct the timeline; successful probes are not necessarily recorded as pod events.
- The post does not pin software versions. Consult the installed Knative release documentation when applying this guidance to older clusters. The initial rollout deadline is not a guarantee of successful request handling after scale-to-zero; the recommended cold-start request test remains useful.
- The linked technical documentation pages and section anchors resolve to the intended resources. No deprecated API or command was identified in the examples.
- This was a documentation and static configuration review. No workload was deployed and no live cluster timing or endpoint behavior was tested.
