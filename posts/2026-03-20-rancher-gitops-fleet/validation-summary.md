# Validation Summary: How to Set Up GitOps with Rancher and Fleet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- Helm
- Kustomize
- `kubectl`

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet Git repository contents documentation: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet Create a GitRepo Resource guide: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet Mapping to Downstream Clusters guide: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet Using Webhooks Instead of Polling guide: https://fleet.rancher.io/0.14/how-tos-for-users/webhook
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher Continuous Delivery feature docs: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery

## Issues Found
- The repository layout implied a Helm chart without `Chart.yaml` and used a Kustomize layout that did not match the later examples. I updated the tree so the Helm and Kustomize directories reflect valid Fleet bundle layouts.
- The basic `fleet.yaml` example used `targets:`. In Fleet bundle config, the correct field is `targetCustomizations:`. I corrected the field and changed the example to a valid per-target namespace override that works for the raw-manifest `deploy/` bundle shown in the post.
- The GitRepo example targeted only production clusters while the `fleet.yaml` example also described development customizations. I updated the `GitRepo` targets so the targeting and customization examples are consistent.
- The private repository secret examples created generic secrets without the required secret types. I added `kubernetes.io/basic-auth` and `kubernetes.io/ssh-auth`, and replaced the inline `known_hosts` placeholder with the documented `ssh-keyscan` workflow.
- The Helm example used `version` with a local chart path and referenced `values.yaml` explicitly even though Fleet always uses the chart’s own `values.yaml`. I removed the misleading version usage and kept the example focused on valid `values` and `valuesFrom` settings.
- The Kustomize example used `targets:` instead of `targetCustomizations:` and referenced `overlays/production` even though the repo tree used `prod`. I corrected both.
- The webhook section relied on `status.webhookURL`, which is not documented in the current Fleet CRD/status references or webhook guide. I replaced it with the documented approach: expose the `gitjob` service via Ingress, optionally disable polling, optionally add a webhook secret, and then configure the Git provider to call that endpoint.

## Review Notes
- Fleet bundle-level `targetCustomizations` do not replace `GitRepo.spec.targets`; they customize bundles for clusters that the `GitRepo` already targets.
- Fleet uses polling by default every 15 seconds. When webhooks are configured, Fleet documents that polling automatically adjusts to one hour unless polling is explicitly disabled.
- Rancher still ships Fleet as its GitOps engine, and in current Rancher docs the continuous delivery integration is preinstalled, though it can be disabled with the `continuous-delivery` feature flag.
