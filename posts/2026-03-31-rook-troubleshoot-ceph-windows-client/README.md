# How to Troubleshoot Ceph Windows Client Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Window, Troubleshooting, RBD, CephFS, Kubernetes

Description: Learn how to diagnose and fix common Ceph Windows client issues including connection failures, mount errors, authentication problems, and performance degradation.

---

## Common Ceph Windows Client Issues

Windows Ceph client issues typically fall into these categories:
- Connection and authentication failures
- RBD map or unmap errors
- CephFS Dokan mount failures
- Performance problems
- Crash and BSOD issues with the Dokan driver

## Enabling Debug Logging

Start by enabling verbose logging to capture detailed error information:

```powershell
# Set debug level for Ceph client
ceph --debug-ms 5 --debug-rbd 20 status

# Enable logging to file
ceph -c C:\ProgramData\ceph\ceph.conf `
  --log-file C:\Logs\ceph-debug.log `
  --debug-ms 1 `
  status
```

## Diagnosing Connection Failures

Test basic network connectivity to MON hosts:

```powershell
# Test TCP connectivity to each MON
Test-NetConnection -ComputerName 192.168.1.10 -Port 6789
Test-NetConnection -ComputerName 192.168.1.11 -Port 6789
Test-NetConnection -ComputerName 192.168.1.12 -Port 6789

# Verify DNS resolution if using hostnames
Resolve-DnsName mon1.ceph.cluster
```

Verify the Ceph configuration is correct:

```powershell
# Dump effective config to verify settings are applied
ceph-conf -c C:\ProgramData\ceph\ceph.conf --show-config

# Test authentication
ceph -c C:\ProgramData\ceph\ceph.conf `
  --id windows-client `
  --keyring C:\ProgramData\ceph\ceph.client.windows-client.keyring `
  auth get client.windows-client
```

## Diagnosing RBD Map Failures

```powershell
# Attempt mapping with verbose output
rbd --debug-rbd 10 map windows-pool/disk01 `
  --id windows-client `
  2>&1 | Tee-Object -FilePath C:\Logs\rbd-map.log

# Check if the image exists and is accessible
rbd info windows-pool/disk01

# Check for image locks that prevent mapping
rbd lock list windows-pool/disk01
```

If an image has locks from a previous crashed client:

```bash
# Remove stale locks from Linux management node
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd lock remove windows-pool/disk01 "lock-id" "client.xxxx"
```

## Troubleshooting Dokan Mount Failures

CephFS Dokan mount failures are often driver-related:

```powershell
# Check if Dokan driver is loaded
Get-Service -Name "dokan*" | Select-Object Name, Status, StartType

# Check Windows Event Log for Dokan errors
Get-WinEvent -LogName System | Where-Object {$_.Message -match "dokan"} | Select-Object -First 10

# Reinstall Dokan driver if it's corrupted (remove then install)
dokanctl /r d
dokanctl /i d

# Try mounting with error output
ceph-dokan -c C:\ProgramData\ceph\ceph.conf `
  --id windows-cephfs `
  -l Z: `
  --debug-client 10 2>&1 | Tee-Object C:\Logs\dokan-debug.log
```

## Fixing Authentication Errors

```powershell
# Verify keyring file format
Get-Content C:\ProgramData\ceph\ceph.client.windows-client.keyring

# Check file permissions (should not be world-readable)
icacls C:\ProgramData\ceph\ceph.client.windows-client.keyring

# Restrict keyring permissions
icacls C:\ProgramData\ceph\ceph.client.windows-client.keyring /inheritance:r
icacls C:\ProgramData\ceph\ceph.client.windows-client.keyring /grant:r "SYSTEM:F"
icacls C:\ProgramData\ceph\ceph.client.windows-client.keyring /grant:r "Administrators:F"
```

## Performance Diagnostics

```powershell
# Check RBD I/O statistics
rbd perf image iostat windows-pool

# Test basic I/O performance on the mapped RBD drive
$vol = Get-Volume | Where-Object FileSystemLabel -Match "Ceph"
winsat disk -ran -write -count 3 -drive $vol.DriveLetter
```

## Summary

Troubleshooting Ceph Windows clients requires a systematic approach: start with network connectivity tests, verify configuration and authentication, then progress to component-specific diagnostics for RBD or Dokan issues. Enable debug logging to capture detailed error messages. Most connection failures stem from network access to MON ports or keyring permission problems, while Dokan mount failures are usually resolved by reinstalling the Dokan driver or checking the Windows Event Log for driver-level errors.
