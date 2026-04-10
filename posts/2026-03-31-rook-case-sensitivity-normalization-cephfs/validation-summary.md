# Validation Summary: How to Configure Case Sensitivity and Normalization in CephFS

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph
- CephFS (charmap feature: case sensitivity and Unicode normalization)
- setfattr / getfattr (extended attribute tools)
- Unicode normalization forms (NFC, NFD, NFKC, NFKD)
- kubectl (for Rook toolbox access)

## Sources Consulted
- CephFS Directory Entry Name Normalization and Case Folding (official docs): https://docs.ceph.com/en/latest/cephfs/charmap/
- CephFS charmap docs (Squid release): https://docs.ceph.com/en/squid/cephfs/charmap/
- Ceph Squid 19.2.0 Release Notes: https://docs.ceph.com/en/latest/releases/squid/
- Ceph Tentacle Release Notes: https://docs.ceph.com/en/latest/releases/tentacle/
- FOSDEM 2025 - Case Insensitive Trees in CephFS: https://fosdem.org/2025/schedule/event/fosdem-2025-6598-case-insensitive-trees-in-cephfs/
- Apple APFS FAQ (normalization behavior): https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/APFS_Guide/FAQ/FAQ.html
- Ceph source code (client/CMakeLists.txt) confirming ICU is a client-side dependency

## Issues Found

1. **Critical - Wrong Ceph version requirement**: The post claimed these features require "Ceph Octopus (15.2) or later". The charmap feature (case sensitivity and normalization) was actually introduced in **Ceph Squid (19.2.0)**, released in 2024. This is off by four major releases. Fixed to "Ceph Squid (19.2) or later".

2. **Critical - False kernel client support claim**: The post claimed "For kernel client: Linux 5.11+". The kernel CephFS driver does **not** support charmap at all. Per the official Ceph documentation: "The kernel driver does not understand the charmap feature and probably will not because existing kernel libraries have opinionated case folding and normalization forms." Only the **ceph-fuse** client supports this feature. Fixed to state ceph-fuse is required and removed the kernel version claim.

3. **Major - Incorrect ICU dependency location**: The post stated "MDS built with ICU Unicode library support" is required. ICU is actually a **client-side** dependency, not an MDS requirement. The client performs normalization before submitting operations to the MDS. Fixed to clarify ICU is used by the client.

4. **Minor - Missing NFKD normalization value**: The post listed only three normalization forms (NFC, NFD, NFKC) but the official documentation supports four: NFC, NFD, NFKC, and **NFKD**. Added the missing NFKD option.

5. **Moderate - Oversimplified macOS normalization claim**: The post stated "macOS uses UTF-8 with NFD normalization". While the legacy HFS+ filesystem used near-NFD normalization, modern macOS with APFS is **normalization-insensitive** but **normalization-preserving** -- it does not force NFD. Updated to describe APFS as normalization-insensitive and frame NFD as the closest compatibility option.

## Review Notes
- The `setfattr`/`getfattr` command syntax is correct per official documentation.
- The extended attribute names (`ceph.dir.casesensitive` and `ceph.dir.normalization`) are correct.
- The empty-directory precondition is correctly stated.
- The inheritance behavior described is correct, though it should be noted that charmap is inherited at subdirectory creation time, not retroactively applied to existing subdirectories.
- The comment in the code block about case-insensitive mode was also updated to reflect the corrected version and client requirements.
- The Limitations section's claim that "Settings are inherited by subdirectories but not files" is slightly misleading -- charmap applies to directory entries (both file and subdirectory names within the directory), but the configuration itself is only inherited by new subdirectories. This is a minor imprecision but within acceptable range for a blog post.
