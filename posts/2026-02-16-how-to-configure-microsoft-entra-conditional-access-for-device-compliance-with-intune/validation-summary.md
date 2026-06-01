# Validation Summary: How to Configure Microsoft Entra Conditional Access

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Microsoft Entra ID
- Conditional Access
- Microsoft Intune device compliance policies
- Microsoft Graph API and Microsoft Graph PowerShell
- PowerShell
- Kusto Query Language (KQL)
- Windows, iOS/iPadOS, macOS, and Android device compliance

## Sources Consulted
- Microsoft Intune device compliance overview: https://learn.microsoft.com/en-us/intune/device-security/compliance/overview
- Require device compliance with Conditional Access: https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance
- Device-based Conditional Access policies with Intune: https://learn.microsoft.com/en-us/intune/device-security/conditional-access-integration/device-based-policies
- Configure actions for noncompliant devices in Intune: https://learn.microsoft.com/en-us/intune/device-security/compliance/configure-noncompliance-actions
- Microsoft Graph windows10CompliancePolicy beta resource: https://learn.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-windows10compliancepolicy?view=graph-rest-beta
- Microsoft Graph iosCompliancePolicy v1.0 resource: https://learn.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-ioscompliancepolicy?view=graph-rest-1.0
- Microsoft Graph deviceComplianceScheduledActionForRule and deviceComplianceActionItem resources: https://learn.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-devicecompliancescheduledactionforrule?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-devicecomplianceactionitem?view=graph-rest-1.0
- Microsoft Graph create conditionalAccessPolicy: https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-policies?view=graph-rest-1.0
- Conditional Access filter for devices: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-condition-filters-for-devices
- Conditional Access session controls and Graph session-control resources: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-session, https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesssessioncontrols?view=graph-rest-1.0, https://learn.microsoft.com/en-us/graph/api/resources/cloudappsecuritysessioncontrol?view=graph-rest-1.0, and https://learn.microsoft.com/en-us/graph/api/resources/signinfrequencysessioncontrol?view=graph-rest-1.0
- Windows 11 release information: https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information

## Issues Found
- The compliance flow implied that Microsoft Entra ID directly queries Intune at sign-in time. Updated the explanation and sequence diagram to state that Intune reports compliance status to Microsoft Entra ID, and Conditional Access evaluates that reported status.
- The prerequisites listed Security Administrator but not Conditional Access Administrator. Updated the role requirement to include Conditional Access Administrator or Security Administrator for Conditional Access work, plus Intune Administrator for Intune policy work.
- The Windows minimum OS example used Windows 10 22H2 build 10.0.19045 as a supported version. As of the 2026-06-01 review date, this is no longer a good supported baseline example. Updated it to Windows 11 24H2 build 10.0.26100.
- The Windows compliance PowerShell example used properties that are not available in the Microsoft Graph v1.0 windows10CompliancePolicy resource, including FirewallEnabled and related Defender fields. Updated the example to use the Microsoft Graph beta resource and current property names such as activeFirewallRequired, antivirusRequired, defenderEnabled, signatureOutOfDate, and rtpEnabled.
- The Graph request payloads mixed PascalCase property names with raw JSON-style request bodies. Updated affected examples to use the lower camel-case names documented by Microsoft Graph.
- The assignment example depended on whichever earlier snippet last populated $policy. Updated it to use an explicit COMPLIANCE_POLICY_ID placeholder so the snippet is self-contained and does not accidentally assign the wrong policy.
- The actions-for-noncompliance section described retiring a device as automatic after the schedule. Updated it to "Add device to retire list" and clarified that an administrator must explicitly retire devices from that list before company data is removed and Intune management is removed.
- The device filter example compared device.isCompliant to an unquoted Boolean-like value. Updated it to compare against the documented string value "True" and kept the negative-operator pattern used to include unregistered devices.
- The unmanaged-device session-control example claimed application-enforced restrictions provide browser-only access with no download capability. Replaced it with the documented cloudAppSecurity blockDownloads session control and retained sign-in frequency with the documented frequencyInterval value.
- The KQL grace-period count used ComplianceState == "InGracePeriod". Updated it to calculate grace-period devices from InGracePeriodUntil, which better matches Intune compliance reporting fields.
- The notification template navigation path was outdated. Updated it to Endpoint security > Device compliance > Notifications.

## Review Notes
- The Windows compliance PowerShell example intentionally uses the Microsoft Graph beta endpoint because some Windows compliance settings shown in the article are exposed there rather than in the v1.0 windows10CompliancePolicy schema. Microsoft recommends v1.0 when possible, so this should be revisited if those fields become available in v1.0.
- The Defender antimalware minimum version is represented as a placeholder because organizations should set that value from their own tested security baseline rather than copying a stale static version.
