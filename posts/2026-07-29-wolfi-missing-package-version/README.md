# What to Do When the Package or Version You Need Is Missing from Wolfi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Wolfi APK, Package Management, Container, Supply Chain Security

Description: Diagnose missing Wolfi packages and choose among another repository, a Chainguard request, a maintained custom APK, or an application upgrade.

---

`apk add` can report `no such package` even when the software exists somewhere in Chainguard's ecosystem. Before replacing Wolfi or downloading an unverified binary, determine whether the problem is the name, architecture, repository set, entitlement, or requested version.

## Establish what is actually missing

Run these checks in a development image that uses the same repositories as the build:

```bash
cat /etc/apk/repositories
apk --print-arch
apk update
apk search package-name
apk policy package-name
```

Then search by capability:

```bash
apk search cmd:required-command
apk search 'so:required-library.so*'
```

Common explanations are:

- the Wolfi package has a different name;
- only one architecture is available;
- the Extra Packages repository is not configured;
- the package belongs to an authenticated organization repository;
- the organization is not entitled to the relevant Production Container;
- the requested historical version has left the repository;
- the upstream project or license is outside Wolfi's scope.

## Understand the repository boundaries

Chainguard documents three main APK repository classes:

- the public Wolfi repository for open-source packages used by Free Containers;
- the public Extra Packages repository for redistributable supplemental software;
- organization-specific private repositories containing packages associated with entitled Production Containers and related offerings.

The generic public endpoints include:

```text
https://apk.cgr.dev/chainguard
https://apk.cgr.dev/extra-packages
```

Customer-specific public endpoints use an organization UID:

```text
https://virtualapk.cgr.dev/ORGANIZATION_UID/chainguard
https://virtualapk.cgr.dev/ORGANIZATION_UID/extra-packages
```

An organization name is not a substitute for the UID in those URLs. Private repositories require authentication and have a different access model.

Do not combine Alpine repositories with Wolfi. Shared use of the APK file format does not make packages ABI-compatible or supported across distributions.

## If a historical version is missing

Wolfi prioritizes current, maintained upstream software. Chainguard's package retention and removal policy is time-sensitive, and monthly removal notices can change which non-latest builds remain downloadable.

As of this article's publication on July 29, 2026, teams should consult the current package-repository policy and Wolfi announcements rather than hard-coding an assumed retention duration. If a historical version is operationally required:

1. determine whether a supported Production Container version stream meets the requirement;
2. upgrade the application to the maintained package where possible;
3. mirror the required signed APK and its dependencies internally before they leave the repository;
4. record the package source, signing key, SBOM, and rebuild process;
5. set an expiry date for the exception.

Pinning an old package is not a security maintenance strategy. It prevents fixes from arriving unless the team deliberately rebuilds that version.

## Request a resource from Chainguard

Verified Chainguard customer organizations can use the Console's Requests section, currently documented as beta, to request an image, package, or Helm chart. A useful package request includes:

- the public upstream source repository;
- build documentation or a project Dockerfile;
- required dependencies;
- intended deployment method;
- whether a FIPS variant is needed.

Chainguard does not guarantee that every request will be built or automatically entitled to the requesting organization. Proprietary code, incompatible licensing, and inactive upstream projects can prevent acceptance.

For the public Wolfi project, check existing issues and discussions before opening a package request. Wolfi's scope is container and cloud-native workloads, not a general desktop repository.

## Build a maintained APK when necessary

Wolfi packages are built from declarative melange configurations. When the package is appropriate for Wolfi but not yet available, contributing a package upstream is preferable to an opaque `curl | sh` layer.

For an internal-only need:

1. build from verifiable upstream source with melange;
2. generate and publish an APK index;
3. sign packages with an organization-controlled key;
4. scan the package and retain an SBOM and provenance;
5. test every supported architecture;
6. operate a patch and rebuild process.

Chainguard's Wolfi packaging guide shows how to add a local repository:

```yaml
environment:
  contents:
    repositories:
      - https://packages.wolfi.dev/os
      - '@local /work/packages'
    keyring:
      - https://packages.wolfi.dev/os/wolfi-signing.rsa.pub
    packages:
      - busybox
      - mypackage@local
```

Do not use this route unless the team can maintain the package. The initial successful build is a small part of its lifecycle.

## Consider a vendor artifact carefully

A vendor-provided binary can be reasonable when:

- it targets Linux, the correct architecture, and compatible glibc;
- its license permits redistribution;
- signatures or checksums are verified;
- runtime shared libraries are known;
- it has a clear update channel and SBOM;
- it is copied in a builder rather than downloaded during container startup.

Test it with `file`, `readelf`, and a clean final image. Avoid unpinned release URLs and installation scripts that mutate the base unpredictably.

## Make the decision explicit

| Situation | Preferred response |
| --- | --- |
| Different package name | Use mappings and `apk search` capabilities |
| Package in Extra or private repository | Configure the correct repository and authentication |
| Supported Production version exists | Use the entitled version stream |
| Current package missing from Wolfi | Request or contribute it |
| Old version required temporarily | Mirror, document, scan, and plan an upgrade |
| Unmaintained upstream | Replace or upgrade the dependency |
| Proprietary vendor binary | Verify compatibility, integrity, license, and updates |

The safest answer is often to change the application dependency rather than recreate a permanently stale operating-system package.

## Official Documentation

- [Chainguard package repository model](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Requesting new Chainguard resources](https://edu.chainguard.dev/chainguard/chainguard-images/features/request-resources/)
- [Building a Wolfi package](https://edu.chainguard.dev/open-source/wolfi/building-a-wolfi-package/)
- [Wolfi project](https://github.com/wolfi-dev/os)
