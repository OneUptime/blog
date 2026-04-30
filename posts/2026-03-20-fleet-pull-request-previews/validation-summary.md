# Validation Summary: How to Set Up Fleet with Pull Request Previews

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- Helm
- Fleet `GitRepo`, `Bundle`, `BundleDeployment`, and `ClusterGroup` resources

## Sources Consulted
- Rancher Continuous Delivery with Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents guide: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet troubleshooting guide: https://fleet.rancher.io/troubleshooting
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet deployment tutorial: https://fleet.rancher.io/tutorials/tut-deployment

## Issues Found
- The original title, description, and `Preview-Environments` tag claimed pull request preview environments, but the post only documented a standard multi-cluster Fleet deployment flow. I retitled the post and updated the metadata so it matches the implementation actually shown.
- The prerequisite `Rancher v2.6+` was outdated because Rancher v2.6 is now archived. I changed it to require Rancher with Continuous Delivery enabled and noted that Fleet comes preinstalled in Rancher.
- Step 1 implied the local Fleet agent runs in `cattle-fleet-system`. Current Fleet troubleshooting docs distinguish downstream cluster agents in `cattle-fleet-system` from the local cluster agent in `cattle-local-fleet-system`, so I corrected the verification example.
- The repository structure showed raw manifests and overlays, but the `fleet.yaml` example used an embedded Helm chart at `./chart`. I updated the tree so it includes `chart/`, `Chart.yaml`, `values.yaml`, and `templates/`, which makes the structure consistent with the Fleet configuration.
- The `fleet.yaml` example mixed a local chart path with `helm.version` and explicitly listed the chart's own `values.yaml` under `valuesFiles`. Fleet already uses a chart's `values.yaml` automatically, and `helm.version` is relevant to chart resolution rather than local chart defaults, so I removed both.
- The bundle inspection command used `kubectl describe bundle my-app-gitops`, but Fleet generates bundle names from `GitRepo.name + path` unless overridden. I changed it to `my-app-gitops-apps-my-app` to match Fleet's documented bundle naming behavior.
- The private Git authentication examples created generic `Opaque` secrets. Fleet requires `clientSecretName` secrets of type `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`, so I added the correct secret types and updated the SSH `known_hosts` example to use `ssh-keyscan -H`.
- The troubleshooting section used an undocumented `fleet.cattle.io/force-sync` annotation. Fleet documents `spec.forceSyncGeneration` for forcing redeployment, so I replaced that example with a `kubectl patch` command that increments `forceSyncGeneration`.

## Review Notes
- The post now documents a valid Fleet multi-cluster GitOps workflow, but it no longer covers pull request previews specifically.
- The `namespace: my-app` example is correct for namespaced resources such as a Deployment and Service. If the chart later includes cluster-scoped resources, Fleet will reject that configuration and `defaultNamespace` or a different bundle structure would be needed.
