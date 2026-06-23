# Validation Summary: How to Secure Go Binaries with Code Signing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Go
- GnuPG / OpenPGP signing
- Sigstore, Fulcio, Rekor, and cosign
- GitHub Actions
- GitLab CI/CD
- Syft SBOM generation
- SLSA provenance
- Reproducible Go builds

## Sources Consulted
- Sigstore cosign blob signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_blobs/
- Sigstore cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore OIDC usage in Fulcio documentation: https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/
- GitLab Sigstore signing examples: https://docs.gitlab.com/ci/yaml/signing_examples/
- GitLab OIDC ID token documentation: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- sigstore/cosign-installer release notes: https://github.com/sigstore/cosign-installer/releases
- SLSA GitHub Generator generic workflow documentation: https://github.com/slsa-framework/slsa-github-generator/blob/main/internal/builders/generic/README.md
- Go command documentation: https://pkg.go.dev/cmd/go
- Go runtime/debug documentation: https://pkg.go.dev/runtime/debug
- GnuPG operational command documentation: https://www.gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html
- Anchore Syft output format documentation: https://oss.anchore.com/docs/guides/sbom/formats/

## Issues Found
- Cosign installation used the old Go module path `github.com/sigstore/cosign/v2/cmd/cosign@latest`. Updated examples to `github.com/sigstore/cosign/v3/cmd/cosign@latest`, matching current cosign installation documentation.
- Cosign blob signing examples used separate `.sig` and `.pem` outputs. Current cosign v3 documentation recommends bundle-based blob signing and v3 requires bundle output for `sign-blob`, so examples now use `.sigstore.json` bundles and `--bundle` verification.
- GitHub Actions examples used `sigstore/cosign-installer@v3`, which does not install Cosign v3. Updated to `sigstore/cosign-installer@v4`.
- GitLab CI example manually downloaded the cosign binary and emitted separate signature/certificate files. Updated it to use the documented `apk add cosign` approach and Sigstore bundle artifacts.
- The GitLab release job linked to artifacts from its own job ID without preserving downloaded artifacts. Added `needs` with artifacts and a release-job artifact declaration so the linked files are available.
- The Go-based verification sample used invalid cosign library code: it created unused verification options and treated a Fulcio certificate as a signature verifier. Replaced it with a small Go wrapper around `cosign verify-blob --bundle`, which matches the documented verification workflow.
- The Go module verification sample used `os.Args` without importing `os` and referenced an undefined `run` function. Added the missing import and a placeholder `run` function so the snippet is syntactically complete.
- The complete GitHub release pipeline skipped SBOM generation for Windows `.exe` artifacts because it excluded any filename containing a dot. Adjusted the SBOM loop so Windows binaries are included.
- The SLSA generator version was outdated compared with the current generic workflow documentation. Updated the reusable workflow reference from `v1.9.0` to `v2.1.0`.
- The article stated that Go produces statically linked binaries unconditionally. Changed this to say Go can produce statically linked binaries, because cgo and external linking can change that behavior.
- The sample GPG key ID contained non-hex characters. Replaced it with a valid hexadecimal placeholder consistently across generation, upload, fetch, and verification examples.
- Embedded Markdown examples used ` ```plaintext` closing fences and a triple-backtick outer Markdown fence around nested code blocks. Repaired the fences so the post renders correctly.

## Review Notes
- The GPG examples are broadly valid for GnuPG 2.4, but production projects should prefer full fingerprints over short key IDs in user-facing verification instructions.
- I could not compile Go snippets locally because `go` is not installed in the review environment; syntax was reviewed manually against Go documentation.
