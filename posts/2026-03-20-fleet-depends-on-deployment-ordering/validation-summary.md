# Validation Summary: How to Configure Fleet Depends-On for Deployment Ordering

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- `kubectl`
- GitOps

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Git repository contents explanation: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet source for `BundleRef` and `BundleSpec`: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundle_types.go
- Fleet source for `FleetYAML`: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/fleetyaml.go
- Fleet source for GitRepo force sync fields: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source for dependency resolution behavior: https://github.com/rancher/fleet/blob/main/internal/cmd/agent/deployer/deployer.go
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described `dependsOn` as if Fleet only checked `status.summary.ready == status.summary.desiredReady` and rejected `Modified` states outright. I corrected this to match current Fleet behavior: dependencies are evaluated against accepted states, defaulting to `Ready`, with optional `acceptedStates` support.
- Every `dependsOn` example included `namespace: fleet-default` under each dependency item. Fleet's documented `BundleRef` does not support a `namespace` field, so I removed those fields.
- The cross-GitRepo dependency section implied broader namespace selection than Fleet supports for name-based dependencies. I clarified that the example applies within the same Fleet workspace namespace.
- The dependency inspection command grepped `kubectl describe` output for `Waiting`, which does not reliably reflect dependency failures. I replaced it with a `jsonpath` query against `.status.summary.nonReadyResources`.
- The troubleshooting command for verifying a dependency bundle was too generic. I changed it to query `.status.display.state` directly so it actually confirms readiness state.
- The naming note was incomplete. I updated it to reflect that bundle names can be overridden with `name` in `fleet.yaml` and long generated names are truncated with a hash suffix.
- The manual resync example used `kubectl annotate gitrepo ... fleet.cattle.io/commit=""`, which is not the current Fleet mechanism for forcing a redeploy. I replaced it with a `kubectl patch` example that updates `spec.forceSyncGeneration`.

## Review Notes
- The examples assume a Fleet workspace such as `fleet-default`. In single-cluster setups, Fleet commonly uses `fleet-local` instead.
- The `forceSyncGeneration` example now increments the current value automatically, which is the safe pattern for repeated manual resyncs.
