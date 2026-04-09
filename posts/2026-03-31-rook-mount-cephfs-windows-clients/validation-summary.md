# Validation Summary: How to Mount CephFS on Windows Clients

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph / CephFS
- Rook (Ceph operator for Kubernetes)
- ceph-dokan (Windows CephFS mount utility)
- Dokany (Windows user-mode filesystem driver)
- PowerShell
- NSSM (Non-Sucking Service Manager)
- Kubernetes (for managing Ceph auth keys)

## Sources Consulted
- Ceph official documentation: ceph-dokan page (https://docs.ceph.com/en/latest/cephfs/ceph-dokan/)
- Ceph official documentation: Windows installation (https://docs.ceph.com/en/reef/install/windows-install/)
- Ceph source code: `src/dokan/options.cc` for valid ceph-dokan command-line flags
- Dokany project: https://github.com/dokan-dev/dokany

## Issues Found

### Issue 1: Wrong filesystem driver prerequisite (WinFSP instead of Dokany)
- **What was wrong:** The post instructed users to install WinFSP (`winget install WinFsp.WinFsp`) and verify it with `Get-Command -Module WinFsp`. ceph-dokan requires **Dokany**, not WinFSP. These are two completely different Windows user-mode filesystem libraries.
- **What was changed:** Replaced WinFSP installation with Dokany (`winget install dokan-dev.Dokany`), added the minimum version requirement (2.0.5), pointed to the correct download URL (https://github.com/dokan-dev/dokany/releases), and replaced the invalid verification command with `dokanctl /v`.
- **Why:** Per official Ceph documentation, ceph-dokan "leverages Dokany, a Windows driver that allows implementing file systems in userspace." Dokany is explicitly listed as a prerequisite. WinFSP is never mentioned.

### Issue 2: Fabricated ceph-dokan command-line flags in Performance Tuning section
- **What was wrong:** The performance tuning section used `--enable-dir-cache` and `--cache-timeout`, which are not valid ceph-dokan flags. `--thread-count` was also used, which exists but is deprecated and not supported by Dokany v2.
- **What was changed:** Replaced the invalid flags with `--operation-timeout` (a valid ceph-dokan flag) and `--debug`. Added a comment showing how to configure client-side caching via `ceph.conf` settings (`client cache size`, `client cache mid`), which is the correct way to tune CephFS client caching.
- **Why:** Verified against ceph-dokan source code (`src/dokan/options.cc`). The fabricated flags would cause ceph-dokan to fail with unrecognized option errors.

### Issue 3: Summary referenced WinFSP instead of Dokany
- **What was wrong:** The summary stated "ceph-dokan driver built on WinFSP."
- **What was changed:** Corrected to "ceph-dokan driver built on Dokany."
- **Why:** Consistency with the prerequisite fix and factual accuracy.

## Review Notes
- The NSSM `AppParameters` line in the service section omits the `--keyring` flag that is present in the manual mount command. This may work if the keyring file is in the default search path (`C:\ProgramData\ceph\`), but could cause authentication failures if the Ceph client doesn't automatically find it. Consider adding `--keyring` to the service parameters for robustness.
- The drive letter format uses `Z:` (with colon) in all examples. Official Ceph documentation examples typically use just the letter without a colon (e.g., `-l z`). Both formats may work, but users should be aware of this discrepancy if they encounter issues.
- The `winget install NSSM.NSSM` package ID for NSSM may not be correct or available in all winget repositories. Users may need to install NSSM from https://nssm.cc/ or via Chocolatey instead.
- The `dokanctl /u Z:` unmount command is valid but requires administrator privileges. The canonical Ceph-documented unmount method is `ceph-dokan.exe unmap -l <letter>`.
