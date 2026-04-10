# How to Understand Ceph Release Naming Convention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Release, Versioning, Upgrade

Description: Understand Ceph's alphabetical release naming convention, version numbers, LTS releases, and how to map release names to version numbers for upgrade planning.

---

Ceph uses both alphabetical code names and semantic version numbers. Understanding how these relate helps you plan upgrades, check compatibility, and communicate clearly with the community.

## The Naming Convention

Ceph releases are named alphabetically after sea creatures. Each major release gets a code name and a major version number:

| Code Name | Major Version | Type |
|-----------|--------------|------|
| Argonaut  | 0.48         | Initial |
| Bobtail   | 0.56         | |
| Cuttlefish| 0.61         | |
| Dumpling  | 0.67         | LTS |
| Emperor   | 0.72         | |
| Firefly   | 0.80         | LTS |
| Giant     | 0.87         | |
| Hammer    | 0.94         | LTS |
| Infernalis| 9.2          | |
| Jewel     | 10.2         | LTS |
| Kraken    | 11.2         | |
| Luminous  | 12.2         | LTS |
| Mimic     | 13.2         | |
| Nautilus  | 14.2         | LTS |
| Octopus   | 15.2         | |
| Pacific   | 16.2         | LTS |
| Quincy    | 17.2         | LTS |
| Reef      | 18.2         | LTS |
| Squid     | 19.2         | |
| Tentacle  | 20.2         | |

## Checking Your Current Version

```bash
ceph version
# ceph version 18.2.2 (e9fe820e7fffd1b7cde143a9f77653b73fcec748) reef (stable)
```

The format is: `ceph version MAJOR.MINOR.PATCH (commit-hash) codename (status)`

## Long-Term Stable Releases

LTS releases receive backport fixes for approximately 2 years. Production deployments should run the latest patch release of an LTS version:

```bash
# Check if a newer patch is available
ceph version
# Compare against: https://docs.ceph.com/en/latest/releases/
```

## Version Components

The three-part version number has specific meaning:

- **Major (18)**: The release generation - increments with each named release
- **Minor (2)**: Always 2 for stable releases (0 = dev, 1 = RC, 2 = GA)
- **Patch (2)**: Bug fix increment - upgrade to the latest within your major version

## Compatibility Across Versions

Ceph supports upgrades between adjacent major versions only. To upgrade from Pacific (16) to Reef (18), you must pass through Quincy (17):

```bash
# Upgrade path: Pacific -> Quincy -> Reef
# Check current version
ceph version

# Check minimum required version for upgrade target in Rook
kubectl get cephcluster -n rook-ceph -o jsonpath='{.items[0].spec.cephVersion.image}'
```

## Summary

Ceph's alphabetical naming maps directly to major version numbers, with `.2.x` indicating stable releases. LTS releases receive extended support and should be the basis for production deployments. Understanding the version numbering ensures you follow the correct upgrade path and target the right documentation for your version.
