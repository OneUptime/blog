# Validation Summary: How to Use kubectl Plugins with Krew Package Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl plugins
- Krew
- kubectx / kubens
- kube-capacity / resource-capacity
- kubectl-view-utilization
- kubectl-neat
- kubectl-tree
- rbac-tool
- kube-score
- ksniff
- net-forward
- Starboard
- Kubecost / OpenCost kubectl-cost

## Sources Consulted
- Krew installation documentation: https://krew.sigs.k8s.io/docs/user-guide/setup/install/
- Krew quickstart, plugin discovery, installation, upgrade, custom index, and listing documentation: https://krew.sigs.k8s.io/docs/
- Kubernetes kubectl plugin documentation: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
- Kubernetes kubectl plugin reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_plugin/
- Krew default plugin index manifests: https://github.com/kubernetes-sigs/krew-index/tree/master/plugins
- kubectx / kubens documentation: https://github.com/ahmetb/kubectx
- kube-capacity documentation: https://github.com/robscott/kube-capacity
- kubectl-view-utilization documentation: https://github.com/etopeter/kubectl-view-utilization
- kubectl-neat documentation: https://github.com/itaysk/kubectl-neat
- kubectl-tree documentation: https://github.com/ahmetb/kubectl-tree
- rbac-tool documentation: https://github.com/alcideio/rbac-tool
- kube-score documentation: https://github.com/zegl/kube-score
- ksniff documentation: https://github.com/eldadru/ksniff
- net-forward documentation: https://github.com/antitree/krew-net-forward
- Starboard CLI documentation: https://aquasecurity.github.io/starboard/v0.10.0/cli/getting-started/
- kubectl-cost documentation: https://github.com/kubecost/kubectl-cost

## Issues Found
- Changed "official package manager" wording to "SIG CLI community-maintained" because Kubernetes documentation describes Krew as a SIG CLI community-maintained plugin manager/subproject.
- Removed the claim that Krew handles plugin dependencies. Krew installs, updates, and removes plugins, but external dependencies are listed as caveats and may need separate installation.
- Added a metrics-server caveat for utilization output from resource-capacity, because kube-capacity utilization data depends on metrics-server.
- Replaced the unsupported `kubectl tree ... --events` example with a documented `--resources` example.
- Corrected `rbac-tool lookup` comments to describe role binding lookup, and added `policy-rules` for permission rule inspection.
- Replaced invalid live-object `kubectl score pod ...` examples with documented kube-score manifest analysis examples.
- Replaced the incorrect `net-forward` pod-style forwarding example with documented `-i`, `-p`, and `-l` endpoint forwarding examples.
- Replaced nonexistent `scan` plugin examples with Starboard examples from the current Krew index and Starboard CLI documentation.
- Corrected the Kubecost examples and explanation to note that `kubectl cost` queries Kubecost/OpenCost APIs rather than estimating directly from node types.
- Replaced the invalid `https://krew.sigs.k8s.io/install` CI install URL with the official Krew Linux/macOS installation command.
- Replaced invalid `kubectl score deployment app` CI usage with `kubectl score score deployment.yaml`.
- Removed invalid `kubectl krew info plugin-name -o yaml`; current `krew info` does not support `-o yaml`.
- Clarified that Krew curates plugin manifests, not plugin source code or binaries.

## Review Notes
The post is now technically valid for the referenced tools as of 2026-06-04. Some plugins, such as Starboard and kubectl-neat, are older or unmaintained upstream but remain present in the Krew index; future updates could choose more actively maintained alternatives, but that would be an editorial update rather than a correctness fix.
