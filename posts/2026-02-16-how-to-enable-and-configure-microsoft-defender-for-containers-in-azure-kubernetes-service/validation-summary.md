# Validation Summary: How to Enable and Configure Microsoft Defender for Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Containers
- Microsoft Defender for Cloud
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure CLI
- Kubernetes
- Azure Policy for Kubernetes
- Log Analytics

## Sources Consulted
- Microsoft Learn: Enable Defender for Containers in Microsoft Defender for Cloud - https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-enable-plan
- Microsoft Learn: Deploy Defender for Containers on Azure (AKS) programmatically - https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-azure-enable-programmatically
- Microsoft Learn: Verify Defender for Containers deployment - https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-verify-deployment
- Microsoft Learn: Vulnerability assessments for Defender for Container supported environments - https://learn.microsoft.com/en-us/azure/defender-for-cloud/agentless-vulnerability-assessment-azure
- Microsoft Learn: Containers support matrix in Defender for Cloud - https://learn.microsoft.com/en-us/azure/defender-for-cloud/support-matrix-defender-for-containers
- Microsoft Learn: az security pricing CLI reference - https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Microsoft Learn: az security contact CLI reference - https://learn.microsoft.com/en-us/cli/azure/security/contact
- Microsoft Learn: Azure Policy for AKS - https://learn.microsoft.com/en-us/azure/aks/use-azure-policy
- Microsoft Azure: Defender for Cloud pricing - https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/

## Issues Found
- The prerequisites pinned AKS to Kubernetes 1.24 or later. Microsoft documents Defender support in terms of cloud-provider-supported Kubernetes versions, so this was changed to require a currently supported AKS Kubernetes version.
- The role prerequisite listed Owner or Security Admin. Microsoft documentation for AKS Defender deployment calls for Contributor or Security Admin permissions, so this was corrected.
- The Defender sensor verification commands used the wrong AKS pod label (`app=microsoft-defender`). Microsoft documents `app=defender` for AKS, so the verification and log commands were updated.
- The custom Log Analytics workspace example passed `--defender-config` as an inline key/value argument. Current Azure CLI reference describes this parameter as a path to a JSON file, so the post now shows a `defender.json` file and passes that file path.
- The external registry scanning description implied that every image pull immediately triggers a scan. Microsoft documents periodic running-image scans and component requirements, so the wording was corrected.
- The security contact command used outdated/simple flags (`--alert-notifications on` and `--alerts-to-admins on`). The Azure CLI now expects structured `--alert-notifications` and `--notifications-by-role` values, so the command was updated.
- The cost section claimed the first 500 image scans per month are included. Microsoft pricing describes an allowance based on charged vCore consumption, with additional scans billed per image digest, so the pricing description was corrected.
- The Defender DaemonSet health command used the wrong DaemonSet name (`microsoft-defender-collector`). Microsoft documents `microsoft-defender-collector-ds`, so the command was updated.

## Review Notes
The post is technically relevant and remains a valid implementation guide after the corrections. Azure Defender for Containers component names and pricing can change over time, so future reviews should re-check the Microsoft Learn pages and the Azure pricing page.
