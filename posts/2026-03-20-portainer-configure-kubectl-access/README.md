# How to Configure kubectl Access in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, kubectl, DevOps, Security

Description: Learn how to configure kubectl access through Portainer so developers can use the Kubernetes CLI with proper RBAC permissions tied to their Portainer credentials.

## Introduction

Portainer can act as a kubectl proxy, issuing Kubeconfig files scoped to individual users' access rights. This allows teams to use the standard `kubectl` CLI while Portainer enforces namespace-level RBAC policies. This guide covers enabling kubectl access, configuring per-user scopes, and distributing kubeconfig files to your team.

## Prerequisites

- Portainer BE (Business Edition) with a Kubernetes environment
- Admin access to Portainer
- kubectl installed on developer machines
- Users already created in Portainer and granted access to the Kubernetes environment

## Step 1: Enable kubectl Access in Portainer

1. Log into Portainer as admin.
2. Select **Settings** from the menu.
3. Scroll to the **Kubernetes settings** section.
4. Under **Kubeconfig**, set the desired **kubeconfig expiry** for exported kubeconfig files.
5. If needed, disable kubeconfig download for non-admin users.
6. Click **Apply Changes**.

## Step 2: Configure User Access Scopes

Each Portainer user can have their kubectl access scoped to specific namespaces:

1. Go to **Namespaces** within the Kubernetes environment.
2. On the namespace row, click **Manage access**.
3. Assign the namespace to a **team** or specific **users**.
4. Users with non-cluster-wide roles will only see and interact with namespaces they have been granted access to.

## Step 3: Users Download Their Kubeconfig

Users with kubeconfig download enabled can download their personal kubeconfig. Portainer must be accessed over HTTPS for the kubeconfig button to appear:

1. The user logs into Portainer and returns to the **Home** page.
2. Clicks the **kubeconfig** button.
3. Selects the environment they want access to.
4. Clicks **Download File**.

The downloaded file is pre-configured with:
- The Portainer API endpoint as the Kubernetes API server URL
- A unique, scoped access token
- Namespace restrictions based on their Portainer permissions

## Step 4: Using the Downloaded Kubeconfig

```bash
# Move kubeconfig to the default location

mv ~/Downloads/portainer-kubeconfig.yaml ~/.kube/config

# Or use it alongside an existing kubeconfig
export KUBECONFIG=~/.kube/config:~/Downloads/portainer-kubeconfig.yaml

# Merge kubeconfigs
kubectl config view --flatten > ~/.kube/merged-config
mv ~/.kube/merged-config ~/.kube/config

# Verify access
kubectl config get-contexts

# Switch to the Portainer context shown above
kubectl config use-context portainer-ctx-kubernetes

# Test connectivity
kubectl get namespaces
kubectl get pods -n your-namespace
```

## Step 5: Verify RBAC Scoping

Each user's kubeconfig includes credentials that map to their Portainer permissions:

```bash
# Check what the user can access
kubectl auth can-i list pods -n production
kubectl auth can-i create deployments -n production
kubectl auth can-i delete namespaces  # Should be denied for non-admins

# View current context
kubectl config current-context

# View cluster info
kubectl cluster-info
```

## Step 6: Set Kubeconfig Expiry (Admin)

For security, configure token expiry to force periodic re-authentication:

1. In **Settings**, find the **Kubeconfig** option under **Kubernetes settings**.
2. Set the desired expiry from the dropdown and click **Apply Changes**.
3. The new expiry only applies to newly generated kubeconfig files. Users must re-download their kubeconfig when it expires, and after any Portainer restart.

## Using the KubeShell Alternative

For users who don't need local kubectl access, Portainer provides a browser-based kubectl shell:

1. In the Kubernetes environment, click **kubectl shell** in the menu.
2. A terminal opens with `kubectl` and `helm` pre-authenticated to the cluster.
3. Access is automatically scoped to the user's Portainer permissions.

```bash
# KubeShell example - already authenticated
kubectl get pods -n my-namespace
kubectl logs deployment/myapp -n my-namespace --tail=50
kubectl rollout status deployment/myapp -n my-namespace
```

## Troubleshooting

```bash
# If kubectl reports unauthorized
kubectl config view  # Check token and server URL

# Test API connectivity through the current kubeconfig
kubectl version

# Re-download the kubeconfig if the token expired or Portainer restarted
```

## Conclusion

Portainer's kubectl proxy feature provides a secure and convenient way for teams to use the Kubernetes CLI with scoped access. Admins maintain control through Portainer's RBAC and namespace assignments, while developers get familiar kubectl workflows. Use token expiry to enforce security hygiene and the built-in KubeShell for quick ad-hoc commands.
