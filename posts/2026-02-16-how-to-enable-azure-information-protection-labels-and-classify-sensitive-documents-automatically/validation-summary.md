# Validation Summary: How to Enable Azure Information Protection Labels

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Purview Information Protection
- Azure Information Protection / Azure Rights Management
- Sensitivity labels
- Auto-labeling policies
- Microsoft Purview Data Loss Prevention
- Security & Compliance PowerShell
- Unified audit log

## Sources Consulted
- Microsoft Learn: Learn about sensitivity labels - https://learn.microsoft.com/en-us/purview/sensitivity-labels
- Microsoft Learn: Create and configure sensitivity labels and their policies - https://learn.microsoft.com/en-us/purview/create-sensitivity-labels
- Microsoft Learn: Apply encryption using sensitivity labels - https://learn.microsoft.com/en-us/purview/encryption-sensitivity-labels
- Microsoft Learn: Automatically apply a sensitivity label to Microsoft 365 data - https://learn.microsoft.com/en-us/purview/apply-sensitivity-label-automatically
- Microsoft Learn: Azure Information Protection service description - https://learn.microsoft.com/en-us/office365/servicedescriptions/azure-information-protection
- Microsoft Learn: New-Label cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-label
- Microsoft Learn: New-LabelPolicy cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-labelpolicy
- Microsoft Learn: New-AutoSensitivityLabelPolicy cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-autosensitivitylabelpolicy
- Microsoft Learn: New-AutoSensitivityLabelRule cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-autosensitivitylabelrule
- Microsoft Learn: New-DlpCompliancePolicy cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-dlpcompliancepolicy
- Microsoft Learn: New-DlpComplianceRule cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-dlpcompliancerule
- Microsoft Learn: Search-UnifiedAuditLog cmdlet - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/search-unifiedauditlog
- Microsoft Learn: Audit log activities - https://learn.microsoft.com/en-us/purview/audit-log-activities

## Issues Found
- The prerequisites referred to "Azure Information Protection unified labeling enabled." The AIP unified labeling add-in/client path is retired or replaced for current Office labeling scenarios, so this was updated to built-in Microsoft 365 sensitivity labeling and the Microsoft Purview Information Protection client for File Explorer, PowerShell, and scanner scenarios.
- The licensing prerequisite was too narrow. It now mentions equivalent Microsoft Purview Information Protection licensing and clarifies that E5 or Plan 2 capabilities are needed for auto-labeling.
- The `New-LabelPolicy` example used `-Settings` keys for mandatory labeling, downgrade justification, and a default label. Microsoft documents `-Settings` as reserved for internal use on `New-LabelPolicy`, so the sample was narrowed to the supported label-publishing command.
- The DLP rule used a non-existent `-ContentContainsSensitivityLabels` parameter. It was replaced with the documented `-ContentContainsSensitiveInformation` sensitivity-label condition syntax.
- The DLP rule used `-BlockAccessScope "NotInOrganization"`, which is not a valid value. It was changed to `PerUser`, the documented value for blocking external users.
- The audit-log query used `SensitivityLabelChanged`, but Microsoft documents current Microsoft 365 app changes as `SensitivityLabelUpdated` and file-level events as `FileSensitivityLabelApplied`, `FileSensitivityLabelChanged`, and `FileSensitivityLabelRemoved`. The query was updated to include those operations.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some PowerShell examples still use organization-specific placeholders such as group names and label names; in a real tenant, admins should confirm exact label identities and group addresses before running them.
