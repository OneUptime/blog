# Validation Summary: How to Set Up Skaffold for Development on Rancher - Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skaffold
- Rancher
- Kubernetes
- kubectl
- Docker
- Cloud Native Buildpacks
- Helm
- Container registries

## Sources Consulted
- Skaffold install documentation: https://skaffold.dev/docs/install/
- Skaffold pipeline/configuration documentation: https://skaffold.dev/docs/design/config/
- Skaffold skaffold.yaml reference: https://skaffold.dev/docs/references/yaml/
- Skaffold raw YAML renderer documentation: https://skaffold.dev/docs/renderers/rawyaml/
- Skaffold kubectl deployer documentation: https://skaffold.dev/docs/deployers/kubectl/
- Skaffold local build documentation: https://skaffold.dev/docs/builders/build-environments/local/
- Skaffold tag policy documentation: https://skaffold.dev/docs/taggers/
- Skaffold profile documentation: https://skaffold.dev/docs/environment/profiles/
- Skaffold CLI reference: https://skaffold.dev/docs/references/cli/
- Skaffold port-forwarding documentation: https://skaffold.dev/docs/port-forwarding/
- Rancher kubeconfig/kubectl access documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Latest stable Skaffold binary from https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64, validated locally as v2.18.3 with `skaffold diagnose` and `skaffold schema list`.

## Issues Found
- The main Skaffold config used `apiVersion: skaffold/v4beta6`, while the current Skaffold schema is `skaffold/v4beta13`. Updated the example to `skaffold/v4beta13`.
- `tagPolicy` was shown as a top-level field, which is invalid in the current schema. Moved it under `build.tagPolicy`.
- The `sha256` tag policy comment implied images are tagged with a content hash. Skaffold's `sha256` tagger uses digest-based image references after push, so the comment was corrected.
- Raw Kubernetes manifests were configured under `deploy.kubectl.manifests`, which is not valid in the current Skaffold schema. Moved them to `manifests.rawYaml` and changed `deploy.kubectl` to `{}`.
- The example set `build.local.push: false` even though the post targets a Rancher-managed cluster that needs to pull images from a registry. Changed it to `true`.
- The Deployment image snippet placed `containers` directly under `spec`, which is not the Deployment pod-template path. Updated it to `spec.template.spec.containers`.
- The development profile used the removed `deploy.kubectl.manifests` shape. Changed it to override `manifests.rawYaml`.
- The production profile added Helm deployment on top of the base kubectl deployer. Changed it to use JSON patches that replace `manifests` and `deploy`, so the production profile deploys with Helm only.
- The Linux install command downloaded the amd64 binary under a generic Linux label. Clarified the label as Linux x86_64 (amd64).

## Review Notes
The corrected Skaffold example was validated with `skaffold diagnose` for the default, production, and development profiles. No live Rancher cluster, registry push, or manifest application was performed because the kubeconfig, registry, chart, and manifest paths are placeholders in the tutorial.
