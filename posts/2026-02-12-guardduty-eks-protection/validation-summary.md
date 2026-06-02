# Validation Summary: How to Set Up GuardDuty EKS Protection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon GuardDuty
- Amazon EKS
- Kubernetes
- AWS CLI
- Terraform AWS Provider
- Amazon EventBridge
- AWS Lambda

## Sources Consulted
- Amazon GuardDuty Runtime Monitoring: https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring.html
- Amazon GuardDuty EKS Runtime Monitoring: https://docs.aws.amazon.com/guardduty/latest/ug/eks-runtime-monitoring-guardduty.html
- AWS CLI `guardduty update-detector`: https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-detector.html
- AWS CLI `guardduty update-organization-configuration`: https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-organization-configuration.html
- AWS CLI `guardduty list-coverage`: https://docs.aws.amazon.com/cli/latest/reference/guardduty/list-coverage.html
- Amazon GuardDuty EKS Protection finding types: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-finding-types-eks-audit-logs.html
- Amazon GuardDuty Runtime Monitoring finding types: https://docs.aws.amazon.com/guardduty/latest/ug/findings-runtime-monitoring.html
- Amazon GuardDuty API `DetectorFeatureConfiguration`: https://docs.aws.amazon.com/guardduty/latest/APIReference/API_DetectorFeatureConfiguration.html
- Amazon GuardDuty API `Resource`: https://docs.aws.amazon.com/guardduty/latest/APIReference/API_Resource.html
- Terraform AWS Provider `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature

## Issues Found
- The Terraform example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with `aws_guardduty_detector_feature` for `EKS_AUDIT_LOGS`, which is the current Terraform AWS Provider pattern.
- The Runtime Monitoring commands used `EKS_RUNTIME_MONITORING`. This is still supported for EKS-only coverage, but AWS recommends `RUNTIME_MONITORING` because it includes EKS threat detection. Updated standalone and organization examples to use `RUNTIME_MONITORING` with `EKS_ADDON_MANAGEMENT`.
- The manual EKS add-on command pinned a specific old-looking add-on version. Removed `--addon-version` so EKS selects the default compatible version.
- The cluster tag section implied only inclusion tags. Added the `GuardDutyManaged=false` exclusion case to match AWS's current tag-based management behavior.
- Runtime finding examples used invalid names such as `Runtime:Container/CryptoMiner`. Replaced them with current GuardDuty Runtime Monitoring finding type names such as `Impact:Runtime/CryptoMinerExecuted` and `Execution:Runtime/ReverseShell`.
- The EventBridge pattern matched the invalid `Runtime:Container/` prefix. Updated it to match GuardDuty Runtime Monitoring findings for EKS clusters using `detail.resource.resourceType` and `detail.service.featureName`.
- The Lambda text said it killed the offending pod, but the code only published an SNS alert. Updated the description and removed unused imports/comments so the explanation matches the code.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference rather than local `--help` output.
