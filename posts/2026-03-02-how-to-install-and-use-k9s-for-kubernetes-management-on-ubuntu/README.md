# How to Install and Use k9s for Kubernetes Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, k9s, DevOps, CLI Tools

Description: Install k9s on Ubuntu and learn how to navigate Kubernetes clusters, manage pods, view logs, execute into containers, and monitor resources from the terminal.

---

k9s is a terminal-based UI for Kubernetes that makes navigating and managing clusters significantly faster than typing `kubectl` commands repeatedly. It provides a real-time view of your cluster's resources, lets you jump into pods, tail logs, delete objects, apply port forwarding, and run custom commands - all from the keyboard. If you spend a lot of time in `kubectl`, k9s will speed up your workflow considerably.

## Prerequisites

- Ubuntu 22.04 or newer
- kubectl configured with access to a Kubernetes cluster
- A working `~/.kube/config` file

## Installation

### Method 1: Download the Binary (Recommended)

```bash
# Get the latest k9s version
K9S_VERSION=$(curl -s https://api.github.com/repos/derailed/k9s/releases/latest \
  | grep '"tag_name":' | sed 's/.*"v\([^"]*\)".*/\1/')

echo "Installing k9s version: $K9S_VERSION"

# Download the binary
wget "https://github.com/derailed/k9s/releases/latest/download/k9s_Linux_amd64.tar.gz" \
  -O /tmp/k9s.tar.gz

# Extract and install
tar -xzf /tmp/k9s.tar.gz -C /tmp/
sudo mv /tmp/k9s /usr/local/bin/k9s
sudo chmod +x /usr/local/bin/k9s

# Verify installation
k9s version
```

### Method 2: Snap Package

```bash
sudo snap install k9s
k9s version
```

### Method 3: Using Homebrew on Linux

```bash
# If you have Homebrew installed
brew install k9s
```

## Basic Navigation

Launch k9s:

```bash
k9s

# Connect to a specific context
k9s --context my-cluster

# Start in a specific namespace
k9s --namespace production

# Connect to a specific kubeconfig
k9s --kubeconfig /path/to/custom/kubeconfig
```

### Key Bindings Overview

k9s uses vim-style key bindings mixed with navigation keys. The most important ones:

```
Navigation:
  :              Enter command mode (like vim)
  /              Search/filter resources
  ESC            Go back / cancel
  Enter          Select resource or drill down
  q              Quit

Resource actions (when a resource is selected):
  l              View logs
  d              Describe the resource
  e              Edit the resource
  Ctrl+D         Delete the resource
  s              Open a shell in the container
  f              Port-forward
  y              View YAML
  x              Decode base64 secrets

Navigation shortcuts:
  0              Show all namespaces
  Shift+N        Sort by name
  Shift+A        Sort by age
  Ctrl+A         Show all resources (aliases)
```

## Working with Pods

```
# In k9s, type these commands to navigate to different resource types:
:pods           List all pods
:deploy         List deployments
:svc            List services
:no             List nodes
:ns             List namespaces
:cm             List configmaps
:secrets        List secrets
:pv             List persistent volumes
:events         Show cluster events
```

### Filtering Pods

```
# In pods view, press / to filter
/running        Show only running pods
/error          Show pods with errors
/web            Show pods containing "web" in the name
```

### Tailing Logs

1. Navigate to a pod with `:pods`
2. Use arrow keys to select the pod
3. Press `l` to view logs
4. Press `0` to see all namespaces

In the log view:
```
Ctrl+S          Save logs to a file
w               Toggle log timestamps
t               Toggle log wrapping
/               Search logs
f               Filter logs
```

### Opening a Shell

1. Navigate to a pod
2. Press `s` to open a shell
3. If the pod has multiple containers, k9s asks which one

```bash
# From within the k9s shell, you can run any commands inside the container
ls /app
env | grep DATABASE
curl http://localhost:8080/health
```

## Port Forwarding

1. Navigate to a service or pod
2. Press `f` to start port forwarding
3. k9s shows the forwarded port

Or use the port-forward command mode:

```
:pf             View active port-forwards
```

k9s keeps port forwards active as long as it is running.

## Managing Resources

### Deleting Resources

1. Navigate to the resource
2. Press `Ctrl+D`
3. k9s asks for confirmation

### Editing Resources Live

1. Navigate to a deployment, configmap, etc.
2. Press `e` to open in your default editor (usually vim)
3. Make changes and save
4. k9s applies the changes immediately

Set your preferred editor:

```bash
# In ~/.bashrc or ~/.zshrc
export KUBE_EDITOR=nano
# Or
export KUBE_EDITOR="code --wait"  # VS Code
```

### Viewing YAML

1. Select any resource
2. Press `y` to see the full YAML

## Customizing k9s

### Configuration File

k9s stores configuration at `~/.config/k9s/config.yaml`:

```yaml
k9s:
  # Refresh rate in milliseconds
  refreshRate: 2
  # Start in this namespace by default
  currentNamespace: default
  # Show container images in pod view
  showContainerImages: true
  # Log settings
  logger:
    tail: 200    # Number of log lines to show
    buffer: 5000 # Total log buffer size
    sinceSeconds: 300  # Show logs from last 5 minutes
    textWrap: false
    showTime: false
  # Enable read-only mode (prevents deletes and edits)
  readOnly: false
```

### Skin/Theme Customization

k9s supports themes. Create a skin file:

```bash
mkdir -p ~/.config/k9s/skins

# Download a theme
wget https://raw.githubusercontent.com/derailed/k9s/master/skins/dracula.yaml \
  -O ~/.config/k9s/skins/dracula.yaml

# Enable it in config.yaml
cat >> ~/.config/k9s/config.yaml <<'EOF'
k9s:
  ui:
    skin: dracula
EOF
```

### Custom Aliases

Create shortcuts for complex label selectors:

```bash
mkdir -p ~/.config/k9s
cat > ~/.config/k9s/aliases.yaml <<'EOF'
aliases:
  # Short aliases for common resource types
  pp: v1/pods
  rs: apps/v1/replicasets
  ep: v1/endpoints

  # Alias with label filter built in
  ppp: v1/pods?app=myapp
EOF
```

### Custom Hotkeys

```bash
cat > ~/.config/k9s/hotkeys.yaml <<'EOF'
hotkeys:
  # Shortcut to view resource usage
  shift-u:
    shortCut: Shift-U
    description: View resource utilization
    command: top
  # Jump directly to production namespace
  shift-p:
    shortCut: Shift-P
    description: Go to production
    command: pods
    context: production-namespace
EOF
```

## Using k9s with Multiple Clusters

```bash
# k9s respects kubeconfig contexts
# List available contexts
kubectl config get-contexts

# Switch context within k9s:
# Press Ctrl+A to see cluster context menu
# Or use the :ctx command
```

## Useful Views for Debugging

### Checking Node Resources

```
:no             Go to nodes view
d               Describe a node (shows pod pressure, allocations)
```

### Checking Events for Issues

```
:events         Show all events
/Warning        Filter to show only warnings
```

### Viewing Resource Usage (Top)

```
:pu             Pod usage/metrics
:nu             Node usage/metrics
```

Note: This requires metrics-server to be running in your cluster.

## Troubleshooting k9s

### k9s Shows No Resources

```bash
# Verify kubectl works independently
kubectl get pods -A

# Check your context is correct
kubectl config current-context

# Verify KUBECONFIG is set
echo $KUBECONFIG
```

### Colors Not Rendering Properly

```bash
# Ensure your terminal supports 256 colors
echo $TERM

# Set terminal type if needed
export TERM=xterm-256color
echo 'export TERM=xterm-256color' >> ~/.bashrc
```

### Permission Errors

k9s inherits kubectl's RBAC permissions. If you cannot see certain resources:

```bash
# Check your permissions
kubectl auth can-i list pods
kubectl auth can-i delete deployments

# View your cluster role bindings
kubectl get clusterrolebindings | grep $(kubectl config current-context)
```

k9s becomes second nature quickly. The combination of real-time updates, quick navigation, and in-context operations (logs, shell, port-forward) in a single terminal window replaces a significant portion of the kubectl commands most engineers type dozens of times per day.
