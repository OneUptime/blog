# Validation Summary: How to Configure Rancher Desktop Allowed Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Allowed Images policy
- Deployment profiles
- Kubernetes
- `kubectl`
- `containerd`
- `nerdctl`
- Moby / Docker CLI

## Sources Consulted
- Rancher Desktop Docs: Allowed Images — https://docs.rancherdesktop.io/ui/preferences/container-engine/allowed-images/
- Rancher Desktop Docs: Deployment Profiles — https://docs.rancherdesktop.io/getting-started/deployment/
- Rancher Desktop Docs: Command Reference: rdctl — https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Docs: Installation — https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Docs: Working with Images — https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop Docs: Troubleshooting — https://docs.rancherdesktop.io/ui/troubleshooting/
- Kubernetes Docs: `kubectl create deployment` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment

## Issues Found
1. **The post content did not actually explain Rancher Desktop Allowed Images.** Most of the original article was a generic Rancher Desktop walkthrough covering containers, Kubernetes, and Helm without documenting the allowed-images feature named in the title. I rewrote the technical content to focus on the documented `Allowed Images` setting, supported pattern syntax, and deployment-profile workflow.

2. **The description overstated the feature as restricting images that can be "run locally."** Rancher Desktop documents Allowed Images as controlling registry artifacts that can be accessed while pulling or pushing. I corrected the description and surrounding copy to describe pull/push enforcement instead of implying a separate runtime execution control.

3. **Several `rdctl` commands and flags were outdated or incorrect.** The original post used commands such as `rdctl set --kubernetes-version`, `rdctl set --container-engine`, `rdctl factory-reset`, and `rdctl status`, and it grepped for a nonexistent `kubernetesVersion` field. I replaced these with currently documented commands and forms, including `rdctl list-settings`, `rdctl start --container-engine.name ...`, `rdctl shutdown`, and `rdctl create-profile`.

4. **The container, Kubernetes, and Helm examples were not aligned with an allow-list policy.** The original examples pulled arbitrary images like `nginx:latest`, deployed them, and installed a Helm chart without reference to the allow list. I replaced these with examples that use documented allow-list patterns, show a disallowed pull case, and use the Rancher Desktop-documented `k8s.io` namespace for `containerd` images intended for Kubernetes.

5. **The post omitted the documented deployment-profile format and locations needed to enforce the policy.** I added the official JSON structure for `containerEngine.allowedImages`, including the required `version` field, and documented the user-profile locations for Linux, macOS, and Windows.

6. **The troubleshooting section included undocumented or malformed log-path guidance.** The original Windows/Linux comment line was malformed, and the log-path claims were not backed by the current troubleshooting docs. I replaced that section with documented guidance to use `Troubleshooting > Show Logs`, verify loaded settings with `rdctl list-settings`, and restart Rancher Desktop after deployment-profile changes.

7. **The post missed an important limitation of the feature.** Rancher Desktop documents that tag-based filtering is not reliable on its own because matching digests may also need to be added to the allow list. I added that caveat.

## Review Notes
- Rancher Desktop's current docs still show some legacy `rdctl set` examples using older flag names, while the current flag listings use dotted setting paths such as `--container-engine.name` and `--kubernetes.version`. The post now uses the current documented flag style where applicable and avoids the ambiguous older forms.
- The deployment-profile docs currently use `version: 10` in their examples even though `rdctl list-settings` samples show a newer settings schema version. The post follows the deployment-profile documentation because that is the format Rancher Desktop currently documents for locked profiles.
