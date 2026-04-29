# Validation Summary: How to Troubleshoot Kubewarden Policy Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes
- `kubectl`
- `kwctl`
- Admission webhooks
- WebAssembly-based policy enforcement

## Sources Consulted
- Kubewarden Quick Start: https://docs.kubewarden.io/quick-start
- Kubewarden CRD Reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden `kwctl` CLI Reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden Policy Evaluation Timeout: https://docs.kubewarden.io/reference/policy-evaluation-timeout
- Kubewarden Emergency Disable: https://docs.kubewarden.io/1.24/howtos/emergency-disable
- Kubewarden Testing for Policy Authors: https://docs.kubewarden.io/tutorials/testing-policies/policy-authors
- Kubewarden PolicyServer Production Configuration: https://docs.kubewarden.io/1.25/howtos/policy-servers/production-deployments
- Official Kubewarden `container-resources-policy` repository: https://github.com/kubewarden/container-resources-policy
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes memory troubleshooting task: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/

## Issues Found
- The post used `kwctl validate-settings`, which is not present in the current `kwctl` CLI. I replaced it with a current `kwctl run`-based validation flow using a generated admission request, because that matches the current official CLI reference.
- The Wasm accessibility check treated an OCI policy reference as if it were a directly fetchable HTTP URL via `wget`. I replaced that with `kwctl pull` plus PolicyServer log inspection, because Kubewarden policy modules are OCI artifacts and are pulled through Kubewarden tooling rather than fetched as plain URLs.
- Several log commands relied on outdated or less reliable selectors such as `app=kubewarden-controller` and `app=kubewarden-policy-server-default`. I changed them to current resource-based or documented label-based lookups such as `deployment/kubewarden-controller` and `kubewarden/policy-server=default`.
- The activation symptom was described as `PolicyActive: False`, but the current Kubewarden docs document policy lifecycle in terms of `unscheduled`, `scheduled`, `pending`, and `active`. I updated the symptom to the documented `pending` status.
- The webhook configuration example used `clusterwide-my-policy.kubewarden.admission` as the `ValidatingWebhookConfiguration` resource name. I corrected this to `clusterwide-my-policy`, because the `.kubewarden.admission` suffix is the webhook name shown in denial messages, not the Kubernetes resource name.
- The denial tracing section claimed a generic webhook-name format that did not match the documented cluster-wide example. I changed it to the documented `clusterwide-<policy-name>.kubewarden.admission` pattern for `ClusterAdmissionPolicy` examples.
- The local admission-request construction was handwritten. I replaced it with `kwctl scaffold admission-request`, which is a current official `kwctl` command specifically intended for this purpose.
- The performance section checked `reason=OOMKilled` via Events, which is not a reliable Kubernetes Event-based diagnostic for OOM restarts. I replaced it with Pod description inspection targeting `OOMKilled`, which aligns with Kubernetes troubleshooting guidance.
- The PolicyServer resource patch used a nonexistent `spec.resources` shape. I corrected it to the documented `spec.limits` and `spec.requests` fields from the Kubewarden CRD and production-deployment docs.
- The emergency recovery workflow deleted only validating webhooks and left the controller running, which could cause immediate reconciliation. I corrected it to the documented emergency-disable flow: scale down the controller first, delete both validating and mutating webhook configurations by label, then restore the controller.
- Multiple `PolicyServer` commands omitted the Kubewarden namespace. I added `-n kubewarden` where needed so the commands align with a standard Helm-based Kubewarden installation.
- The “recent policy events” command filtered on `reason=PolicyViolation`, which is not documented as a standard Kubewarden troubleshooting event pattern. I replaced it with a namespace-scoped recent-events view that is technically safe and current.

## Review Notes
- `kubectl top` requires Metrics Server or another metrics pipeline that serves the Kubernetes Metrics API. The command itself is correct, but it will fail on clusters without metrics support.
- Example policy image tags in Kubewarden documentation can age over time. The corrected post now avoids the most clearly outdated or invalid examples, but policy URIs should still be revalidated periodically against current Kubewarden releases.
