# How to Configure Case Sensitivity and Normalization in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Unicode, Configuration

Description: Learn how to configure case sensitivity and Unicode normalization settings in CephFS directories for compatibility with macOS and Windows clients in Rook-Ceph.

---

## Overview

By default, CephFS is case-sensitive and does not normalize Unicode filenames, matching the behavior of most Linux filesystems. However, macOS and Windows clients expect case-insensitive filesystems with Unicode normalization. CephFS allows configuring case sensitivity and normalization on a per-directory basis using extended attributes, enabling cross-platform compatibility.

## Why This Matters

When macOS clients mount CephFS:
- macOS treats `File.txt` and `file.txt` as the same file
- macOS normalizes Unicode characters (e.g., precomposed vs. decomposed forms)
- Without matching settings in CephFS, cross-platform workflows break

## Configure Case Insensitivity on a Directory

Enable case-insensitive lookups on a specific directory:

```bash
# Enable case-insensitive mode (requires Ceph Squid 19.2+ and ceph-fuse client)
setfattr -n ceph.dir.casesensitive -v 0 /mnt/cephfs/shared-with-mac
```

Verify the setting:

```bash
getfattr -n ceph.dir.casesensitive /mnt/cephfs/shared-with-mac
```

A value of `0` means case-insensitive; `1` (default) means case-sensitive.

## Configure Unicode Normalization

Enable Unicode normalization to ensure filenames in different normalization forms (NFC/NFD) resolve to the same file:

```bash
# Set normalization to NFC (Normalization Form C - precomposed)
setfattr -n ceph.dir.normalization -v nfc /mnt/cephfs/shared-with-mac

# Or NFD (Normalization Form D - decomposed)
setfattr -n ceph.dir.normalization -v nfd /mnt/cephfs/shared-with-mac

# Or NFKC (compatibility decomposition + canonical composition)
setfattr -n ceph.dir.normalization -v nfkc /mnt/cephfs/shared-with-mac

# Or NFKD (compatibility decomposition)
setfattr -n ceph.dir.normalization -v nfkd /mnt/cephfs/shared-with-mac
```

## Set Both Together for macOS Compatibility

macOS (APFS) is normalization-insensitive and case-insensitive by default. Using NFD normalization in CephFS provides the closest compatibility:

```bash
setfattr -n ceph.dir.casesensitive -v 0 /mnt/cephfs/macos-share
setfattr -n ceph.dir.normalization -v nfd /mnt/cephfs/macos-share
```

## MDS Version Requirements

These features require:
- Ceph Squid (19.2) or later
- The ceph-fuse client (the kernel CephFS driver does not support charmap)
- ICU Unicode library support (used by the client for normalization)

Check MDS version:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
```

## Check Normalization at the Directory Level

List all Unicode-related attributes on a directory:

```bash
getfattr -d -m ceph.dir /mnt/cephfs/shared-with-mac
```

## Limitations

```text
- Settings are inherited by subdirectories but not files
- Cannot change settings on directories that already have files
- The setting applies to the directory in which it is set and all children
- Directory-level settings cannot be changed after files are created
```

## Test Cross-Platform Behavior

```bash
# Create a file from Linux
touch /mnt/cephfs/macos-share/TestFile.txt

# Verify case-insensitive lookup works
ls /mnt/cephfs/macos-share/testfile.txt  # Should find TestFile.txt
```

## Summary

CephFS supports per-directory configuration of case sensitivity and Unicode normalization through extended attributes. Setting `ceph.dir.casesensitive` and `ceph.dir.normalization` on shared directories enables seamless cross-platform compatibility between Linux, macOS, and Windows clients in Rook-Ceph deployments. These settings must be applied to empty directories before any files are created, making early planning essential when setting up cross-platform shares.
