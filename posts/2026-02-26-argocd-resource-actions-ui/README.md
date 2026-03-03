# How to Execute Resource Actions from the ArgoCD UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI

Description: Learn how to find, execute, and monitor resource actions from the ArgoCD web UI, including navigating the resource tree, using the actions dropdown, and understanding action results.

---

ArgoCD resource actions provide one-click operational capabilities directly from the web interface. Instead of switching to a terminal to run kubectl commands, you can restart deployments, scale replicas, promote rollouts, and execute custom operations right from the dashboard. But finding and using these actions in the UI is not always obvious, especially for teams new to ArgoCD.

This guide walks through every step of executing resource actions from the ArgoCD UI, from navigating to the right resource to confirming the action and verifying the result.

## Finding Resource Actions in the UI

Resource actions are available on individual resources within an application, not on the application itself. Here is how to get to them:

### Step 1: Open Your Application

From the ArgoCD main page, click on the application tile. This opens the application detail view showing the resource tree.

The resource tree displays all Kubernetes resources managed by the application, organized hierarchically. For example, an Application might show:

```text
Application
  - Deployment
    - ReplicaSet
      - Pod
      - Pod
  - Service
  - ConfigMap
  - Ingress
```

### Step 2: Select the Resource

Click on the specific resource you want to act on. For example, click on the Deployment node in the tree. This opens the resource detail panel on the right side of the screen (or as a full-page view depending on your layout).

### Step 3: Find the Actions Menu

In the resource detail view, look for the "Actions" button or dropdown in the toolbar at the top of the panel. It might appear as:

- A button labeled "Actions" with a dropdown arrow
- Three dots (...) for a context menu
- A kebab menu icon

The exact appearance depends on your ArgoCD version and theme.

### Step 4: Choose an Action

Clicking the Actions dropdown shows all available actions for that resource type. For a Deployment with custom actions configured, you might see:

- restart
- scale-up
- scale-down
- pause
- resume

Actions that are currently disabled (based on the discovery script logic) appear grayed out and cannot be clicked.

### Step 5: Confirm and Execute

When you click an action, ArgoCD shows a confirmation dialog. The dialog typically says something like:

> Are you sure you want to run action "restart" on Deployment "my-app" in namespace "production"?

Click "OK" or "Confirm" to execute the action.

## Understanding Action Results

After executing an action, the UI updates to reflect the changes:

### Successful Actions

1. The resource detail panel refreshes to show the updated resource
2. For a restart, you will see new pods appearing in the resource tree while old pods terminate
3. For scaling, the replica count in the resource summary changes
4. The application may briefly show as "OutOfSync" because the live state changed

### Failed Actions

If an action fails, you will see an error message in the UI. Common failure reasons include:

- **RBAC permission denied**: Your user does not have permission to execute this action
- **Resource conflict**: The resource was modified by another process while the action was running
- **Invalid modification**: The Lua script produced an invalid resource spec

Check the ArgoCD application controller logs for detailed error information:

```bash
kubectl logs -n argocd deployment/argocd-application-controller --tail=50
```

## Visual Guide to Common Actions

### Restarting a Deployment

1. Click Application tile
2. Click the Deployment node in resource tree
3. Click "Actions" dropdown
4. Select "restart"
5. Confirm in the dialog
6. Watch the resource tree: old ReplicaSet starts scaling down, new ReplicaSet scales up
7. Pod status updates in real-time (Pending to Running)

### Scaling a Deployment

1. Navigate to the Deployment resource
2. Click "Actions"
3. Select "scale-up" or "scale-down"
4. Confirm
5. The replica count updates in the resource summary
6. New pods appear in the tree (for scale-up) or pods start terminating (for scale-down)

### Promoting an Argo Rollout

1. Navigate to the Rollout resource (it will show a "Paused" status)
2. Click "Actions"
3. Select "resume" to advance to the next step, or "promote-full" to go to 100%
4. Confirm
5. Watch the rollout progress through its steps in the resource detail

## Alternative: Actions from the Resource Tree

Some versions of ArgoCD also allow you to right-click on a resource in the tree to access actions. This provides a quicker workflow:

1. Right-click on the Deployment in the resource tree
2. Select "Actions" from the context menu
3. Choose the desired action

## Monitoring Action Effects

After executing an action, use these UI features to monitor the result:

### Live Resource View

Click on the resource and switch to the "Live Manifest" tab to see the current state of the resource in the cluster. You can verify that the action's changes were applied (e.g., the restart annotation was added, the replica count changed).

### Events Tab

The "Events" tab shows Kubernetes events for the resource. After a restart, you will see events like:

```text
ScalingReplicaSet  Scaled up replica set my-app-7f8b6c to 3
ScalingReplicaSet  Scaled down replica set my-app-6a5d4b to 0
```

### Diff View

The "Diff" tab shows the difference between the Git (desired) state and the live state. After an action, this diff will show the changes the action made, such as the restart annotation or the new replica count.

### Application Status

Check the top-level application status. After an action:

- Health might briefly show "Progressing" as pods restart or scale
- Sync might show "OutOfSync" if the action changed a field tracked by ArgoCD
- Both should return to "Healthy" and "Synced" once the operation completes (assuming you have ignoreDifferences configured for action-modified fields)

## Troubleshooting UI Action Issues

### Actions Dropdown Is Empty

If no actions appear in the dropdown:

1. No actions are configured for this resource type in `argocd-cm`
2. The discovery script returned an empty table for this specific resource
3. Your RBAC role does not have permission to see actions

### Actions Are Grayed Out

If actions appear but are grayed out (disabled):

1. The discovery script set `["disabled"] = true` for this action
2. This usually means the action does not apply to the current state (e.g., "scale-down" when replicas is 1)

### Action Fails with "Permission Denied"

Your user account does not have the RBAC policy allowing action execution. Contact your ArgoCD administrator to get the right permissions.

### Action Succeeds but Nothing Happens

1. The Lua script might be returning the object unmodified (bug in the script)
2. The change might be applied but not visible yet - try refreshing the application
3. The change might be immediately reverted by auto-sync

## Best Practices for UI-Based Actions

1. **Name actions clearly**: Use descriptive names like "restart", "scale-up", "promote-full" rather than cryptic names
2. **Disable irrelevant actions**: Use the discovery script to hide or disable actions that do not apply to the current state
3. **Document actions**: Share documentation with your team about what each action does and when to use it
4. **Use RBAC**: Control who can execute which actions to prevent accidental changes

For configuring the actions themselves, see [how to configure custom resource actions in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-resource-actions/view). For CLI-based action execution, check out [how to execute resource actions from the ArgoCD CLI](https://oneuptime.com/blog/post/2026-02-26-argocd-resource-actions-cli/view).
