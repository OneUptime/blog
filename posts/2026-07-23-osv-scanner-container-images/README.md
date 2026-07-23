# How to Scan Container Images with OSV-Scanner-and Understand Its Coverage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Container Security, Docker, Vulnerability Scanning, OSV-Scalibr

Description: Scan local, registry, and archived container images while interpreting OS package, language artifact, and layer coverage accurately.

---

OSV-Scanner v2 has a dedicated image command. It extracts installed OS packages and supported build artifacts from an image, matches them to known vulnerabilities, and attributes packages to image layers.

```bash
osv-scanner scan image example/service:2026-07-23
```

This is not the same inventory model as scanning a source repository. Image scanning focuses on what is present in the filesystem, not every lockfile copied into or left out of the image.

## Scan an image by name

Docker is optional in general but required for direct image-name scanning. OSV-Scanner first looks for the image locally and attempts to pull it when it is absent. It uses `docker save` to create a temporary archive for analysis.

```bash
docker pull registry.example.com/team/service@sha256:DIGEST
osv-scanner scan image \
  registry.example.com/team/service@sha256:DIGEST
```

Pin a digest in release gates. A mutable tag such as `latest` can refer to a different filesystem when the scan is reviewed later.

The official documentation states that no container code is executed during this scan. Analysis operates on the exported archive rather than starting the image.

## Scan an archive without Docker

Create a Docker-format archive with Docker or Podman:

```bash
docker save example/service:2026-07-23 > service.tar
```

or:

```bash
podman save \
  --format=docker-archive \
  example/service:2026-07-23 \
  > service.tar
```

Then scan it directly:

```bash
osv-scanner scan image --archive ./service.tar
```

Archive scanning is useful in restricted builders and makes the exact input easy to hash and retain. The archive must use the documented Docker archive format.

## Know the documented artifact coverage

The current OSV-Scanner supported-artifacts page lists these image inputs:

- Alpine APK installed-package database;
- Debian/Ubuntu dpkg/apt installed-package database;
- Go binaries;
- Rust binaries built with cargo-auditable metadata;
- Java uber JARs;
- installed Node modules;
- Python wheels in site-packages.

OSV-Scanner v2.4.0 also enables Canonical Chisel installed-package extraction for container images. Earlier v2 releases do not include that coverage by default.

Coverage is evidence-driven. A stripped binary without embedded package metadata cannot be inventoried like a lockfile. A Rust binary without cargo-auditable data does not expose the same dependency information. A language package that was compiled away, flattened, or installed in an unsupported layout may not appear.

An empty result therefore means only that, after applying the selected vulnerability data, configuration, and filters, no extracted package produced a reportable match. It does not prove that every file in the image was attributed to a package or that every vulnerability class is covered.

## Read layer and base-image context

The default image output groups vulnerabilities by package and reports fields such as:

- installed version and whether a fix is available;
- vulnerability count;
- introduced layer;
- whether a package was attributed to the base image;
- operating-system or distribution context.

Layer attribution helps choose the remediation owner. A vulnerable OS package introduced by the base image usually calls for a newer base digest and rebuild. A package introduced by `RUN pip install` or an application copy layer belongs to the application build.

Do not delete a file in a later layer and assume it never existed in image history. Rebuild the layer chain from clean inputs and verify the final image scan.

## Produce detailed results

Use JSON or SARIF for automation. Add `--all-packages` to JSON when you need the complete extracted package inventory, including packages without findings:

```bash
osv-scanner scan image \
  --format=json \
  --all-packages \
  --output-file=image-osv.json \
  example/service:2026-07-23
```

For interactive layer and base-image filtering, the documentation recommends HTML:

```bash
osv-scanner scan image \
  --format=html \
  --output-file=image-osv.html \
  example/service:2026-07-23
```

`--serve` can host the generated report on port 8000. In v2.4.0 it listens on all network interfaces, even though the CLI prints a `localhost` URL, so do not use it on an untrusted shared network.

The `scan image` command cannot be combined with source directories or lockfile targets. Run separate source and image scans and retain both results.

## Validate coverage in CI

For each release:

1. Scan the immutable image digest or retained archive.
2. Record OSV-Scanner version, flags, image digest, and scan timestamp.
3. Review extracted ecosystem and package counts for unexpected drops.
4. Fail distinctly on vulnerability exit code `1`, general error `127`, and no-package error `128`.
5. Rescan released digests on a schedule as advisory data changes.

Pair image scanning with a build-generated SBOM when supported artifact metadata is incomplete. Compare the two inventories; unexplained differences are coverage gaps to investigate, not duplicates to discard.

## Official Documentation

- [OSV-Scanner container image scanning](https://google.github.io/osv-scanner/usage/scan-image)
- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner output formats](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2 migration guide](https://google.github.io/osv-scanner/migration-guide.html)
- [OSV-Scanner v2.4.0 release notes](https://github.com/google/osv-scanner/releases/tag/v2.4.0)
