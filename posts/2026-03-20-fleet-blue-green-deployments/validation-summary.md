# Validation Summary: How to Configure Fleet for Blue-Green Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- Helm
- GitOps
- kubectl

## Sources Consulted
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher Continuous Delivery feature flag docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery
- Fleet `GitRepo` resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository content docs: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet GitRepo creation docs: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet target mapping docs: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet troubleshooting docs: https://fleet.rancher.io/troubleshooting
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The title, tags, and description claimed the post was about blue-green deployments, but the content actually described multi-environment Fleet targeting and Helm value customization. I updated the metadata and supporting copy so the post now matches what it implements.
- The repository structure mixed raw manifests and Kustomize overlays with a Helm-based `fleet.yaml` example. I corrected the tree to show a Helm chart layout that matches `helm.chart: ./chart`.
- The Helm example explicitly referenced `valuesFiles: - values.yaml`, but Fleet automatically uses a chart's own `values.yaml`. I removed that line and clarified that base values come from the chart by default.
- The bundle-inspection command used `kubectl describe bundle my-app-gitops`, but the example `fleet.yaml` did not define a matching bundle name. I added `name: my-app-gitops` so the command is valid.
- The private Git authentication examples omitted the required Kubernetes secret types for Fleet-managed Git credentials. I added `kubernetes.io/basic-auth` for HTTPS and `kubernetes.io/ssh-auth` for SSH, and updated the `ssh-keyscan` example to use hashed host entries.
- The management-cluster verification step implied a `fleet-agent` pod in `cattle-fleet-system`, which does not match the current Rancher/Fleet troubleshooting guidance for downstream versus local agent locations. I narrowed the step to management-cluster controller pods and clarified the downstream-cluster prerequisite.
- The manual resync example used an annotation-based force sync. Current Fleet docs document `spec.forceSyncGeneration` for this purpose, so I replaced the command with a `kubectl patch ... --type merge` example.
- The troubleshooting custom-columns example labeled `.metadata.namespace` as `CLUSTER`, which was misleading because it prints the BundleDeployment namespace. I renamed the column to `NAMESPACE`.

## Review Notes
- The examples assume the Fleet `Cluster` resources in the workspace are labeled with values such as `env=staging` and `env=production`.
- The sample Helm values still use `image.tag: latest`. That is technically valid, but version-pinned image tags are usually preferable for reproducible promotions between environments.
- Fleet ships independently of Rancher, so exact behavior can vary slightly by bundled Fleet version. The corrected examples were aligned to the current official Fleet and Rancher documentation available on 2026-04-30.
