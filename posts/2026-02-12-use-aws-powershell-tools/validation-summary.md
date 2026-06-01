# Validation Summary: How to Use AWS PowerShell Tools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Tools for PowerShell
- PowerShell modules and cmdlets
- AWS authentication and named profiles
- AWS IAM Identity Center SSO
- Amazon EC2
- Amazon S3
- AWS Lambda
- Amazon CloudWatch
- AWS Identity and Access Management
- AWS Security Token Service

## Sources Consulted
- AWS Tools for PowerShell V5 getting started documentation: https://docs.aws.amazon.com/powershell/v5/userguide/pstools-getting-set-up.html
- AWS Tools for PowerShell installation documentation: https://docs.aws.amazon.com/powershell/v5/userguide/pstools-getting-set-up-windows.html
- Set-AWSCredential command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Set-AWSCredential.html
- Initialize-AWSSSOConfiguration command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Initialize-AWSSSOConfiguration.html
- Invoke-AWSSSOLogin command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Invoke-AWSSSOLogin.html
- New-EC2Instance command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/New-EC2Instance.html
- Write-S3BucketVersioning command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Write-S3BucketVersioning.html
- Write-CWMetricAlarm command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Write-CWMetricAlarm.html
- Register-IAMUserPolicy command reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Register-IAMUserPolicy.html

## Issues Found
- The modular install command omitted modules required by later examples. Added AWS.Tools.IdentityManagement for IAM cmdlets and AWS.Tools.SecurityToken for Get-STSCallerIdentity.
- The named profile setup used Initialize-AWSDefaultConfiguration for current-session credential selection. Replaced it with Set-AWSCredential -ProfileName MyProfile, matching the current command reference behavior for loading a stored profile into the active shell.
- The SSO example only called Set-AWSCredential against an SSO profile. Updated it to use Initialize-AWSSSOConfiguration and Invoke-AWSSSOLogin, which are the current AWS Tools for PowerShell cmdlets for IAM Identity Center profiles.
- The EC2 listing example claimed to list running instances but did not filter by state. Added an instance-state-name filter for running instances.
- The EC2 launch example used a stale, region-specific AMI ID and an inline hashtable for TagSpecification. Replaced the AMI ID with a placeholder and built an Amazon.EC2.Model.TagSpecification object as shown in the official cmdlet examples.
- The S3 bucket versioning example used VersioningConfiguration_Status. Corrected it to VersioningConfig_Status, the parameter name in the current Write-S3BucketVersioning cmdlet.

## Review Notes
- The examples still use placeholder AWS resource IDs, credentials, bucket names, and ARNs that must be replaced before use.
- The monolithic AWSPowerShell.NetCore module remains valid, but AWS documentation recommends the modular AWS.Tools package for most use cases.
