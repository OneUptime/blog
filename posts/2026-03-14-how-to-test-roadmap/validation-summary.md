# Validation Summary: Testing Cilium Roadmap Features

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- kind
- Helm
- kubectl

## Sources Consulted
- Cilium documentation: Installation Using Kind, https://docs.cilium.io/en/stable/installation/kind/
- Cilium command reference: `cilium install`, https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium command reference: `cilium connectivity test`, https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Helm chart repository, https://helm.cilium.io/
- Helm documentation: `helm repo add`, https://helm.sh/docs/helm/helm_repo_add/
- Helm documentation: `helm search repo`, https://helm.sh/docs/helm/helm_search_repo/
- Kubernetes documentation: `kubectl expose`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The kind configuration mounted `/opt/images` from the host even though the post did not use that mount. This can make `kind create cluster` fail on systems where the host path does not exist, so the unused `extraMounts` block was removed.
- The Cilium install examples used `v1.17.0-rc.1` / `1.17.0-rc.1` as an upcoming pre-release. The Cilium chart repository currently lists newer pre-release charts, so the examples were updated to `v1.20.0-pre.2` for the Cilium CLI and `1.20.0-pre.2` for Helm.
- The Helm example searched and installed `cilium/cilium` without first adding the Cilium Helm repository. Added `helm repo add cilium https://helm.cilium.io/` before `helm repo update`.
- The Helm install example used `helm install`, which fails if the release was already installed by the previous Cilium CLI example. Changed it to `helm upgrade --install` so it works for both first install and update testing.
- The kind-based Cilium install examples omitted `ipam.mode=kubernetes`. Cilium's kind installation guide sets this Helm value, so it was added to both Cilium CLI and Helm examples.

## Review Notes
- `cilium install --set`, `cilium connectivity test`, `helm search repo --versions --devel`, `kubectl create deployment`, `kubectl expose deployment`, and the curl test pod command are valid command patterns.
- The post remains high-level and does not identify specific roadmap features or feature flags beyond debug mode. That is not technically incorrect, but future revisions would be more useful if they linked each tested feature to the relevant Cilium release notes or roadmap issue.
