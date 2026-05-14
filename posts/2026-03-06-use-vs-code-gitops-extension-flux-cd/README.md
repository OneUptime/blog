# How to Use VS Code GitOps Extension with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VS Code, GitOps, Extension, IDE, Developer Tool, Kubernetes

Description: A practical guide to installing and using the VS Code GitOps Extension to manage Flux CD resources directly from your IDE.

---

## Introduction

The VS Code GitOps Extension brings Flux CD management directly into your development environment. Instead of switching between your editor and the terminal, you can view Flux resources, check reconciliation status, and trigger syncs all from within VS Code.

This guide walks you through installing the extension, connecting it to your clusters, and using its features to streamline your GitOps workflow.

## Prerequisites

Before you begin, ensure you have:

- Visual Studio Code (v1.63 or later)
- A running Kubernetes cluster with Flux CD installed
- kubectl configured with a valid kubeconfig
- The Flux CLI installed locally

Verify your setup:

```bash
# Check kubectl connectivity

kubectl cluster-info

# Verify Flux installation
flux check
```

## Installing the VS Code GitOps Extension

### Step 1: Install from the Marketplace

Open VS Code and install the extension:

1. Open the Extensions panel (Ctrl+Shift+X or Cmd+Shift+X on macOS)
2. Search for "GitOps Tools for Flux"
3. Click Install on the extension published by Weaveworks

Alternatively, install from the command line:

```bash
# Install the GitOps extension via the VS Code CLI
code --install-extension weaveworks.vscode-gitops-tools
```

### Step 2: Install Recommended Dependencies

The GitOps extension depends on the Kubernetes extension, which VS Code installs automatically if it is not already present. The YAML extension is useful for schema validation when you edit Flux manifests:

```bash
# Kubernetes extension for cluster browsing
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools

# YAML extension for schema validation
code --install-extension redhat.vscode-yaml
```

### Step 3: Verify the Installation

After installation, you should see a new GitOps icon in the VS Code Activity Bar (left sidebar). Click it to open the GitOps panel.

## Configuring the Extension

### Cluster Connection

The extension automatically detects clusters from your kubeconfig file. If you have multiple clusters:

1. Open the GitOps panel in the Activity Bar
2. Open the Clusters view
3. Right-click the cluster you want to manage and select "Set as Current Context"

The extension discovers clusters through the VS Code Kubernetes extension and your kubeconfig. To use a custom kubeconfig path, set it in the Kubernetes extension settings:

```json
{
  // Point the Kubernetes extension to a custom kubeconfig file
  "vs-kubernetes.kubeconfig": "/path/to/custom/kubeconfig"
}
```

### Extension Settings

Configure the extension behavior through VS Code settings (Ctrl+, or Cmd+,):

```json
{
  // Enable the optional Weave GitOps Enterprise templates view
  "gitops.weaveGitopsEnterprise": false
}
```

The extension expects `kubectl`, `flux`, and `git` to be available on your system `PATH`. If the Flux CLI is missing, the extension can prompt you to install it.

## Using the GitOps Panel

### Sources View

The Sources section displays all Flux source resources:

- **GitRepositories** - Git repositories being tracked by Flux
- **HelmRepositories** - Helm chart repositories
- **OCIRepositories** - OCI artifact repositories
- **Buckets** - S3-compatible bucket sources

Each source shows:

- Name and namespace
- URL or address
- Current revision
- Ready status (green checkmark or red X)
- Last reconciliation time

### Workloads View

The Workloads section shows deployment resources:

- **Kustomizations** - All Kustomization resources
- **HelmReleases** - All HelmRelease resources

Each workload displays:

- Name and namespace
- Source reference
- Applied revision
- Ready/Not Ready status
- Suspended state

### Tree View Navigation

The extension organizes resources in a tree structure:

```mermaid
graph TD
    A[Cluster: my-cluster] --> B[Sources]
    A --> C[Workloads]
    B --> D[GitRepository: flux-system]
    B --> E[HelmRepository: bitnami]
    C --> F[Kustomization: infrastructure]
    C --> G[Kustomization: apps]
    F --> H[HelmRelease: ingress-nginx]
    G --> I[HelmRelease: my-app]
```

## Common Operations

### Viewing Resource Details

Right-click any resource in the GitOps panel to access:

- **View Config** - Opens the full resource YAML in a new editor tab
- **Trace** - Shows the Kubernetes objects created by a workload
- **Copy Name** - Copies the resource name to clipboard

### Triggering Reconciliation

To manually trigger a reconciliation:

1. Right-click the resource in the GitOps panel
2. Select "Reconcile" from the context menu
3. The extension runs `flux reconcile` and updates the status

The extension exposes separate reconcile actions for sources and workloads from the tree view context menu.

### Suspending and Resuming Resources

To suspend a resource (pause reconciliation):

1. Right-click the resource
2. Select "Suspend"
3. The resource status changes to show it is suspended

To resume:

1. Right-click the suspended resource
2. Select "Resume"

### Creating New Flux Resources

The extension provides commands for creating new Flux resources:

1. Open Command Palette (Ctrl+Shift+P)
2. Type "GitOps: Add Source" or "GitOps: Add Kustomization"
3. Choose the resource details requested by the extension
4. Fill in the prompted fields
5. The extension generates the YAML and opens it in a new editor tab

Example generated GitRepository:

```yaml
# Generated by VS Code GitOps Extension
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # How often to check for new commits
  interval: 5m
  # Repository URL
  url: https://github.com/myorg/my-app
  ref:
    # Branch to track
    branch: main
```

## YAML Schema Validation

The YAML extension can provide schema validation for Flux CRDs. This catches errors before you apply resources:

### Enabling Schema Validation

Add Flux JSON schemas to your VS Code YAML settings:

```json
{
  "yaml.schemas": {
    // Flux source schemas
    "https://raw.githubusercontent.com/fluxcd-community/flux2-schemas/main/gitrepository-source-v1.json": [
      "**/gitrepository*.yaml",
      "**/gitrepository*.yml"
    ],
    // Flux kustomize schemas
    "https://raw.githubusercontent.com/fluxcd-community/flux2-schemas/main/kustomization-kustomize-v1.json": [
      "**/kustomization*.yaml"
    ],
    // Flux helm schemas
    "https://raw.githubusercontent.com/fluxcd-community/flux2-schemas/main/helmrelease-helm-v2.json": [
      "**/helmrelease*.yaml"
    ]
  }
}
```

### Validation in Action

When editing Flux YAML files, the YAML extension provides:

- Red underlines for invalid fields or values
- Autocomplete suggestions for valid field names
- Hover documentation for each field
- Warnings for deprecated fields

Example validation catching an error:

```yaml
# The YAML extension will highlight the error on 'intervals' (should be 'interval')
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Error: 'intervals' is not a valid field, did you mean 'interval'?
  intervals: 5m
  url: https://github.com/myorg/my-app
  ref:
    branch: main
```

## Working with Multiple Clusters

The extension supports managing Flux across multiple clusters:

### Switching Clusters

1. Open the Clusters view in the GitOps panel
2. Right-click a different cluster and select "Set as Current Context"
3. The panel refreshes to show resources from the selected cluster

### Comparing Resources Across Clusters

You can open resource YAML from different clusters side by side:

1. Open a resource YAML from cluster A
2. Switch to cluster B
3. Open the same resource from cluster B
4. Use VS Code split editor to compare

## Keyboard Shortcuts

Configure custom shortcuts for frequent operations:

```json
// keybindings.json
[
  {
    // Refresh all GitOps tree views
    "key": "ctrl+shift+g ctrl+shift+r",
    "command": "gitops.views.refreshAllTreeViews"
  },
  {
    // Refresh the Sources and Workloads views
    "key": "ctrl+shift+g ctrl+shift+f",
    "command": "gitops.views.refreshResourcesTreeView"
  },
  {
    // Show the GitOps output channel
    "key": "ctrl+shift+g ctrl+shift+o",
    "command": "gitops.output.show"
  }
]
```

## Integrating with Git Workflow

### Editing Flux Manifests

The extension integrates with your Git workflow:

1. Edit Flux manifests in your repository
2. The YAML schema validation catches errors immediately
3. Commit and push changes
4. Watch the GitOps panel for reconciliation status updates
5. Click any failing resource to see the error details

### Using the Integrated Terminal

Combine the extension with terminal commands:

```bash
# Check Flux status from the integrated terminal
flux get all -A

# View detailed resource YAML
kubectl get kustomization my-app -n flux-system -o yaml

# Check recent events
flux events --for Kustomization/my-app
```

## Troubleshooting

### Extension Not Detecting Clusters

```bash
# Verify kubeconfig is valid
kubectl config view

# Check current context
kubectl config current-context

# Test cluster connectivity
kubectl get namespaces
```

Resources Not Showing Up

If the GitOps panel is empty:

1. Verify Flux is installed: `flux check`
2. Click the refresh button in the panel header
3. Check the VS Code Output panel (select "GitOps" from the dropdown) for errors
4. Ensure your kubeconfig user has permissions to list Flux CRDs

## Summary

The VS Code GitOps Extension brings Flux CD management into your daily development workflow. By providing resource visualization, schema validation, and quick actions directly in your IDE, it eliminates the need to constantly switch between your editor and the terminal. Combined with YAML schema validation, it helps catch configuration errors before they reach your cluster, making your GitOps workflow faster and more reliable.
