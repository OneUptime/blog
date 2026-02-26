# How to Use Parameter Overrides from the ArgoCD UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI, Configuration Management

Description: Learn how to use the ArgoCD web UI to view and override application parameters for Helm and Kustomize applications, with step-by-step visual workflows.

---

The ArgoCD web UI provides a graphical interface for managing application parameter overrides. While the CLI and Git-based workflows are more suitable for automation, the UI is excellent for exploring current parameter values, making quick adjustments during debugging, and reviewing what overrides are in place. This guide walks through using the ArgoCD UI for parameter overrides with both Helm and Kustomize applications.

## Accessing the Parameters Panel

To view and modify parameters for an application, navigate to the application detail view in the ArgoCD UI:

1. Open the ArgoCD web UI (typically at `https://argocd.example.com`)
2. Click on the application you want to modify
3. Click the **App Details** button in the top-left area (or the gear icon)
4. Scroll down to the **Source** section

The Source section shows the repository URL, revision, path, and any configured parameter overrides. For Helm applications, you will see a **Parameters** tab. For Kustomize applications, you will see **Kustomize** settings.

## Overriding Helm Parameters in the UI

When viewing a Helm-based application, the Parameters section displays all configurable values from the chart.

### Viewing Current Values

The Parameters tab shows a searchable table with three columns:
- **Name**: The Helm value path (e.g., `image.tag`, `replicaCount`)
- **Value**: The current effective value
- **Override**: Whether the value is overridden from the ArgoCD Application spec

You can search for specific parameters using the filter box at the top. This is helpful when a Helm chart has hundreds of configurable values.

### Setting an Override

To override a Helm parameter through the UI:

1. Navigate to **App Details** and find the **Parameters** section
2. Find the parameter you want to override (use the search box for large charts)
3. Click the **Edit** button (pencil icon) next to the parameter
4. Enter the new value
5. Click **Save**

The application will immediately show as **OutOfSync** because the desired state (with the new override) differs from the live cluster state. You then need to sync the application to apply the change.

### Adding a New Override

To add an override for a parameter that is not currently shown:

1. Click **Edit** on the application source
2. In the Helm section, you will see options to add:
   - **Parameters**: Click **Add** to add a new `--set` style override
   - **Values Files**: Add additional values file references
3. Enter the parameter name and value
4. Click **Save**

### Removing an Override

To remove an existing override and revert to the Git-defined value:

1. Find the overridden parameter in the Parameters list (overridden values are marked)
2. Click the **Delete** or **Remove Override** button next to it
3. Click **Save**

The application will go OutOfSync again, and syncing will revert to the value defined in your Helm values file in Git.

## Overriding Kustomize Parameters in the UI

For Kustomize-based applications, the UI offers different override options.

### Image Overrides

1. Navigate to **App Details** and find the **Images** section
2. You will see the current container images used by the application
3. Click on an image to change its tag, repository, or both
4. Enter the new image reference (e.g., `myregistry/my-app:v1.2.3`)
5. Click **Save**

### Kustomize Settings

In the source configuration, you can modify:

- **Name Prefix**: Adds a prefix to all resource names
- **Name Suffix**: Adds a suffix to all resource names
- **Namespace**: Overrides the target namespace
- **Images**: List of image overrides

To modify these:

1. Click **Edit** on the Application source configuration
2. Scroll to the Kustomize section
3. Modify the desired fields
4. Click **Save**

## Syncing After Parameter Changes

After making parameter overrides, you need to sync the application:

1. The application status will show **OutOfSync** with a yellow indicator
2. Click the **Sync** button in the application toolbar
3. Review the sync plan - it shows exactly what resources will be created, updated, or deleted
4. Optionally enable:
   - **Dry Run**: Preview changes without applying them
   - **Prune**: Delete resources that are no longer in the desired state
   - **Force**: Force-apply resources even if they have conflicts
5. Click **Synchronize**

The sync progress shows in real-time, with each resource displaying its status (Synced, OutOfSync, Progressing, Healthy, Degraded).

## Viewing the Manifest Diff

Before syncing, always review what will change:

1. Click on the application to see the resource tree
2. Click on any resource that shows as OutOfSync
3. Select the **Diff** tab to see a side-by-side comparison of the live state vs the desired state

The diff view highlights the exact fields that will change. For parameter overrides, you will typically see changes in the container image, resource limits, environment variables, or other parameterized fields.

## Using the Application Edit Dialog

For more comprehensive parameter changes, use the full Application editor:

1. Click the **three-dot menu** (kebab menu) on the application card
2. Select **Edit**
3. This opens a YAML editor with the full Application spec
4. You can directly edit the `source.helm` or `source.kustomize` sections:

```yaml
# Example: editing Helm overrides directly in the Application spec
spec:
  source:
    repoURL: https://github.com/myorg/app-config.git
    path: charts/my-app
    helm:
      parameters:
        - name: image.tag
          value: v1.2.3
        - name: replicaCount
          value: "3"
      valueFiles:
        - values.yaml
        - environments/production.yaml
```

5. Click **Save** to apply the changes

## Tracking Who Made UI Overrides

ArgoCD tracks operations performed through the UI in the application history. To see who made changes:

1. Navigate to the application detail view
2. Click the **History and Rollback** section
3. Each sync operation shows:
   - When it was performed
   - Who initiated it (the user who clicked Sync)
   - What revision was synced
   - Whether it succeeded or failed

This is useful for auditing but note that parameter overrides themselves (the `app set` equivalent) are not tracked in this history - only the sync operations that apply them.

## Comparing UI Overrides with Git

To check if your application has diverged from what Git defines:

1. Look at the **Sync Status** indicator at the top of the application view
2. **Synced**: The live state matches the desired state (including any overrides)
3. **OutOfSync**: The live state differs from the desired state
4. Click on the **Commit** link to view the Git repository at the tracked revision
5. Compare the Git state with what the UI shows as the current configuration

## Multi-Source Application Parameters

For applications that use multiple sources (introduced in ArgoCD 2.6+), the UI shows parameters for each source separately:

1. Navigate to **App Details**
2. You will see multiple **Source** sections, one for each source
3. Each source has its own parameters that can be overridden independently

This is particularly useful when your Helm chart comes from one repository and your values file comes from another.

## Practical UI Workflow for Debugging

A common debugging workflow using the UI:

1. Navigate to the troubled application
2. Check the **Events** tab for any error messages
3. Check individual pod logs by clicking on a pod resource and selecting **Logs**
4. If you need to change configuration (e.g., increase log verbosity):
   - Go to **App Details** and edit parameters
   - Set `config.logLevel` to `debug`
   - Click **Save**, then **Sync**
5. Monitor the pod logs with the new configuration
6. Once debugging is complete, remove the override to revert to the standard log level

## Managing Parameters Across Multiple Applications

The ArgoCD UI home screen shows all applications with their sync status. When managing overrides across multiple applications:

1. Use the **Filter** bar to find related applications (e.g., filter by project or label)
2. Check sync status across applications - if multiple apps are OutOfSync, some may have forgotten overrides
3. Click into each application to review its parameter overrides

For bulk operations across many applications, the CLI is more efficient. The UI is best suited for individual application management and exploration.

## Best Practices for UI Overrides

Document your UI changes in your team channel. The ArgoCD UI does not send notifications for parameter changes (only for sync operations), so your team may not be aware of overrides you have set.

Prefer the CLI for repeatable operations. If you find yourself making the same UI override frequently, script it with the CLI and add it to your automation pipeline.

Review overrides before production syncs. Before syncing a production application, check the Parameters section for any unexpected overrides that might have been set during debugging and forgotten.

Use dry-run syncs liberally. The UI makes it easy to preview changes before applying them. Always dry-run production changes to verify you are deploying what you intend.

The ArgoCD UI provides a convenient visual interface for parameter management. While it should not replace Git-based workflows for permanent changes, it is invaluable for exploration, debugging, and quick adjustments that need to happen faster than a Git commit cycle.
