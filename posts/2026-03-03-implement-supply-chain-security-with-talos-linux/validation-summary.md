# Validation Summary: How to Implement Supply Chain Security with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (image verification, Image Factory, machine config)
- Sigstore / cosign (keyless signing, verify-blob, attest)
- Sigstore Policy Controller (ClusterImagePolicy admission)
- Software Bill of Materials (SPDX format)
- Syft (SBOM generation)
- Grype (SBOM vulnerability scanning)
- Kubernetes (admission webhooks, ValidatingWebhookConfiguration)
- GitHub Actions (CI workflow)
- Helm (chart install)

## Sources Consulted
- Talos Linux Image Factory docs: https://docs.siderolabs.com/talos/v1.7/learn-more/image-factory/
- Talos Linux SBOM docs: https://docs.siderolabs.com/talos/v1.11/advanced-guides/SBOM
- Talos Linux Verifying Images docs: https://www.talos.dev/v1.5/advanced/verifying-images/
- Talos GitHub release assets API (siderolabs/talos v1.7.0, v1.10.0, v1.11.0)
- siderolabs/talos source for `talosctl version` (cmd/talosctl/cmd/talos/version.go)
- Sigstore cosign SBOM deprecation issue: https://github.com/sigstore/cosign/issues/2755
- Sigstore Policy Controller docs: https://docs.sigstore.dev/policy-controller/installation/
- Sigstore policy-controller Helm chart: https://github.com/sigstore/helm-charts/tree/main/charts/policy-controller
- Live verification: downloaded `talos-amd64.spdx.json` from v1.11.0 release to confirm SPDX `.packages` field structure (365 packages)

## Issues Found

1. **Wrong ISO filename and missing `.sig` files in v1.7.0** — The post referenced `talos-amd64.iso` and `talos-amd64.iso.sig` for Talos v1.7.0. Verified against the GitHub Releases API: the actual ISO is named `metal-amd64.iso`, and `.sig` signature files for release artifacts only began being published in **v1.11.0** (v1.7.0 ships only `sha256sum.txt` / `sha512sum.txt`). Updated the example to use `metal-amd64.iso` / `metal-amd64.iso.sig` against `v1.11.0` so the commands actually succeed.

2. **SBOM download via `cosign download sbom` is incorrect for Talos** — The post used `cosign download sbom ghcr.io/siderolabs/talos:v1.7.0`. Talos does not publish SBOMs as OCI image attachments — the official SBOM documentation lists release artifacts (e.g. `talos-amd64.spdx.json`), `/usr/share/spdx` on a running node, and `talosctl get sboms`. Additionally, `cosign download sbom` / `cosign attach sbom` were deprecated by Sigstore in 2024 in favour of attestations. Replaced with a direct `curl` of the SPDX SBOM release artifact (v1.11.0 is the first release that publishes them).

3. **Wrong `jq` field for SPDX SBOMs** — The post used `jq '.components | length'`, which is the CycloneDX schema. Talos publishes SPDX, whose top-level array is `.packages`. Verified against the downloaded `talos-amd64.spdx.json` (365 packages). Updated the jq query.

4. **CI workflow used the same broken SBOM download path** — Updated the GitHub Actions step to `curl` the SPDX artifact and scan it with `grype sbom:talos-amd64.spdx.json --fail-on critical`.

5. **`TALOS_VERSION=$(talosctl version --client --short)` is broken** — Confirmed against the talosctl source: `--short` still prints a `Client:` header line followed by an indented version, so the variable becomes a multi-line string and the subsequent `ghcr.io/siderolabs/installer:${TALOS_VERSION}` reference fails. Also, the `--short` flag is itself deprecated. Replaced with an explicit `TALOS_VERSION="v1.11.0"` assignment and updated the SBOM check in the monitor script to use the release artifact URL.

6. **Deprecated `cosign attach sbom`** — The post included `cosign attach sbom --sbom app-sbom.json …` immediately followed by the recommended `cosign attest --type spdxjson …`. The `attach sbom` form was deprecated in 2024 with planned removal. Removed the duplicated deprecated command and kept the `cosign attest` example.

7. **Image Factory `Content-Type: application/x-yaml` header** — The official Talos Image Factory docs show the upload as `curl -X POST --data-binary @schematic.yaml https://factory.talos.dev/schematics` with no `Content-Type`. Dropped the unnecessary header to match the documented form.

Version references across the post (installer image tag, factory example tag) were also bumped from `v1.7.0` to `v1.11.0` for consistency with the fixes above.

## Review Notes
- The `ClusterImagePolicy` snippet (`policy.sigstore.dev/v1beta1`, `keyless.identities[].subjectRegExp`) and the `policy.sigstore.dev/include=true` namespace label match the current sigstore/policy-controller CRD schema.
- The `helm install policy-controller sigstore/policy-controller --namespace cosign-system --create-namespace` invocation is valid; the official docs sometimes pass `--devel`, but a stable install without it is fine.
- The `ValidatingWebhookConfiguration` example is illustrative; in practice, installing the Sigstore policy controller chart sets up its own webhook, so users would not normally hand-craft this manifest. Left as-is because the snippet itself is structurally valid Kubernetes YAML.
- The Image Factory schematic format (`customization.systemExtensions.officialExtensions`) is correct, as is the resulting installer image path pattern `factory.talos.dev/installer/<schematic-id>:<version>`.
- Pinning by digest in `machine.install.image` with `@sha256:...` is the documented Talos approach for immutability.
