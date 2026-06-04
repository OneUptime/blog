# Validation Summary: How to Set Up Artifact Attestation with In-Toto

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- in-toto
- securesystemslib
- OpenSSL key generation
- GitHub Actions
- GitLab CI
- Tekton Tasks
- Cosign attestations
- Kubernetes admission webhook patterns

## Sources Consulted
- in-toto installation docs: https://in-toto.readthedocs.io/en/latest/installing.html
- in-toto command-line tools docs: https://in-toto.readthedocs.io/en/latest/command-line-tools/index.html
- in-toto-run docs and local `in-toto-run --help`: https://in-toto.readthedocs.io/en/latest/command-line-tools/in-toto-run.html
- in-toto-verify docs and local `in-toto-verify --help`: https://in-toto.readthedocs.io/en/latest/command-line-tools/in-toto-verify.html
- in-toto API docs: https://in-toto.readthedocs.io/en/latest/api.html
- in-toto layout creation example: https://in-toto.readthedocs.io/en/latest/layout-creation-example.html
- in-toto metadata model docs: https://in-toto.readthedocs.io/en/latest/model.html
- in-toto key generation guidance issue: https://github.com/in-toto/in-toto/issues/662
- in-toto standalone verification key loading guidance issue: https://github.com/in-toto/in-toto/issues/663
- Tekton Task docs: https://tekton.dev/docs/pipelines/tasks/
- Sigstore Cosign in-toto attestation docs: https://docs.sigstore.dev/cosign/verifying/attestation/
- Cosign attach attestation docs: https://github.com/sigstore/cosign/blob/main/doc/cosign_attach_attestation.md
- GitHub Actions upload-artifact docs/deprecation notice: https://github.com/actions/upload-artifact
- GitHub Actions checkout docs: https://github.com/actions/checkout

## Issues Found
- The post used `in-toto-keygen`, which is no longer part of the current in-toto CLI flow. Replaced it with OpenSSL commands that create standard Ed25519 private keys and PEM public keys accepted by in-toto.
- The install section referenced `in-toto/in-toto:latest`, which was not publicly pullable as a valid container image during review. Removed that alternative and kept the documented pip installation path.
- The layout Python snippet used obsolete or incorrect APIs, including `Metablock.sign`, `expected_command_from_string`, missing functionary public keys, and no layout expiration. Updated it to load PEM public keys with `cryptography`, add functionary keys to the layout, set expiration, call `set_expected_command_from_string`, and sign with `Metablock.create_signature`.
- The build step claimed to produce `myapp.tar` while only running `docker build`. Updated the build commands to save the image tarball after building so the declared product exists.
- The layout's test and scan material rules did not match the materials recorded in the later examples. Updated those rules and the scan command so the declared artifacts match the demonstrated workflow.
- The in-toto CLI examples used `--key`, which is not a current `in-toto-run` flag. Replaced it with `--signing-key`.
- The verification examples used `--layout-key`, which is not a current `in-toto-verify` flag. Replaced it with `--verification-keys`.
- The GitHub Actions example used deprecated artifact actions and an older checkout action. Updated to current major versions and added the missing test signing key load step.
- The Tekton verification task downloaded `root.layout` before changing directories, then verified from a directory where the file was not present. Updated it to download the layout and key to `/tmp` and reference those absolute paths.
- The Tekton build task used Docker without making the Docker CLI/socket available. Added Docker installation and a Docker socket volume mount to make the example operational in a cluster configured for host Docker socket access.
- The GitLab CI snippet passed key environment variables directly as key paths. Renamed them to path-style variables to reflect that `--signing-key` expects a key file path.
- The Cosign section implied arbitrary in-toto link metadata can be attached as an attestation. Clarified that `cosign attach attestation` expects DSSE-formatted attestation envelopes.
- The admission webhook Python example referenced undefined variables, used generic link filenames, and called `in_toto_verify` with incorrect argument names and object types. Reworked it to load a `Metadata` layout, load a PEM verification key into the expected key dictionary shape, download keyid-prefixed link files into a temporary directory, and call `in_toto_verify` with `link_dir_path`.
- The report generator treated `metablock.signatures` like a dictionary. Updated it to iterate signature objects and read `signature.keyid`.

## Review Notes
The post is now aligned with current in-toto 3.x CLI and Python APIs. The Tekton Docker socket pattern is technically valid but operationally sensitive; a production version should prefer a cluster-approved builder such as BuildKit, Kaniko, or Tekton Chains rather than broadly mounting the host Docker socket.
