# How to Create an ArgoCD Application Using the UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI, Beginner

Description: Step-by-step walkthrough for creating ArgoCD applications through the web UI including repository setup, sync policies, and application monitoring.

---

The ArgoCD web UI is the most visual and beginner-friendly way to create and manage applications. It provides a guided wizard for application creation, a real-time resource tree view, and immediate feedback on sync status and health. This guide walks you through creating an application entirely through the UI, with screenshots-equivalent descriptions of each step.

## Accessing the ArgoCD UI

First, access the ArgoCD web interface:

```bash
# Option 1: Port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Then open: https://localhost:8080

# Option 2: Through your ingress URL
# Open: https://argocd.yourcompany.com
```

Login with your credentials. For a fresh installation, the username is `admin` and the password is stored in a secret:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Step 1: Click "New App"

After logging in, you land on the Applications page. This page shows all applications managed by ArgoCD. Click the **"+ NEW APP"** button in the top left corner. This opens the application creation wizard.

## Step 2: General Settings

The first section is **GENERAL** where you configure the application identity:

**Application Name**: Enter a unique name for your application. This becomes the ArgoCD Application resource name. Use lowercase, hyphens, and no spaces.

```
Application Name: nginx-demo
```

**Project**: Select the ArgoCD project this application belongs to. The `default` project is available out of the box and allows deploying to any cluster and namespace. For production, you should create specific projects with restricted permissions.

```
Project: default
```

**Sync Policy**: Choose between:

- **Manual**: You manually trigger syncs. Good for production where you want human approval.
- **Automatic**: ArgoCD syncs automatically when it detects changes in Git. Good for development environments.

If you choose Automatic, two additional options appear:

- **Prune Resources**: Automatically delete resources that no longer exist in Git
- **Self Heal**: Automatically revert manual changes made directly to the cluster

For your first application, leave it as **Manual** so you can see the sync process.

## Step 3: Source Configuration

The **SOURCE** section tells ArgoCD where to find your Kubernetes manifests:

**Repository URL**: Enter the Git repository URL. If this is a public repository, ArgoCD can access it directly. For private repositories, you need to add credentials first (Settings > Repositories).

```
Repository URL: https://github.com/youruser/your-repo.git
```

After entering the URL, ArgoCD validates it. If the repository is accessible, a green checkmark appears. If not, you will see an error - check the URL and repository credentials.

**Revision**: The Git branch, tag, or commit to track. Common values:

- `HEAD` - follows the default branch
- `main` - follows the main branch
- `v1.0.0` - pins to a specific tag
- A commit SHA - pins to an exact commit

```
Revision: HEAD
```

**Path**: The directory within the repository that contains your Kubernetes manifests. ArgoCD automatically detects the type of manifests (plain YAML, Helm, Kustomize) based on the directory contents.

```
Path: manifests
```

After entering the path, ArgoCD shows what it detected:

- **Directory**: Plain YAML/JSON manifests
- **Helm**: A Helm chart (detected by Chart.yaml)
- **Kustomize**: Kustomize overlays (detected by kustomization.yaml)

### Helm-Specific Options

If ArgoCD detects a Helm chart, additional fields appear:

- **Values Files**: Select which values files to use
- **Helm Parameters**: Override specific values
- **Release Name**: Override the Helm release name

### Kustomize-Specific Options

If ArgoCD detects Kustomize:

- **Name Prefix**: Add a prefix to all resource names
- **Name Suffix**: Add a suffix to all resource names
- **Images**: Override container image references

## Step 4: Destination Configuration

The **DESTINATION** section tells ArgoCD where to deploy:

**Cluster URL**: Select the target Kubernetes cluster. The in-cluster option (`https://kubernetes.default.svc`) is always available. External clusters appear here if you have added them through the CLI.

```
Cluster URL: https://kubernetes.default.svc
```

**Namespace**: The Kubernetes namespace to deploy resources into. This namespace must exist in the cluster unless you enable the "Create Namespace" sync option.

```
Namespace: default
```

## Step 5: Advanced Options (Optional)

Click the expandable sections to configure advanced options:

### Sync Options

Checkboxes for common sync options:

- **Skip Schema Validation**: Skip Kubernetes resource validation during sync
- **Auto-Create Namespace**: Create the namespace if it does not exist
- **Prune Last**: Delete removed resources after all other resources are synced
- **Apply Out of Sync Only**: Only apply resources that are out of sync
- **Server-Side Apply**: Use Kubernetes server-side apply instead of client-side

### Ignore Differences

Define fields that ArgoCD should ignore when comparing Git state with cluster state. This is useful for fields that Kubernetes mutates (like status fields or defaulted values):

```
Group: apps
Kind: Deployment
JSON Pointers: /spec/replicas
```

## Step 6: Create the Application

Review all settings and click the **"CREATE"** button. ArgoCD creates the Application resource and immediately begins monitoring the specified Git repository.

You are redirected to the application detail page where you can see:

- **Sync Status**: OutOfSync (manifests exist in Git but not in the cluster)
- **Health Status**: Missing (resources do not exist yet)
- **Resource Tree**: Visual representation of the resources that will be created

## Step 7: Sync the Application

Click the **"SYNC"** button in the top bar. A sync dialog appears with options:

- **Synchronize**: Apply all changes
- **Dry Run**: Preview what would change without applying
- **Prune**: Also delete resources that no longer exist in Git
- **Force**: Skip safety checks (use with caution)

Select the resources you want to sync (or leave all selected) and click **"SYNCHRONIZE"**.

Watch the resource tree update in real time:

1. Resources turn yellow (Progressing) as they are being created
2. Pods appear under Deployments and ReplicaSets
3. Resources turn green (Healthy) when they pass health checks
4. The overall status changes to "Synced" and "Healthy"

## Exploring the Application in the UI

After syncing, explore the application through these UI features:

### Resource Tree

The main view shows all resources as a tree. Click any resource to see its details, events, and logs (for pods).

### Application Details

Click the **"APP DETAILS"** button to see the full application configuration, including source, destination, sync policy, and all options.

### Diff View

Click **"APP DIFF"** to see what differs between Git and the cluster. This is useful when the application is OutOfSync to understand what changed.

### History and Rollback

Click **"HISTORY AND ROLLBACK"** to see previous sync operations. Each entry shows the Git commit that was synced and its timestamp. You can click "Rollback" to revert to a previous state.

### Logs

Click on a Pod in the resource tree, then click the **"LOGS"** tab to view container logs in real time. You can select different containers and toggle auto-refresh.

### Events

The **"EVENTS"** tab on each resource shows Kubernetes events, which are useful for debugging deployment issues.

## Editing an Application in the UI

To change application settings after creation:

1. Open the application
2. Click **"APP DETAILS"**
3. Click the **"EDIT"** button at the top
4. Modify any settings
5. Click **"SAVE"**

Common changes:

- Changing the tracked branch or tag
- Updating Helm values
- Enabling auto-sync
- Changing the target namespace

## Deleting an Application in the UI

1. Open the application
2. Click the **"DELETE"** button
3. Choose whether to cascade (delete managed resources) or not
4. Type the application name to confirm
5. Click **"OK"**

## UI Tips and Tricks

**Filter applications**: Use the search bar and filter buttons at the top of the Applications page to find specific apps by name, project, sync status, or health.

**Dark mode**: Click your user icon in the bottom left and toggle the theme.

**Resource filters**: In the resource tree, use the filter dropdowns to show only specific resource types or health statuses.

**Keyboard shortcuts**: Press `?` to see available keyboard shortcuts.

For CLI-based application management, see [creating ArgoCD applications using the CLI](https://oneuptime.com/blog/post/2026-02-26-argocd-create-application-cli/view). For declarative YAML configuration, see [ArgoCD Application declarative YAML](https://oneuptime.com/blog/post/2026-02-26-argocd-application-declarative-yaml/view).
