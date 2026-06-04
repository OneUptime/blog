# Validation Summary: How to Configure AKS Defender for Runtime Threat Detection

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Defender for Containers
- Microsoft Defender for Cloud
- Azure Container Registry
- Azure CLI
- Azure Policy
- Azure Monitor alerts
- Microsoft Sentinel
- Log Analytics and Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Defender for Containers architecture: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-architecture
- Enable Defender for Containers in Microsoft Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-enable-plan
- Deploy Defender sensor and Azure Policy to clusters using Azure CLI: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-deploy-azure-cli
- Verify Defender for Containers deployment: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-verify-deployment
- Vulnerability assessments for Defender for Containers: https://learn.microsoft.com/en-us/azure/defender-for-cloud/agentless-vulnerability-assessment-azure
- Azure CLI reference for `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Azure CLI reference for `az security assessment`: https://learn.microsoft.com/en-us/cli/azure/security/assessment
- Azure CLI reference for `az security sub-assessment`: https://learn.microsoft.com/en-us/cli/azure/security/sub-assessment
- Azure CLI reference for `az security alert`: https://learn.microsoft.com/en-us/cli/azure/security/alert
- Azure CLI reference for `az security alerts-suppression-rule`: https://learn.microsoft.com/en-us/cli/azure/security/alerts-suppression-rule
- Azure CLI reference for Microsoft Sentinel data connectors: https://learn.microsoft.com/en-us/cli/azure/sentinel/data-connector
- Azure CLI reference for Azure Monitor action groups and activity log alerts: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group and https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert
- Microsoft Defender for Cloud workflow automation quickstart: https://learn.microsoft.com/en-us/azure/defender-for-cloud/quickstart-automation-alert
- AKS trusted access documentation: https://learn.microsoft.com/en-us/azure/aks/trusted-access-feature
- Azure CLI reference for JIT policies: https://learn.microsoft.com/en-us/cli/azure/security/jit-policy

## Issues Found
- The post referred to the runtime component as a generic Defender agent and used outdated or incorrect pod/DaemonSet names. Updated the terminology to Defender sensor and replaced deployment checks with current `az aks show`, `kubectl get pods -l app=defender`, and `az aks update --enable-defender` examples.
- The subscription enablement command did not enable the relevant Defender for Containers components. Added current pricing extensions for the sensor, Kubernetes discovery, and registry vulnerability assessment.
- The vulnerability scanning section used the deprecated `ContainerRegistry` Defender plan and checked an unrelated ACR quarantine policy. Replaced it with the current `Containers` plan registry assessment extension and the documented registry vulnerability assessment ID.
- The image scanning examples attempted to create an ACR task that ran `az security assessment create`, which creates customer-managed assessments and does not trigger Defender scanning. Replaced it with an ACR import/push example and clarified that Defender scans supported registries automatically after push/import and during periodic rescans.
- The runtime threat detection section used non-existent per-alert enablement commands. Replaced those commands with Defender sensor verification and enablement commands.
- Several `az security assessment` examples used unsupported `--resource-group` arguments. Removed those arguments.
- The recommendations section referenced Kubernetes pod security policies, which are removed from modern Kubernetes, and used a non-resolvable policy set name. Replaced the recommendation wording and used Azure CLI to resolve a Kubernetes security policy set before assignment.
- The alert rule example used a metric alert condition that is not valid for Defender security alert severity. Replaced it with an activity log security event alert example and added a Defender for Cloud workflow automation ARM resource for high-severity alert automation.
- The Logic App automation snippet called a non-existent AKS pod quarantine endpoint. Replaced it with a supported `Microsoft.Security/automations` resource that triggers a Logic App from Defender for Cloud alerts.
- Several `az security alert show/update` examples omitted the required `--location` argument or used invalid status values. Added `--location` and changed the dismissal status to `dismiss`.
- The network investigation example assumed a Defender-specific Network Watcher flow log. Replaced it with AKS activity-log querying.
- The Microsoft Sentinel connector command used unsupported `--kind` and `--data-types` arguments. Replaced it with the current `--data-connector-id` and `--azure-security-center` syntax.
- The JIT section used unsupported `az security jit-policy create` and `request` commands. Replaced them with supported list/show commands and clarified that JIT configuration and requests are handled in Defender for Cloud.
- Monitoring and troubleshooting examples used unsupported Defender labels, a non-existent `defender-status` executable, and a non-existent `SecurityScanDuration` AKS metric. Replaced these with current pod label checks, Defender profile verification, logs, and a valid AKS metric example.
- The false-positive suppression command used the wrong command group and parameters. Replaced it with `az security alerts-suppression-rule update` and current parameter names.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn CLI references and current Defender for Cloud documentation rather than local `az --help` output.
