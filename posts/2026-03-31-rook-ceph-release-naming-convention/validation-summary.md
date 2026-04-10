# Validation Summary: How to Understand Ceph Release Naming Convention

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Official Ceph releases documentation: https://docs.ceph.com/en/latest/releases/
- Official Ceph releases (general): https://docs.ceph.com/en/latest/releases/general/
- Ceph versions blog post: https://ceph.io/en/news/blog/2014/ceph-versions/
- Ceph v20.2.0 Tentacle release announcement: https://ceph.io/en/news/blog/2025/v20-2-0-tentacle-released/
- Ceph v19.2.0 Squid release announcement: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/

## Issues Found

1. **Missing Tentacle (20.2) release**: The table of Ceph releases ended at Squid (19.2) but omitted Tentacle (20.2), which was released in November 2025 — well before the post's March 2026 date. Added Tentacle (20.2) to the release table.

2. **Inaccurate `ceph version` output format**: The blog showed `ceph version 18.2.2 (reef)` as the example output. The actual `ceph version` output includes a git commit hash between the version number and the codename, and shows the stability status — e.g., `ceph version 18.2.2 (e9fe820e7fffd1b7cde143a9f77653b73fcec748) reef (stable)`. Fixed the example output and format description to match the actual command output.

## Review Notes
- The LTS designations in the release table are correct for the historical alternating LTS model (Dumpling, Firefly, Hammer, Jewel, Luminous, Nautilus, Pacific, Quincy, Reef). However, starting from the Luminous era, Ceph evolved its release support model so that all stable releases receive approximately 24 months of backport support. The traditional "LTS vs non-LTS" distinction has become less meaningful for modern releases. The blog's use of "LTS" labels is historically accurate but may not fully reflect the current support model.
- All 20 release-name-to-version-number mappings were verified as correct. The major version number for post-Infernalis releases corresponds to the letter's position in the alphabet (e.g., I=9, J=10, ..., T=20).
- The version component explanation (0=dev, 1=RC, 2=stable) is confirmed correct per official documentation.
- The upgrade policy (adjacent major versions only) is confirmed correct.
- The kubectl command for checking the Ceph version image in a Rook CephCluster is syntactically correct and functional.
