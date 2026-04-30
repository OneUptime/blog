# Validation Summary: How to Configure Fleet Rollout Strategies

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Fleet
- Rancher
- Kubernetes
- GitOps
- Helm
- kubectl

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet GitRepo creation and private repository authentication: https://fleet.rancher.io/how-tos-for-users/gitrepo-add
- Fleet rollout strategy documentation: https://fleet.rancher.io/how-tos-for-users/rollout
- Fleet namespaces: https://fleet.rancher.io/namespaces
- Fleet deployed resources reference: https://fleet.rancher.io/reference/ref-resources

## Issues Found
- The repository structure example showed raw YAML and overlay files, but the `fleet.yaml` example was configured as a Helm bundle with `helm.chart: ./chart`. I updated the directory tree to a chart-based layout so the file structure matches the Fleet configuration.
- The post was titled as a rollout-strategy guide, but the main `fleet.yaml` example did not include a valid `rolloutStrategy`. I added a documented `rolloutStrategy` example with ordered partitions for `staging` and `production`.
- The bundle inspection command assumed the Bundle name would be exactly `my-app-gitops`. Fleet generates Bundle names from the GitRepo name and bundle path unless `fleet.yaml` sets `name`, so I changed the command to use a placeholder and clarified the naming behavior.
- The private Git authentication examples created generic secrets without the documented secret types. I updated the HTTPS example to use `kubernetes.io/basic-auth` and the SSH example to use `kubernetes.io/ssh-auth`, and I changed `ssh-keyscan` to `ssh-keyscan -H` to match Fleet’s known-hosts guidance.
- The troubleshooting section used a force-sync annotation example. I replaced it with the documented `spec.forceSyncGeneration` approach from the GitRepo resource reference.
- The troubleshooting custom-columns example labeled `.metadata.namespace` as `CLUSTER`, which is inaccurate for `BundleDeployment` output. I renamed the column to `CLUSTER_NAMESPACE`.
- The Step 1 pod expectations implied `fleet-agent` is always a management-cluster pod in `cattle-fleet-system`. I clarified that `fleet-controller` and `gitjob` are the management-cluster pods and that `fleet-agent` runs on managed clusters.

## Review Notes
- The post is written for a multi-cluster Rancher Fleet workspace using `fleet-default`. For single-cluster usage, Fleet documentation points users to `fleet-local` instead.
- `kubectl` is not installed in this workspace, so CLI help output could not be verified locally. Command syntax was checked against the official Fleet documentation instead.
