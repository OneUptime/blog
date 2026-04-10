# Validation Summary: How to Use Ceph RGW S3 from Windows Applications

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook-Ceph (Kubernetes operator)
- AWS CLI (on Windows)
- AWS SDK for .NET (AWSSDK.S3)
- AWS Tools for PowerShell (AWS.Tools.S3)
- radosgw-admin CLI
- X509 certificate management on Windows

## Sources Consulted
- AWS SDK for .NET API Reference: `ClientConfig.UseHttp` property — https://docs.aws.amazon.com/sdkfornet/v3/apidocs/items/Runtime/TClientConfig.html
- AWS SDK for .NET API Reference: `AmazonS3Config` class — https://docs.aws.amazon.com/sdkfornet/v3/apidocs/items/S3/TS3Config.html
- .NET API Reference: SYSLIB0044 — X509Certificate2.Import obsolete diagnostic (deprecated instance Import method in .NET 6+)
- AWS Tools for PowerShell documentation: `Set-AWSCredential`, `Get-S3Bucket`, `Write-S3Object` cmdlets
- Ceph documentation: `radosgw-admin user create` command and flags
- AWS CLI documentation: `--endpoint-url` flag, `s3` subcommands

## Issues Found
1. **Deprecated `X509Certificate2.Import()` instance method** (line ~123-124 in original): The code created an empty `X509Certificate2` object and then called the `.Import()` instance method. This method is deprecated with diagnostic SYSLIB0044 in .NET 6+ and throws `PlatformNotSupportedException` on non-Windows platforms in .NET 8+. While it still works on Windows PowerShell 5.1, it will produce warnings or fail on PowerShell 7+ (which uses .NET 6+). **Fixed** by passing the certificate file path directly to the constructor: `New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("C:\ceph-rgw.crt")`. This works across all PowerShell versions on Windows.

## Review Notes
- The Tags metadata line says "Window" (singular) instead of "Windows" — this is a typo in the metadata, not a technical error in the content.
- The `UseHttp = true` property in the .NET SDK example is valid (defined on `ClientConfig`, inherited by `AmazonS3Config`) but is redundant when `ServiceURL` already specifies `http://`. Including it for explicitness is fine and is a reasonable practice. Note that an older SDK bug (aws/aws-sdk-net#2460, fixed in AWSSDK.Core 3.7.100.3) caused `UseHttp = true` to strip the port from `ServiceURL` — any current SDK version is unaffected.
- All `radosgw-admin` flags (`--uid`, `--display-name`, `--access-key`, `--secret`) are correct.
- All AWS CLI commands and flags are correct.
- All PowerShell AWS Tools cmdlet names and parameters (`Set-AWSCredential`, `Get-S3Bucket`, `Write-S3Object`, `-EndpointUrl`, `-Folder`, `-KeyPrefix`) are correct.
- `ForcePathStyle = true` is correctly noted as required for RGW (virtual-hosted-style bucket addressing does not work with most non-AWS S3-compatible endpoints).
