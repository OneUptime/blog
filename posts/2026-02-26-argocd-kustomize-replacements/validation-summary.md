# Validation Summary: How to Use Kustomize Replacements with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes manifests
- GitOps

## Sources Consulted
- Kustomize replacements reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/replacements/
- Kustomize vars reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/vars/
- Kustomize kustomization API reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Linked OneUptime article: https://oneuptime.com/blog/post/2026-02-09-kustomize-replacements-substitution/view
- Kustomize v5.7.1 CLI help and local build checks using the official GitHub release binary.

## Issues Found
- The introduction claimed replacements could copy a generated ConfigMap name including the hash suffix. A local Kustomize v5.7.1 build showed that copying `metadata.name` from a generated ConfigMap includes `namePrefix` but not the generated content hash, so the wording was changed to avoid promising hash propagation.
- The post said replacements replaced deprecated `vars` in Kustomize 4.5.0+. Official Kustomize docs state that `vars` was deprecated in v5.0.0 and recommend migrating to `replacements`, so the version-specific wording was corrected.
- The basic example said it copied a Service cluster IP, but the replacement source was `metadata.name` and the later output described the Service name. The text was corrected to say Service name.
- The basic `resources` list included `configmap.yaml`, but that example does not use a ConfigMap. The unused file reference was removed to avoid a build failure if copied literally.
- The debugging section listed error messages that did not match current Kustomize behavior. The messages were updated to match observed Kustomize v5.7.1 output for missing source fields and missing target field paths.

## Review Notes
The linked OneUptime article exists and points to the expected subject. The snippets use partial Kubernetes manifests in a few places for readability. They are valid Kustomize concepts, but readers copying them into a cluster may need to add the normal Kubernetes fields not central to the replacement example, such as full Deployment selectors and matching pod template labels.
