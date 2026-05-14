# Validation Summary: How to Use Flux CD with Humanitec Platform Orchestrator

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Humanitec Platform Orchestrator
- Humanitec Operator
- Humanitec CLI (`humctl`)
- Flux CD
- Kubernetes
- GitOps
- Score

## Sources Consulted
- Humanitec GitOps setup guide: https://developer.humanitec.com/app-humanitec-io/guides/platform-engineers/infrastructure-integration/set-up-gitops/
- Humanitec GitOps Cluster driver reference: https://developer.humanitec.com/app-humanitec-io/docs/integration-and-extensions/drivers/k8-drivers/gitops-cluster/
- Humanitec Operator overview and installation docs: https://developer.humanitec.com/app-humanitec-io/docs/integration-and-extensions/humanitec-operator/overview/ and https://developer.humanitec.com/app-humanitec-io/docs/integration-and-extensions/humanitec-operator/installation/
- Humanitec namespace Resource Definition examples: https://developer.humanitec.com/app-humanitec-io/examples/resource-definitions/echo-driver/namespace/
- Humanitec CLI cheat sheet and Score docs: https://developer.humanitec.com/app-humanitec-io/docs/platform-orchestrator/reference/cli-cheat-sheet/ and https://developer.humanitec.com/app-humanitec-io/docs/score/overview/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Alert and Provider documentation: https://fluxcd.io/flux/components/notification/alerts/ and https://fluxcd.io/flux/components/notification/providers/

## Issues Found
- The post described Humanitec as generating plain Kubernetes manifests directly for Flux. Current Humanitec GitOps mode writes Humanitec CRs to Git, Flux applies those CRs, and the Humanitec Operator processes them. Updated the architecture, explanations, and summary.
- The GitOps Resource Definition used an unsupported `config` resource with `humanitec/template`. Replaced it with a `k8s-cluster` Resource Definition using the documented `humanitec/k8s-cluster-git` driver and supported `url`, `branch`, `path`, `username`, and credential fields.
- The Git credential command used unsupported `humctl create secret` syntax for this use case. Replaced it with `humctl apply -f` for the Resource Definition.
- The setup installed the Humanitec Agent with incorrect Helm values for GitOps mode. Replaced it with the Humanitec Operator installed from the documented OCI chart source.
- Flux Kustomization health checks used `name: "*"`, which is not valid for `.spec.healthChecks`. Removed the wildcard health checks and clarified namespace and pruning behavior.
- Flux pruning was enabled for Humanitec CRs. Humanitec docs warn that deleting synced CRs can delete real resources, so the examples now use `prune: false` for Humanitec CR syncs.
- The namespace Resource Definition generated a namespace manifest in a way that did not match the GitOps namespace responsibilities. Replaced it with the documented Echo Driver pattern for externally managed namespaces.
- The workload Resource Definition attempted to generate a Kubernetes Deployment as a `workload` resource. Replaced it with a Score workload example, which is the documented path for deploying workloads through Humanitec.
- The notification manifests used `notification.toolkit.fluxcd.io/v1` for Provider and Alert and pointed to a non-documented Humanitec inbound Flux endpoint. Updated to Flux's documented `v1beta3` Provider/Alert API and changed the example to use an external bridge service.
- Several `humctl` examples used incorrect command names, including deployment triggering and deployment error lookup. Updated them to documented `humctl score deploy`, `humctl get deploy .`, and `humctl get deploy-error` forms.

## Review Notes
The post is now technically aligned with the Humanitec Orchestrator v1 GitOps flow and current Flux APIs. In a production setup, teams should pin Helm chart versions, create target namespaces explicitly before Flux applies Humanitec CRs, and decide carefully whether `prune: false` matches their resource lifecycle and rollback policies.
