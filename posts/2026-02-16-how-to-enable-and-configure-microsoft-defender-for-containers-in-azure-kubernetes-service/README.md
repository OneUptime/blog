# How to Enable and Configure Microsoft Defender for Containers in Azure Kubernetes Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Defender, Kubernetes, AKS, Container Security, DevSecOps, Cloud Security

Description: Step-by-step instructions for enabling Microsoft Defender for Containers on AKS clusters, configuring runtime threat detection, and managing vulnerability findings.

---

Running containers in production without security monitoring is like running servers without antivirus in the early 2000s - you are blind to threats until something breaks. Microsoft Defender for Containers provides vulnerability scanning for container images, runtime threat detection for Kubernetes clusters, and security posture assessments. In this post, I will cover how to enable it on Azure Kubernetes Service and configure it for practical use.

## What Defender for Containers Covers

The service has three main capabilities:

**Vulnerability Assessment:** Scans container images in Azure Container Registry (ACR) for known CVEs and provides remediation guidance. Scanning happens when images are pushed and on a continuous basis for images already in the registry.

**Runtime Threat Detection:** A Defender sensor runs on each AKS node and monitors for suspicious activities like:
- Crypto mining processes
- Reverse shell connections
- Suspicious file downloads
- Privilege escalation attempts
- Known attack tool execution

**Security Posture:** Evaluates your cluster configuration against the Kubernetes security benchmark and flags misconfigurations like running containers as root, exposed dashboards, or missing network policies.

## Prerequisites

- An Azure subscription with Microsoft Defender for Cloud enabled (or the ability to enable it)
- At least one AKS cluster running Kubernetes 1.24 or later
- An Azure Container Registry (ACR) if you want image vulnerability scanning
- Owner or Security Admin role on the subscription

## Step 1: Enable Defender for Containers at the Subscription Level

The simplest approach is to enable Defender for Containers at the subscription level, which covers all AKS clusters in that subscription.

Go to the Azure portal, open Microsoft Defender for Cloud, and click on "Environment settings." Select your subscription and find "Containers" in the plans list. Toggle it to "On."

Using Azure CLI:

```bash
# Enable Defender for Containers on a subscription
# This covers all AKS clusters in the subscription
az security pricing create \
  --name Containers \
  --tier Standard \
  --subscription "your-subscription-id"

# Verify it is enabled
az security pricing show \
  --name Containers \
  --query "{Plan:name, Tier:pricingTier}" \
  --output table
```

When you enable the plan, Defender automatically starts scanning container images in ACR registries in the same subscription.

## Step 2: Deploy the Defender Sensor to AKS

The runtime threat detection requires a Defender sensor (DaemonSet) running on each node in your AKS cluster. When you enable the plan, Defender can auto-provision this sensor, but you can also deploy it manually for more control.

**Auto-provisioning (recommended for most cases):**

In the Defender for Cloud environment settings, under the Containers plan, enable "Defender DaemonSet" auto-provisioning. Defender will deploy the sensor to all existing and future AKS clusters in the subscription.

**Manual deployment using Azure CLI:**

```bash
# Enable the Defender security profile on a specific AKS cluster
az aks update \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --enable-defender

# Verify the Defender profile is enabled
az aks show \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --query "securityProfile.defender" \
  --output json
```

After enabling, verify the sensor pods are running:

```bash
# Check that Defender pods are running on each node
kubectl get pods -n kube-system -l app=microsoft-defender

# You should see one pod per node, all in Running status
# Example output:
# NAME                          READY   STATUS    RESTARTS   AGE
# microsoft-defender-xxxxx      1/1     Running   0          5m
# microsoft-defender-yyyyy      1/1     Running   0          5m
```

## Step 3: Configure the Log Analytics Workspace

Defender for Containers sends its security data to a Log Analytics workspace. By default, it uses a workspace managed by Defender. You can change this to your own workspace if you want to query the data alongside other logs.

```bash
# Enable Defender with a custom Log Analytics workspace
az aks update \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --enable-defender \
  --defender-config logAnalyticsWorkspaceResourceId="/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/myWorkspace"
```

## Step 4: Set Up Image Vulnerability Scanning

If your AKS cluster pulls images from Azure Container Registry, Defender for Containers automatically scans those images. You do not need to configure anything extra beyond enabling the plan.

For images from external registries (Docker Hub, GitHub Container Registry, etc.), Defender scans them when they are pulled into the cluster. The runtime sensor detects the image pull and triggers a scan.

To check vulnerability findings for a specific image:

```bash
# List vulnerability findings from Defender for Cloud
# Filter for container image assessments
az security sub-assessment list \
  --assessed-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/myACR" \
  --assessment-name "dbd0cb49-b563-45e7-9724-889e799fa648" \
  --query "[].{CVE:id, Severity:status.severity, Description:displayName}" \
  --output table
```

You can also view findings in the portal under Defender for Cloud, then Recommendations. Look for "Container registry images should have vulnerability findings resolved."

## Step 5: Configure Security Alerts

Defender for Containers generates security alerts when it detects threats. Some alerts you might see:

- **Digital currency mining container detected:** A container is running known mining software
- **Privileged container detected:** A pod is running with the `privileged` security context
- **New container in the kube-system namespace:** Something unexpected deployed to the system namespace
- **Connection to a known malicious IP:** A pod is communicating with a threat-intelligence-flagged IP

To manage alert routing, configure email notifications in Defender for Cloud:

```bash
# Set up email notifications for security alerts
az security contact create \
  --name "default" \
  --emails "security-team@contoso.com" \
  --alert-notifications on \
  --alerts-to-admins on
```

You can also forward alerts to Microsoft Sentinel for SIEM integration, or to a Logic App for custom automation.

## Step 6: Implement Admission Control with Azure Policy

Defender for Containers works alongside Azure Policy for Kubernetes to prevent insecure workloads from being deployed in the first place. While Defender detects threats at runtime, Azure Policy blocks them at admission time.

Enable the Azure Policy add-on for AKS:

```bash
# Enable Azure Policy add-on for AKS
az aks enable-addons \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --addons azure-policy

# Verify the add-on is running
kubectl get pods -n kube-system -l app=azure-policy
kubectl get pods -n gatekeeper-system
```

Then assign built-in Kubernetes security policies:

```bash
# Assign the Kubernetes cluster pod security baseline initiative
az policy assignment create \
  --name "aks-pod-security-baseline" \
  --display-name "Kubernetes Pod Security Baseline" \
  --policy-set-definition "a8640138-9b0a-4a28-b8cb-1666c838647d" \
  --scope "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.ContainerService/managedClusters/myAKSCluster" \
  --params '{"effect": {"value": "Audit"}}'
```

This initiative includes policies that audit or deny:
- Running containers as root
- Using privileged security context
- Mounting host paths
- Using host networking
- Missing resource limits

## Step 7: Review Security Recommendations

After Defender has been running for a few hours, check the security recommendations:

Go to Defender for Cloud, then Recommendations. Filter by resource type "Kubernetes" or "Container registries." Common recommendations include:

- Cluster should have RBAC enabled
- Network policies should be defined
- Container images should not run as root
- Kubernetes services should not use default namespace
- Container CPU and memory limits should be configured

Each recommendation includes a severity rating, affected resources, and step-by-step remediation guidance.

## Handling Alert Noise

In the first few days after enabling Defender, you will likely see alerts for legitimate activities. For example, if your CI/CD pipeline deploys to the kube-system namespace, you might get "New container in kube-system" alerts.

Handle this with alert suppression rules:

1. Go to Defender for Cloud, then Security Alerts
2. Find the alert you want to suppress
3. Click "Suppress" and define the conditions (specific cluster, specific image name, etc.)
4. Set an expiration date so the suppression does not last forever

Be careful with suppression. Only suppress alerts you have investigated and confirmed as benign. Review suppressions quarterly.

## Cost Considerations

Defender for Containers is billed per vCore per hour for runtime protection, plus per-image-scan for vulnerability assessment. For a typical AKS cluster:

- Runtime protection: Based on the total vCores across all nodes
- Image scanning: First 500 scans per month are included, then per-scan pricing

You can check the current pricing in the Defender for Cloud pricing page. For dev/test clusters, you might want to enable only the vulnerability scanning component and skip runtime protection to save costs.

## Monitoring Defender Health

Make sure the Defender sensor stays healthy over time:

```bash
# Check Defender sensor logs for errors
kubectl logs -n kube-system -l app=microsoft-defender --tail=50

# Check if the sensor DaemonSet has any unhealthy pods
kubectl get daemonset -n kube-system microsoft-defender-collector
```

If nodes are added to the cluster, the DaemonSet automatically deploys the sensor to new nodes. If you notice gaps in coverage, check that the DaemonSet is not hitting resource limits or scheduling constraints.

## Summary

Microsoft Defender for Containers adds essential security monitoring to your AKS clusters. Enable it at the subscription level, deploy the sensor to your clusters, configure alert notifications, and layer Azure Policy on top for admission control. The combination of runtime detection, image scanning, and posture assessment gives you visibility across the full container lifecycle from image build to production runtime.
