# Validation Summary: How to Configure Microsoft Defender for Cloud Just-in-Time VM Access to Reduce

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for Servers Plan 2
- Just-in-time VM access
- Azure Network Security Groups
- Azure Firewall
- Azure REST API
- Azure CLI `az rest`
- Azure Activity Log and KQL
- Azure Logic Apps
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Just-in-time machine access - https://learn.microsoft.com/en-us/azure/defender-for-cloud/just-in-time-access-overview
- Microsoft Learn: Enable just-in-time access - https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-just-in-time-access
- Microsoft Learn REST API: Jit Network Access Policies - Create Or Update - https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies/create-or-update?view=rest-defenderforcloud-2020-01-01
- Microsoft Learn REST API: Jit Network Access Policies - Initiate - https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies/initiate?view=rest-defenderforcloud-2020-01-01
- Microsoft Learn REST API: Jit Network Access Policies operations - https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies?view=rest-defenderforcloud-2020-01-01

## Issues Found
- The post described JIT access as managing only NSG rules. Current Microsoft documentation also covers supported Azure Firewall configurations, so the overview and prerequisites were updated to mention NSG or Azure Firewall.
- The prerequisites said NSGs are attached to VMs. In Azure, NSGs are associated with network interfaces or subnets, so this was corrected.
- The permissions summary was too narrow. Microsoft documents additional read permissions needed to request JIT access, so the prerequisite was expanded to include the documented actions.
- The unsupported-VM explanation implied missing NSGs were the usual cause. Microsoft lists other cases, including classic VMs, missing NSG or Azure Firewall configuration, and policy settings, so this was corrected.
- The protocol description said "both" without naming the API value. The REST examples use `*` for both protocols, so that was clarified.
- The standalone CLI request example used `date -u -v+1H`, which is BSD/macOS syntax and fails in common Linux environments such as Azure Cloud Shell. It was changed to GNU `date -u -d '+1 hour'`, matching the later GitHub Actions example.
- The approval workflow section implied that an Activity Log-triggered Logic App could approve a JIT request before the port opens. JIT requests are opened by authorized users when initiated, so the section was corrected to describe a separate approval front end that calls the JIT API only after approval.
- The query for "currently active access windows" returned configured policy ports, not JIT request status. The wording and query were updated to use `properties.requests` and describe recorded request status.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI behavior was reviewed against Microsoft REST API documentation and shell syntax rather than executed end to end. The REST API version `2020-01-01` remains the documented version for these JIT network access policy examples.
