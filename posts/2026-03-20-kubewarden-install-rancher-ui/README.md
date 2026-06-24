# How to Install Kubewarden from Rancher UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Rancher, Kubernetes, Policy, Security

Description: Learn how to install and configure Kubewarden directly from the Rancher UI using the Rancher Apps catalog for simplified policy enforcement setup.

## Introduction

Rancher provides a graphical way to install Kubewarden through the Kubewarden Rancher extension and the Apps workflow. This approach simplifies the installation process significantly - you can deploy Kubewarden without writing any Helm commands, configure all options through forms, and manage updates through the Rancher interface.

This guide covers the complete Kubewarden installation process using the Rancher UI, from prerequisites through policy server verification.

## Prerequisites

- A Rancher Manager installation with access to **Extensions**
- A Kubernetes cluster managed by Rancher
- Permissions to install Rancher extensions and cluster apps
- Internet access from the Rancher server and cluster nodes (or mirrored repositories for air-gapped installations)

## Step 1: Enable the Rancher Extensions Repository

Kubewarden's current Rancher UI installation flow starts from the Rancher Extensions Repository.

### Adding the Extensions Repository

1. In Rancher, open **Extensions**
2. Click **Enable**
3. Choose the option to add the Rancher Extensions Repository
4. Wait for the repository to become available

After the repository is enabled, the **Kubewarden** extension appears automatically in the Extensions list.

## Step 2: Install the Kubewarden Rancher Extension

Current Kubewarden releases do not require cert-manager for the controller installation. Instead, install the Kubewarden Rancher extension first:

1. Stay on the **Extensions** page
2. Find **Kubewarden**
3. Click **Install**
4. Wait for the extension to become active

## Step 3: Install Kubewarden into the Cluster

1. Navigate to the cluster where you want to install Kubewarden
2. Click **Kubewarden** in the cluster side menu
3. Follow the dashboard wizard until you reach the app installation step
4. Click **Install Kubewarden**
5. Rancher installs `rancher-kubewarden-controller` and automatically installs the companion `rancher-kubewarden-crds` release in the `cattle-kubewarden-system` namespace

If the **Install Kubewarden** button remains grayed out, refresh the page and return to the installation step.

## Step 4: Customize the Kubewarden Controller

1. Navigate to **Apps > Installed Apps**
2. Find `rancher-kubewarden-controller`
3. Click the three-dot menu
4. Click **Edit/Upgrade**
5. In the values editor, you can customize:
   ```yaml
   # Optional: enable HA for the controller
   replicas: 2
   ```
6. Click **Upgrade**

## Step 5: Install Kubewarden Defaults (Policy Server)

1. Navigate back to the cluster's **Kubewarden** dashboard
2. Click **Install Chart** to install `kubewarden-defaults`
3. Review the release settings. Rancher installs the chart in `cattle-kubewarden-system` by default
4. In the values editor, optionally configure:
   ```yaml
   policyServer:
     replicaCount: 2
     requests:
       cpu: "200m"
       memory: "256Mi"
     limits:
       cpu: "1"
       memory: "1Gi"
   ```
5. Click **Install**

## Step 6: Verify the Installation

### Via Rancher UI

1. Navigate to **Apps > Installed Apps**
2. Verify the Kubewarden apps show as **Deployed**:
   - `rancher-kubewarden-controller`
   - `rancher-kubewarden-defaults`
   - the companion `rancher-kubewarden-crds` release

### Via kubectl

```bash
# Check all Kubewarden pods

kubectl get pods -n cattle-kubewarden-system

# Verify the PolicyServer resource
kubectl get policyservers -n cattle-kubewarden-system

# Check the ValidatingWebhookConfiguration
kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io -l kubewarden
```

## Step 7: Apply Your First Policy via Rancher UI

After installation, you can apply policies directly from the Rancher UI:

1. Navigate to the cluster in Rancher
2. Open **Kubewarden > Cluster Admission Policies** in the sidebar
3. Or use **More Resources > policies.kubewarden.io > ClusterAdmissionPolicies**
4. Click **Create**

Alternatively, create a policy via kubectl:

```bash
# Apply a sample policy to test the installation
kubectl apply -f - <<EOF
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-privileged-pods
spec:
  policyServer: default
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.10
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mutating: false
EOF

# Check policy status
kubectl get clusteradmissionpolicy.policies.kubewarden.io no-privileged-pods
```

## Upgrading Kubewarden from Rancher UI

1. Navigate to **Apps > Installed Apps**
2. Find a Kubewarden app showing an upgrade is available
3. Click the three-dot menu
4. Click **Edit/Upgrade**
5. Review the new version and configuration
6. Click **Upgrade**

Upgrade in this order:
1. `rancher-kubewarden-crds`
2. `rancher-kubewarden-controller`
3. `rancher-kubewarden-defaults`

## Accessing Kubewarden Logs from Rancher

1. Navigate to your cluster in Rancher
2. Go to **Workloads > Pods**
3. Select namespace: `cattle-kubewarden-system`
4. Click on the policy server pod
5. Click **Logs** to view real-time logs

## Conclusion

Installing Kubewarden through the Rancher UI provides a streamlined experience that eliminates the need to manage Helm commands directly. The current Rancher-managed flow (Extension -> Controller/CRDs -> Defaults) ensures all components are installed in the correct order. Once installed, Kubewarden integrates naturally with Rancher's monitoring and logging capabilities, giving you a complete policy enforcement platform accessible through the familiar Rancher interface.
