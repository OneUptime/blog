# Validation Summary: How to Probe Every User Container in a Knative Service with Sidecars

## Status
validated

## Post Type
Technical guide with configuration examples and diagnostic commands.

## Technologies Covered
- Knative Serving and Knative Operator
- Kubernetes multi-container Pods and shared networking
- HTTP readiness probes, liveness probes, and startup probes
- Knative queue-proxy and aggregated readiness
- YAML and kubectl

## Sources Consulted
- [Knative feature flags](https://knative.dev/docs/serving/configuration/feature-flags/#multiple-container-probing) — feature configuration, multiple containers, and multiple-container probing.
- [Configuring Knative using the Operator](https://knative.dev/docs/install/operator/configuring-with-operator/) — mapping `spec.config.features` to the `config-features` ConfigMap.
- [Knative probe configuration](https://knative.dev/docs/serving/services/configure-probing/) — HTTP probes on separate container ports, queue-proxy aggregation, networking readiness, and liveness handling.
- [Knative Revisions](https://knative.dev/docs/serving/revisions/) — configuration snapshots and creation of Revisions through configuration changes.
- [Knative Service CRD](https://raw.githubusercontent.com/knative/serving/main/config/core/300-resources/service.yaml) — served `v1` API, Service template structure, and `ksvc` short name.
- [Kubernetes probe guide](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — readiness versus liveness and startup behavior.
- [Kubernetes Pods](https://kubernetes.io/docs/concepts/workloads/pods/) — shared network namespace, IP address, and ports.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — Pod listing, label selectors, and namespace selection.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — Pod names and container selection with `-c`.
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) — resource and name syntax.
- [Author profile](https://github.com/nawazdhandala) — verified the post's author link redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. The two YAML examples use appropriate nesting and field types: the first is an intentional partial Operator resource configuration, and the second is a Knative Service using `serving.knative.dev/v1`.
- Both feature names and the enabled configuration agree with the Knative documentation. The existing instruction to check the installed release's defaults and supported fields remains appropriate; the post does not promise compatibility with every historical release.
- Exactly one user container declares the traffic port. The helper's numeric HTTP probe port can be used without a container `ports` entry, matching the official Knative example. Distinct listeners avoid collisions in the shared Pod network namespace.
- The queue-proxy aggregation explanation and the distinction between readiness and liveness are accurate for the HTTP probes shown. The diagram is a simplified representation; networking readiness is also required, as the surrounding prose states.
- The diagnostic commands use valid kubectl syntax, including `-n`, `-l`, `-c`, and the Knative `ksvc` resource alias. The post explicitly tells readers to substitute the actual Pod name.
- All external links in the post resolved to their intended resources. No deprecated API or command usage was identified.
- Validation was a documentation and static review, not a live cluster deployment. Running the example requires an existing `applications` namespace, a configured Knative installation, accessible replacement images, and working `/ready` handlers on the specified ports. The illustrative images do not establish runtime behavior; independent failure and recovery testing remains necessary as described in the post.
