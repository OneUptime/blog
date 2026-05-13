# Validation Summary: How to Configure SOPS Creation Rules in .sops.yaml for Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SOPS
- Flux
- Kubernetes Secrets
- GitOps
- age encryption
- AWS KMS
- GCP KMS

## Sources Consulted
- SOPS official documentation and README: https://github.com/getsops/sops
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption

## Issues Found
- The introduction said creation rules define encryption algorithms. SOPS creation rules define matching, identities, and encryption settings, but not a general encryption algorithm choice. I changed this to "encryption keys and settings."
- The MAC section described `mac_only_encrypted` as specifying a MAC algorithm. Official SOPS documentation describes it as changing which values are included in the MAC. I renamed the section to "Setting MAC Coverage" and corrected the explanation.
- The `.sops.yaml` placement section said SOPS searches from the file being encrypted upward. Official SOPS documentation says lookup starts from the current working directory and walks up parent directories, and `path_regex` is evaluated relative to the config file. I corrected that wording.
- The validation command was labeled as a dry run, but `sops --encrypt --verbose` still performs encryption and writes encrypted output. I changed the comment and command so the encrypted output is redirected to `encrypted.yaml`.

## Review Notes
The SOPS CLI was not installed in the local environment, so CLI behavior was verified against official SOPS documentation rather than local `--help` output. The examples use placeholder age recipient values such as `age1key...`; these are illustrative and must be replaced with real age recipients before use.
