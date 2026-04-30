# Validation Summary: How to Troubleshoot Fleet Deployment Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- kubectl
- GitOps
- GitHub REST API

## Sources Consulted
- Fleet troubleshooting guide: https://fleet.rancher.io/troubleshooting
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet custom resources spec: https://fleet.rancher.io/reference/ref-crds
- Fleet bundle resource reference: https://fleet.rancher.io/reference/ref-bundle
- Fleet source repository: https://github.com/rancher/fleet
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- GitHub REST authentication docs: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api

## Issues Found
- The GitRepo status inspection command assumed `.status.conditions[0]` held the relevant status. I changed it to use Fleet's documented `status.display.state` and `status.display.message` fields, which are intended for human-readable status output.
- The BundleDeployment failure command referenced `.status.message`, which is not a BundleDeployment status field in Fleet. I changed it to use `status.display.state` for listing failures and the `Ready` condition message for detailed error output.
- The Fleet controller log commands omitted a container name even though the current Fleet controller deployment is multi-container. I added `-c fleet-controller` so the commands work against current chart manifests.
- The Git authentication section relied on a `FailedSync` event reason that is not documented or implemented as a stable Fleet event reason. I replaced it with checks against the GitRepo `Ready` condition and gitjob controller logs.
- The GitHub API authentication example used basic auth syntax. I updated it to the current bearer-token style shown in GitHub's REST API docs.
- The `failed to parse` resolution used an incomplete `kubectl apply --dry-run` example. I corrected it to `kubectl apply --dry-run=server`.
- The "what Fleet is actually applying" command looked for a `Raw Resources:` block in `kubectl describe bundle` output. I replaced it with `kubectl get bundle ... -o yaml`, which exposes the Bundle spec/resources directly.
- The manual resync guidance used a `fleet.cattle.io/commit` annotation on the GitRepo, which is not the supported resync mechanism. I replaced it with a `spec.forceSyncGeneration` patch, which is the documented Fleet field for forced redeployments.
- The "stuck gitjob" example used the wrong namespace and an unsupported label selector for Git jobs. I corrected the namespace guidance and switched the retry action to the supported `forceSyncGeneration` resync flow.

## Review Notes
- The post remains technically useful after the corrections. A future improvement would be to note that BundleDeployments live in generated cluster namespaces, so readers should expect namespace names that follow Fleet's cluster-namespace pattern rather than a fixed namespace value.
- The `kubeval` example is still usable as an optional external validator, but it is not part of Kubernetes or Fleet itself. The `kubectl apply --dry-run=server` check is the more authoritative validation step for current clusters.
