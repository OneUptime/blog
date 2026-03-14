# How to Understand Release Cadence in the Cilium Project

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Community, Release, Versioning, Open Source

Description: Understand Cilium's release cadence, versioning scheme, stable branch lifecycle, and how to plan cluster upgrades around release schedules.

---

## Introduction

Cilium follows a predictable release cadence that helps operators plan upgrades and understand support timelines. The project targets quarterly minor releases and monthly patch releases, with each minor version maintained with security fixes for approximately one year.

Understanding this cadence is essential for maintaining a secure and current Cilium deployment. Falling too far behind means missing security patches and bug fixes that may affect your cluster's stability.

## Release Versioning

Cilium uses semantic versioning:

- **Minor releases** (e.g., 1.15.0, 1.16.0): New features, may include breaking changes
- **Patch releases** (e.g., 1.15.1, 1.15.2): Bug fixes and security patches only
- **Release candidates** (e.g., 1.16.0-rc1): Pre-release testing

## Release Cadence

| Release Type | Frequency | Content |
|--------------|-----------|---------|
| Minor release | ~Quarterly | New features, API changes |
| Patch release | Monthly or as needed | Bugs, CVEs |
| RC cycle | 4-6 weeks before minor | Feature freeze, testing |

## Architecture

```mermaid
gantt
    title Cilium Release Timeline
    dateFormat  YYYY-Q
    section v1.15
    Development     :2024-Q1, 2024-Q2
    RC period       :2024-Q2, 2024-Q3
    v1.15.0 release :milestone, 2024-Q3, 0d
    Patch support   :2024-Q3, 2025-Q3
    section v1.16
    Development     :2024-Q3, 2024-Q4
    RC period       :2024-Q4, 2025-Q1
    v1.16.0 release :milestone, 2025-Q1, 0d
```

## Stable Branch Maintenance

Each minor version receives patch releases for approximately 12 months after its release. Security patches (CVEs) are backported to the two most recent minor versions.

Check which versions are currently maintained:

```bash
# Visit: https://github.com/cilium/cilium/releases
# Maintained branches are listed in the repository
```

## Planning Upgrades

Best practices for staying current:

1. Track releases in Cilium Slack `#release` channel
2. Test minor upgrades in staging before production
3. Stay within N-1 of the current minor release minimum
4. Apply patch releases promptly (especially CVE patches)

## Check Your Current Version

```bash
cilium version
kubectl exec -n kube-system ds/cilium -- cilium-dbg version
```

## Subscribe to Release Notifications

- Watch the GitHub repository for release events
- Join `#announce` and `#release` Slack channels
- Subscribe to the Cilium mailing list

## Upgrade Timing

When a new minor release is available:

```bash
# Check the upgrade guide first
# https://docs.cilium.io/en/stable/operations/upgrade/

# Follow the standard upgrade process
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version <new-version> \
  --reuse-values
```

## Conclusion

Cilium's predictable quarterly release cadence and 12-month patch support window give operators a clear framework for planning upgrades. Staying current with minor releases ensures access to new features and security patches, while patch releases provide a stable path for production deployments.
