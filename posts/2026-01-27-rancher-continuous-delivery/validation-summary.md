# Validation Summary: How to Use Rancher Continuous Delivery

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Rancher Continuous Delivery
- Fleet
- GitOps
- Kubernetes custom resources
- Helm
- Kustomize
- Prometheus Operator alerting
- OneUptime observability

## Sources Consulted
- Rancher Manager Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Create a GitRepo Resource guide: https://fleet.rancher.io/how-tos-for-users/gitrepo-add
- Fleet Mapping to Downstream Clusters guide: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet fleet.yaml reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Custom Resources spec: https://documentation.suse.com/cloudnative/continuous-delivery/next/en/reference/ref-crds.html
- Fleet Observability guide: https://fleet.rancher.io/how-tos-for-users/observability
- Fleet Rollout Strategy guide: https://fleet.rancher.io/0.12/how-tos-for-users/rollout

## Issues Found
- The Rancher UI navigation path was inaccurate. Changed it to the documented Continuous Delivery menu entry.
- Several `GitRepo.spec.paths` examples used leading slashes. Updated them to relative paths matching Fleet examples.
- The private Git repository secret used `type: Opaque` and `known-hosts`. Fleet documents `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`, with SSH known hosts stored as `known_hosts`; the snippet was corrected.
- The raw YAML overlay example embedded inline patch content under `yaml.overlays`, but Fleet expects overlay names that map to files under `overlays/<name>/`. Updated the example to reference the overlay by name.
- Helm timeout examples used `timeout: 10m` and `timeout: 15m`. Fleet's documented field is `helm.timeoutSeconds`, so both examples were corrected to integer seconds.
- The rollout strategy example used a non-existent `maxConcurrent` field and described `autoPartitionSize` as auto-pausing on errors. Removed `maxConcurrent` and corrected the `autoPartitionSize` description.
- The progressive delivery GitRepo example implied target ordering by itself. Clarified that rollout ordering requires `rolloutStrategy` partitions in `fleet.yaml`.
- The Prometheus alert used undocumented Fleet metric names. Replaced it with an alert based on documented controller-runtime metrics exposed by Fleet.

## Review Notes
The post is technically relevant and broadly consistent with Rancher/Fleet documentation after the fixes. Some examples remain illustrative and assume the user's chart exposes matching values such as `serviceMonitor`, `livenessProbe`, and `readinessProbe`.
