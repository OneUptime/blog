# Validation Summary: How to Restrict Kustomize Remote Bases in Flux

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Flux CD kustomize-controller
- Flux CD source-controller GitRepository
- Kustomize remote bases
- Kubernetes kubectl rollout commands
- Open Policy Agent Rego
- Conftest
- Kubernetes admission control / Gatekeeper

## Sources Consulted
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux FAQ on Kustomize remote bases: https://fluxcd.io/flux/faq/#should-i-be-using-kustomize-remote-bases
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper admission behavior documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/
- Conftest documentation: https://www.conftest.dev/
- Flux flux2 repository path used in the remote-base test: https://github.com/fluxcd/flux2/tree/main/manifests/install

## Issues Found
- The `kubectl rollout restart` command was unnecessary after applying a patched Deployment and could create extra drift under Flux management. Changed it to `kubectl rollout status deployment kustomize-controller -n flux-system` so the command waits for the Deployment update caused by the patch.
- The GitRepository example used `spec.verify.provider: github`, which is not a supported Flux field. Flux Git commit verification uses `spec.verify.mode` plus `spec.verify.secretRef.name` pointing to a Secret with trusted PGP public keys. Updated the snippet accordingly and replaced the abbreviated commit placeholder with a full-length SHA-style placeholder.
- The Gatekeeper example claimed to block remote bases in Git-hosted Kustomize files, but Gatekeeper admission only evaluates Kubernetes API admission requests. A Kustomize `kustomization.yaml` file in a repository is not submitted to the Kubernetes API as that file. Replaced the section with an OPA/Conftest CI policy that can scan the Kustomize file directly.

## Review Notes
The core recommendation to use `--no-remote-bases=true` is supported by the Flux documentation. The remote base example path in the Flux repository is currently plausible and contains a Kustomize directory. Future improvements could mention Flux OCIRepository sources as another verified/cached alternative, as shown in the Flux FAQ.
