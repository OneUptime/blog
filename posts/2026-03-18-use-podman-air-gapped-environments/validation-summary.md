# Validation Summary: How to Use Podman in Air-Gapped Environments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- CNCF Distribution registry
- Trivy
- Cosign
- Python packaging with `pip`
- Node.js package installation with `npm`
- OpenSSL
- Linux container host configuration

## Sources Consulted
- Podman `podman load` reference: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman `podman save` reference: https://docs.podman.io/en/latest/markdown/podman-save.1.html
- CNCF Distribution deployment guide: https://distribution.github.io/distribution/about/deploying/
- `containers-registries.conf` reference: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- `containers-certs.d` reference: https://github.com/containers/image/blob/main/docs/containers-certs.d.5.md
- Trivy image CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Sigstore Cosign verification docs: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign signing docs: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- pip wheel docs: https://pip.pypa.io/en/stable/cli/pip_wheel/
- npm `npm ci` docs: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- npm config docs (`offline`, `cache`): https://docs.npmjs.com/cli/v11/using-npm/config
- npm pack docs: https://docs.npmjs.com/cli/v11/commands/npm-pack/

## Issues Found
- The Trivy example loaded each tarball into Podman and then scanned `podman images | head -1`, which could scan the wrong image when multiple images were present. I replaced it with the documented `trivy image --input "$tar"` flow.
- The bundle-creation commands archived `.` from inside the export directory, but the extraction instructions expected a top-level `transfer-bundle-YYYYMMDD/` directory. I updated the commands so checksum generation still happens inside the bundle directory while the tarball preserves that directory layout.
- The registry example used `registry:2`; current CNCF Distribution deployment docs use `registry:3`. I updated the pull, save, load, and run commands to use `registry:3`.
- The registry population and update scripts identified the just-loaded image by sorting local images and taking the first result, which is nondeterministic. I changed both scripts to read the loaded image name from `podman load` output and fail fast if it cannot be determined.
- The Python, Node.js, and Cosign offline examples were inaccurate. I replaced `pip download` with `python -m pip wheel` so the transferred directory is actually a wheelhouse, replaced the `npm pack` example with an `npm ci` cache/offline workflow, and corrected the Cosign example to use `cosign save` plus `cosign verify --offline --local-image`.
- The checksum-verification section said the script ran after loading images, but the script verifies extracted archive files. I corrected the description and simplified the shell parsing logic in the script.

## Review Notes
- The post now validates technically as written, but the pinned container tags and language dependency caches will still need periodic refresh as upstream releases age.
- The Cosign example intentionally uses key-based signing. Keyless offline verification has additional trusted-root requirements that are outside the scope of this post.
