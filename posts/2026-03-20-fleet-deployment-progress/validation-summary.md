# Validation Summary: How to Monitor Fleet Deployment Progress

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- Helm
- kubectl

## Sources Consulted
- Fleet `GitRepo` reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents and bundle naming: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet target mapping: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet status fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet troubleshooting: https://fleet.rancher.io/troubleshooting
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher Continuous Delivery feature details: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Official Fleet source for current CRD/schema behavior: https://github.com/rancher/fleet

## Issues Found
- The repository structure showed raw YAML and overlays while the `fleet.yaml` example was configured for a Helm chart at `./chart`. I updated the structure example to show a real chart layout so it matches the configuration being described.
- The `helm.version` example was incorrect for a local chart path. Fleet documents `helm.version` as chart-version selection for downloaded charts, not a local chart directory, so I removed it.
- The `valuesFiles` example incorrectly suggested explicitly adding the chart's base `values.yaml`. Fleet already uses a chart's own `values.yaml` by default, so I removed that line.
- The bundle inspection command used `my-app-gitops` as if the Bundle name always matched the GitRepo name. Fleet generates Bundle names from the GitRepo name and path unless overridden, so I changed the command to use `<bundle-name>` and clarified why.
- The private Git authentication secrets were missing the required secret types. Fleet expects `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`, so I added the correct `--type` flags.
- The SSH example did not hash the `known_hosts` entry. I updated it to use `ssh-keyscan -H github.com`, which matches the Fleet documentation example.
- The troubleshooting command labeled the `BundleDeployment` namespace as `CLUSTER`, which was misleading. I replaced it with `kubectl get ... -L fleet.cattle.io/cluster-namespace,fleet.cattle.io/cluster` so it shows the actual Fleet target labels.
- The force-resync example used an annotation that is not the documented public mechanism. Fleet documents `spec.forceSyncGeneration` for forced redeploys, so I replaced the example with a `kubectl patch` command that updates that field.

## Review Notes
The post is written for a multi-cluster Rancher workspace and correctly uses `fleet-default` for that scenario. For single-cluster Fleet setups, the corresponding namespace is typically `fleet-local`.
