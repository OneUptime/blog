# Validation Summary: How to Automate AWS Tasks with PowerShell

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Tools for PowerShell
- Amazon EC2
- Amazon EBS snapshots
- Amazon CloudWatch metrics
- AWS Lambda
- Amazon RDS
- Amazon SNS
- Amazon EventBridge scheduled invocations

## Sources Consulted
- AWS Tools for PowerShell: https://aws.amazon.com/powershell/
- Get-EC2Instance cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Get-EC2Instance.html
- Start-EC2Instance cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Start-EC2Instance.html
- Stop-EC2Instance cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Stop-EC2Instance.html
- Get-EC2Volume cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Get-EC2Volume.html
- New-EC2Tag cmdlet reference: https://docs.aws.amazon.com/powershell/latest/reference/items/New-EC2Tag.html
- Get-CWMetricStatistic cmdlet reference: https://docs.aws.amazon.com/powershell/latest/reference/items/Get-CWMetricStatistic.html
- Update-LMFunctionCode cmdlet reference: https://docs.aws.amazon.com/powershell/latest/reference/items/Update-LMFunctionCode.html
- Publish-LMVersion cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Publish-LMVersion.html
- Get-EC2InstanceStatus cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/Get-EC2InstanceStatus.html
- RDS cmdlet reference: https://docs.aws.amazon.com/powershell/v5/reference/items/RDS_cmdlets.html
- Publish-SNSMessage cmdlet reference: https://docs.aws.amazon.com/powershell/latest/reference/items/Publish-SNSMessage.html
- AWS Lambda scheduled invocation with EventBridge Scheduler: https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html
- Amazon EC2 Elastic IP addresses: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- Amazon EBS pricing: https://aws.amazon.com/ebs/pricing/

## Issues Found
- The Lambda deployment example used `Update-LMFunctionCode -ZipFilename`, which the current AWS Tools for PowerShell documentation marks obsolete. Changed it to read the package with `[System.IO.File]::ReadAllBytes()` and pass it through the current `-ZipFile` parameter.
- The idle instance report compared `$null` CPU averages to the threshold when CloudWatch returned no datapoints. Changed the condition to require a non-null average before reporting an instance as idle.

## Review Notes
- The scripts assume the required AWS Tools for PowerShell modules and credentials are already configured, which is consistent with the article's setup note.
- I could not run PowerShell syntax checks locally because `pwsh` is not installed in this environment. The cmdlets and parameters were checked against official AWS documentation.
