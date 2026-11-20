# Validation Summary: OneUptime Offline Bundle Installation

## Review scope

Reviewed on 20 November 2026 against official installation documentation, bundle tooling, and published Helm chart artifacts. The guide uses chart 17.0.0 as a concrete reviewed example and explains how another approved release must be rechecked. No live installation is claimed.

## Release and tooling verification

- Reviewed the served /install/air-gapped script and pinned official source at commit 0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e, HelmChart/AirGap/install.sh.
- Pinned script SHA-256: 3c9cd62e0d8c4347e93a809a248e27b7db629516361370026ab72b26039d67e2.
- Confirmed images/save/push commands, version/edition/platform/tool/values/chart/output/bundle/registry flags, upstream chart download, image inventory extraction, directory layout, and checksum-before-push behavior from source.
- Confirmed the script does not automatically include itself or caller-supplied values in its output bundle. Accompanying files require their own transfer-integrity record.
- Published chart 17.0.0 SHA-256: f6ec64764b3fab5ee60a78bdec027fb9eacca6d2d63964c43000bb7ddaf9899a.
- Inspected that archive's values.yaml, templates/_helpers.tpl, Chart.yaml, and packaged dependency entries. Version and appVersion both identify 17.0.0.
- Compared published chart 14.0.102, SHA-256 d25d9115cc500865b60b97add2c58aa423f11edabf58a34843ac426a7307c974. Its values and helpers lack global.imageRegistry rewriting. The article explicitly avoids applying the current workflow unmodified to that documentation example release.
- Verified registry rewriting exceptions, private-network monitor/webhook controls, DNS fallback override, update/check-in controls, MCP metadata setting, host/protocol, and ssl.provision against chart source.
- Reviewed official supply-chain documentation, including publisher identity, chart provenance, and the distinction between authenticity and transfer integrity. Publisher signature verification itself was not executed.

## Local checks performed

- Rendered the published 17.0.0 chart using Helm v3.12.3+g3a31588, an empty feature-values fixture, and the exact article offline-values overlay.
- Rendering exited successfully. All eight distinct rendered image references used registry.example.internal: OneUptime app/nginx/probe/runner/test, ClickHouse, PostgreSQL, and Valkey.
- The render exposed postgres:latest in chart defaults. The article instructs readers to pin mutable dependency tags and retain resolved digests; no dependency compatibility claim is made for an invented replacement tag.
- This render covers the default community topology only. Optional operators, custom feature values, enterprise images, and private registry authentication were not exercised.
- All Bash examples passed bash -n syntax checking via standard input. No article installation, image-copy, or kubectl commands were executed.
- Metadata follows repository format; author and all three tags exist. Title: 65 characters; description: 143 characters; word count including metadata and command text, excluding link URLs: 1410.
- Generated social-media.png with the existing npm script. Confirmed 1280 x 720 dimensions and visually reviewed all three title lines for legibility and clipping.

## Limitations

No bundle save, registry import, signature verification, cluster installation, storage provisioning, TLS proxy setup, enterprise activation, or application smoke check was executed. Local Helm rendering does not validate Kubernetes API compatibility, scheduling, runtime image availability, migrations, or connectivity. Platform-specific images were not pulled. Checksums recorded here identify inspected inputs; they are not a substitute for publisher-signature verification.

Repository-wide validation and catalog integration remain with parent review because the validator can modify shared files. Only this post folder was authored.

## Official sources checked

- https://oneuptime.com/docs/en/installation/air-gapped
- https://helm-chart.oneuptime.com/oneuptime-17.0.0.tgz
- https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/HelmChart/AirGap/install.sh
- https://oneuptime.com/docs/en/self-hosted/supply-chain-security
- https://helm.sh/docs/helm/helm_template/
- https://helm.sh/docs/helm/helm_install/
- https://helm-chart.oneuptime.com/oneuptime-14.0.102.tgz
- https://oneuptime.com/install/air-gapped
- https://raw.githubusercontent.com/OneUptime/oneuptime/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Docs/Content/en/self-hosted/supply-chain-security.md

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

## Readability revision

Added a compact Mermaid flowchart with explanatory text. Reviewed nodes and connections against the procedure; no separate Mermaid rendering test was performed. The six completed posts passed repository validation together after this revision.
