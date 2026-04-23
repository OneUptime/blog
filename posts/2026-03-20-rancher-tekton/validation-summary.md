# Validation Summary: How to Set Up Tekton Pipelines with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Tekton Pipelines
- Tekton Triggers
- Tekton Dashboard
- Tekton CLI (`tkn`)
- Kaniko

## Sources Consulted
- Tekton Pipelines installation docs: https://tekton.dev/vault/pipelines-main/install/
- Tekton Dashboard installation docs: https://tekton.dev/vault/dashboard-v0.60.x-lts/install/
- Tekton CLI docs: https://tekton.dev/docs/cli/
- Tekton Tasks docs: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton build-and-push guide with Kaniko: https://tekton.dev/docs/how-to-guides/kaniko-build-push/
- Tekton Triggers getting started guide: https://tekton.dev/docs/getting-started/triggers/
- Tekton EventListeners docs: https://tekton.dev/vault/triggers-main/eventlisteners/
- Tekton Triggers and TriggerTemplate docs: https://tekton.dev/docs/triggers/triggers/ and https://tekton.dev/docs/triggers/triggertemplates/
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Secrets docs: https://kubernetes.io/docs/concepts/configuration/secret/
- Rancher kubeconfig access docs: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig

## Issues Found
- The Tekton Pipelines installation command used an older release URL. I updated it to the current official Pipelines install endpoint from Tekton's install docs.
- The Triggers installation was incomplete for the later GitHub interceptor example because it omitted `interceptors.yaml`. I added the missing install command.
- The readiness and dashboard access commands were inaccurate. I replaced the single deployment wait with the official pod watch command and corrected the dashboard port-forward namespace to `tekton-pipelines`.
- The `kubectl-deploy` Task was internally inconsistent: it declared a required `cluster-url` param that the Pipeline never passed, and it base64-decoded Secret data even though Kubernetes exposes Secret keys to env vars as decoded values. I removed the unused required param, wrote the kubeconfig directly, and made the Deployment container name configurable.
- The webhook trigger example referenced undeclared resources and omitted the service account/RBAC needed for an `EventListener` to create `PipelineRun` objects. I replaced it with a complete example that includes the required RBAC, inline bindings, and an embedded TriggerTemplate.
- The prerequisites did not match the current Tekton install requirements or the example manifests. I added the Kubernetes version requirement, cluster-admin access, and the required Secrets used by the sample Tasks.

## Review Notes
- Tekton's current Pipelines installation docs describe the latest-release manifest as a quick-start path and recommend the Tekton Operator for production installation, upgrade, and lifecycle management.
- The EventListener RBAC example assumes the resources are applied in the `default` namespace. If a different namespace is used, the `ClusterRoleBinding` subject namespace should be updated to match.
- The example Tasks still use `latest` image tags. That is acceptable for a tutorial, but pinning versions would be better for reproducibility.
