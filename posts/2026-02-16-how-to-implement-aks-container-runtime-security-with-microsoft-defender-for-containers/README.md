# How to Implement AKS Container Runtime Security with Microsoft Defender for Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Microsoft Defender, Security, Container Runtime, Kubernetes, Threat Detection, Azure

Description: Learn how to enable and configure Microsoft Defender for Containers on AKS for runtime threat detection, vulnerability scanning, and security posture management.

---

Running containers in production without runtime security monitoring is like deploying a web application without a firewall. Everything works fine until someone finds a vulnerability in one of your base images, a compromised dependency opens a reverse shell, or an attacker exploits a misconfigured RBAC policy. By the time you notice through application-level monitoring, the damage is done.

Microsoft Defender for Containers provides runtime threat detection, image vulnerability scanning, and security posture management for AKS clusters. It watches for suspicious behavior at the container level - things like crypto mining processes, privilege escalation attempts, and communication with known malicious IPs. This guide covers enabling Defender, understanding its capabilities, and responding to alerts.

## What Defender for Containers Does

Defender for Containers has three main capabilities:

**Runtime Threat Detection**: A security agent runs on each node and monitors container behavior in real time. It detects suspicious activities like unexpected process execution, unusual network connections, and privilege escalation.

**Vulnerability Assessment**: Scans container images in Azure Container Registry for known CVEs and provides remediation guidance. Scans are triggered automatically when images are pushed and on a regular schedule.

**Security Posture Management**: Evaluates your AKS cluster configuration against security best practices and flags misconfigurations like overly permissive RBAC, missing network policies, or containers running as root.

## Prerequisites

- An AKS cluster running Kubernetes 1.24 or later
- An Azure subscription with Defender for Containers enabled (or a trial)
- Azure CLI 2.50 or later
- Owner or Contributor access to the subscription

## Step 1: Enable Defender for Containers

You can enable Defender at the subscription level (covers all AKS clusters) or on individual clusters.

### Enable at Subscription Level

```bash
# Enable Defender for Containers on the entire subscription
az security pricing create \
  --name Containers \
  --tier Standard

# Verify it is enabled
az security pricing show --name Containers --query "pricingTier" -o tsv
```

### Enable the Defender Profile on AKS

The Defender profile deploys the security agent to your AKS cluster.

```bash
# Enable the Defender profile on a specific AKS cluster
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-defender

# Verify the Defender profile is installed
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "securityProfile.defender" -o json
```

## Step 2: Verify the Defender Agent

After enabling the Defender profile, the security agent is deployed as a DaemonSet on your cluster.

```bash
# Check that the Defender agent pods are running
kubectl get pods -n kube-system -l app=microsoft-defender

# Check the DaemonSet status
kubectl get daemonset -n kube-system -l app=microsoft-defender

# View Defender agent logs
kubectl logs -n kube-system -l app=microsoft-defender --tail=20
```

You should see one Defender agent pod per node. If any pods are not running, check the events:

```bash
# Check for issues with the Defender agent
kubectl describe pods -n kube-system -l app=microsoft-defender
```

## Step 3: Enable Vulnerability Scanning for ACR

Defender automatically scans images in your ACR registries when pushed and on a recurring schedule.

```bash
# Enable Defender for Container Registries (if not already covered by Containers plan)
az security pricing create \
  --name ContainerRegistry \
  --tier Standard

# Check scan results for a specific registry
az security sub-assessment list \
  --assessed-resource-type "ContainerRegistryVulnerability" \
  --query "[].{image:additionalData.imageDigest, cve:id, severity:status.severity}" \
  -o table
```

## Step 4: Configure Security Policies

Customize which security recommendations are active for your AKS clusters.

### Azure Policy Integration

Defender integrates with Azure Policy to enforce security standards. Enable the policy addon on your cluster:

```bash
# Enable the Azure Policy addon on AKS
az aks enable-addons \
  --addons azure-policy \
  --resource-group myResourceGroup \
  --name myAKSCluster

# Verify the policy addon is running
kubectl get pods -n kube-system -l app=azure-policy
```

### Apply Security Policy Initiatives

Azure provides built-in policy initiatives for Kubernetes security:

```bash
# Assign the Kubernetes cluster security baseline
az policy assignment create \
  --name "k8s-security-baseline" \
  --policy-set-definition "a8640138-9b0a-4a28-b8cb-1666c838647d" \
  --scope $(az aks show -g myResourceGroup -n myAKSCluster --query id -o tsv) \
  --params '{"effect": {"value": "Audit"}}'
```

Common policies include:
- Do not allow privileged containers
- Do not allow containers running as root
- Require resource limits on containers
- Do not allow host network or host PID usage
- Require network policies on namespaces

## Step 5: Review Security Alerts

When Defender detects suspicious behavior, it generates security alerts visible in the Azure portal, Azure Security Center, and through Azure Monitor.

```bash
# List recent security alerts for your subscription
az security alert list \
  --query "[?contains(properties.compromisedEntity, 'myAKSCluster')].{ \
    alertName: properties.alertDisplayName, \
    severity: properties.severity, \
    status: properties.status, \
    time: properties.timeGeneratedUtc \
  }" -o table

# Get details of a specific alert
az security alert show --name <alert-id> --location <location>
```

### Common Runtime Alerts

Here are alerts you should know about and how to respond:

**Crypto mining detected**: Defender detected a process consistent with cryptocurrency mining. Response: Immediately isolate the affected pod, investigate the container image for compromised dependencies, and rotate any secrets the pod had access to.

**Suspicious process execution**: An unexpected binary was executed inside a container. Response: Check if the process is legitimate (maybe a debug tool) or malicious. Review the container image and deployment pipeline.

**Reverse shell detected**: A container established a connection pattern consistent with a reverse shell. Response: This is high severity. Isolate the pod immediately, investigate the entry point, and audit network policies.

**Privilege escalation detected**: A process inside a container attempted to escalate privileges. Response: Review the pod security context. Ensure pods are not running as root and do not have CAP_SYS_ADMIN.

## Step 6: Investigate Alerts with Workload Details

When investigating an alert, gather context about the affected workload:

```bash
# Get the pod details if the pod is still running
kubectl get pod <pod-name> -n <namespace> -o yaml

# Check the deployment or replicaset that owns the pod
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.metadata.ownerReferences[0].name}'

# Check the container image and its digest
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[*].image}'

# Check recent events for the pod
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>
```

## Step 7: Implement Security Hardening Based on Recommendations

Defender provides security recommendations. Implement them systematically.

### Pod Security Standards

Apply Pod Security Standards to prevent common misconfigurations:

```yaml
# namespace-security.yaml
# Apply restricted pod security standard to a namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce restricted security standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # Warn on violations in other namespaces
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

### Secure Pod Configuration

```yaml
# secure-deployment.yaml
# Deployment following Defender security recommendations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      # Do not use the default service account
      serviceAccountName: app-service-account
      automountServiceAccountToken: false
      securityContext:
        # Run as non-root
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: myregistry.azurecr.io/secure-app:v1@sha256:abc123...
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

## Step 8: Set Up Alert Notifications

Route security alerts to your team's communication channels.

```bash
# Create an action group for security notifications
az monitor action-group create \
  --resource-group myResourceGroup \
  --name SecurityAlerts \
  --short-name SecAlerts \
  --email-receiver security-team security-team@company.com

# Configure Defender to use the action group
az security automation create \
  --name "AKS-Security-Notifications" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/<sub-id>" \
  --actions "[{\"actionGroupResourceId\":\"/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Insights/actionGroups/SecurityAlerts\"}]" \
  --sources "[{\"eventSource\":\"Alerts\"}]"
```

## Cost and Performance Impact

Defender for Containers costs around $7 per vCPU per month for the runtime protection component. The vulnerability scanning for ACR images is included.

The Defender agent typically uses 100-200MB of memory and minimal CPU per node. On large clusters, this adds up but is generally negligible compared to the total cluster resources.

The security agent runs in the background and does not add latency to your application traffic. It monitors system calls and network connections passively.

Microsoft Defender for Containers is the most practical way to add runtime security to your AKS clusters without building a custom security stack. Enable it, review the alerts and recommendations, and gradually harden your workloads based on what it finds. The initial wave of recommendations can be overwhelming, but working through them systematically improves your security posture significantly over time.
