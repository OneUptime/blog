# Validation Summary: How to Configure SOPS Regex-Based Encryption Rules in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SOPS
- Flux Kustomization
- Kubernetes Secrets and ConfigMaps
- age encryption keys
- YAML configuration
- Regular expressions

## Sources Consulted
- SOPS official README and configuration documentation: https://github.com/getsops/sops
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post said SOPS regex rules match the full key path in dot notation. SOPS documents `encrypted_regex` and `unencrypted_regex` as matching key names, and its examples describe encrypting values under keys that match the regular expression. I changed the nested-key explanation to say the regex matches YAML key names wherever they appear.
- The common-pattern examples used dot-notated paths such as `spec\.selector` and an indexed container path. Because SOPS regex matching is key-name based, these patterns would not work as described. I replaced them with key-name-based examples.

## Review Notes
- The Flux Kustomization decryption snippet uses the current `kustomize.toolkit.fluxcd.io/v1` API and the documented `.spec.decryption.provider: sops` and `.spec.decryption.secretRef.name` fields.
- SOPS documents that `encrypted_regex`, `unencrypted_regex`, `encrypted_suffix`, `unencrypted_suffix`, and comment-regex variants are mutually exclusive per file/config rule. The post uses them separately, which is correct.
