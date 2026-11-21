# Validation review

Reviewed kube-bench v0.14.0 release packaging and tagged configuration-loading source. Downloaded official Linuxamd64 and Darwinarm64 archives, verified their SHA256 values against the published release checksum file, and confirmed both contain global configuration and benchmark controls. This is checksum verification, not independent signature verification.

The Darwinarm64 binary reported0.14.0. Actual local error-path tests reproduced missing version_mapping, missing target_mapping, and absent node.yaml. A complete-configuration probe with an intentionally invalid target reached target validation without running node checks. Four shell blocks passed syntax checks; one is explicitly an argument fragment.

No Linuxnode compliance scan was performed. The diagram received structural checking only, and the generated social image was visually reviewed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
