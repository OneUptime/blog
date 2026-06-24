# How to Restrict KubeShell to Admin Users in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Security, KubeShell, RBAC

Description: Learn how to restrict Portainer's KubeShell terminal access to administrator users only, preventing non-admin users from bypassing namespace-level access controls.

## Introduction

Portainer's KubeShell provides a browser-based kubectl terminal directly within the UI. The shell is preloaded with a kubeconfig for the user's Portainer context. Portainer Business Edition lets administrators disable KubeShell for non-admin users when they want to reserve browser-based shell access for administrators only.

## Prerequisites

- Portainer Business Edition (BE)
- Admin access to Portainer
- A Kubernetes environment configured in Portainer

## Why Restrict KubeShell?

The KubeShell runs with credentials scoped to the user's Portainer access level. Even so, it still gives users direct `kubectl` and `helm` access from inside Portainer, which some teams prefer to reserve for administrators. Restricting it can help:

- Reduce interactive shell access in the Portainer UI
- Keep browser-based Kubernetes CLI access limited to Portainer administrators
- Push non-admin CLI workflows toward downloaded, scoped kubeconfig files

Restricting KubeShell to admins adds a clear security boundary.

## Step 1: Access Portainer Settings

1. Log into Portainer as an **administrator**.
2. From the left sidebar, click **Settings**.
3. On the **General** page, scroll to the Kubernetes settings section.

## Step 2: Restrict KubeShell to Admin Users

1. In the Kubernetes settings section, find **KubeShell**.
2. Enable the option that disables KubeShell access for non-admin users.
3. Click **Apply Changes**.

Once enabled:
- This is a global Portainer setting, not an environment-specific option
- Portainer administrators can still open **kubectl shell** from the menu
- Non-admin users will no longer have access to **kubectl shell**
- Non-admin users can still use `kubectl` locally via downloaded kubeconfig files (if that access is allowed)

## Step 3: Verify the Restriction Is Active

Log out and log back in as a **non-admin user** who has access to the Kubernetes environment:

1. Navigate to the Kubernetes environment.
2. Check the menu for **kubectl shell**.
3. The shell should no longer be available to that user.

As an admin, you can also confirm the setting via the Portainer API:

```bash
# Verify via Portainer API - check global settings

TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Get Portainer settings
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/settings" | \
  jq '.DisableKubeShell'
```

## Step 4: Understand the Scope of the Restriction

Portainer documents this as an admin-versus-non-admin setting. There is no per-user or per-team allowlist for KubeShell in this setting:

1. If the restriction is enabled, only Portainer administrators retain KubeShell access.
2. Environment administrators are a separate built-in role, but Portainer's KubeShell setting is documented as an admin-versus-non-admin control rather than a per-role allowlist.
3. If non-admin users need CLI access, provide scoped kubeconfig files instead.

```text
Portainer Role Hierarchy:
- Global Admin      → Full access to Portainer settings and environments
- Environment Admin → Full access within a specific environment, but not Portainer settings
- Standard User     → Access limited by assigned Portainer role and namespace scope
```

## Step 5: Audit Related Activity

Portainer BE provides separate **Activity** and **Authentication** logs:

1. Go to **Logs** → **Activity** to review actions taken in Portainer.
2. Use **Logs** → **Authentication** to review sign-ins separately.
3. Filter by date range, user, or environment as needed.

## Alternative: Provide Scoped kubectl Access Instead

For users who need CLI access, provide scoped kubeconfig files instead of KubeShell:

1. Keep KubeShell restricted to admins.
2. Ensure kubeconfig download is allowed under **Settings** → **General** → **Kubeconfig**.
3. Allow users to download personal kubeconfig files scoped to their Portainer permissions.
4. Users get familiar CLI access without browser-based shell access inside Portainer.

```bash
# Example for a user whose Portainer access is limited to selected namespaces
kubectl get pods -n production    # Allowed when the user has access to production
kubectl get nodes                 # Denied without cluster-wide permissions
kubectl get pods -n other-team    # Denied when that namespace is not in the user's scope
```

## Conclusion

Restricting KubeShell to admin users in Portainer is a straightforward global setting that limits browser-based shell access to Portainer administrators. Non-admin users can still get CLI access through scoped kubeconfig files when kubeconfig download is enabled, maintaining productivity while keeping interactive shell access more tightly controlled. Combine this with appropriate RBAC and short kubeconfig token expiry for a defense-in-depth approach.
