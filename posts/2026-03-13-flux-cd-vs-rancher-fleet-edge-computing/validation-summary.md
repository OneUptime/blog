# Validation Summary: Flux CD vs Rancher Fleet: Edge Computing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Rancher Fleet
- Kubernetes
- K3s
- MicroK8s
- GitOps
- Kustomize
- OCI artifacts

## Sources Consulted
- Flux `flux install` command reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Rancher Fleet architecture documentation: https://fleet.rancher.io/0.13/architecture
- Rancher Fleet GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Rancher Fleet cluster registration documentation: https://fleet.rancher.io/how-tos-for-operators/cluster-registration
- Rancher Fleet resource limits documentation: https://fleet.rancher.io/how-tos-for-operators/resource-limits

## Issues Found
- The Flux install command was fenced as `yaml` even though it is a shell command. Changed the code fence to `bash`.
- The post stated that Rancher Fleet requires hub-to-agent connectivity for edge clusters. Fleet's documented architecture is a two-stage pull model where the controller pulls Git and agents pull from the controller; after registration, the Fleet manager does not initiate connections to downstream clusters. Updated the wording to describe agent-to-hub communication and the distinction between agent-initiated and manager-initiated registration.
- The Fleet `pollingInterval` comment implied edge-side polling. In Fleet, this setting controls how often the Fleet controller checks the Git repository. Updated the comment accordingly.
- The network requirement table described Fleet as "Pull + hub registration", which was ambiguous and implied hub-to-edge access. Updated it to "Agent-to-hub API access after registration."
- The intermittent connectivity section said Fleet agents queue changes locally. Fleet documentation states agents are not assumed to have an always-on connection and resume operation when they reconnect. Updated the text to say existing workloads keep running and agents resume when they can reconnect.

## Review Notes
The Flux API versions and fields shown in the post are current: `source.toolkit.fluxcd.io/v1` `GitRepository`, `kustomize.toolkit.fluxcd.io/v1` `Kustomization`, `interval`, `timeout`, `retryInterval`, `sourceRef`, `prune`, and `suspend` are valid. Fleet's `GitRepo` `targets` and `pollingInterval` fields are also valid. The resource numbers are approximate operational estimates rather than guaranteed official defaults; Fleet documents configurable resource requests and limits rather than a single fixed agent footprint.
