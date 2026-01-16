# How to Configure kubectl for Kubernetes on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, kubectl, Kubernetes, K8s, DevOps, Tutorial

Description: Complete guide to installing and configuring kubectl for Kubernetes cluster management on Ubuntu.

---

Kubernetes has become the de facto standard for container orchestration, and `kubectl` is the command-line tool that serves as your primary interface for interacting with Kubernetes clusters. This comprehensive guide will walk you through installing, configuring, and mastering kubectl on Ubuntu, from basic setup to advanced tips and tricks.

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 LTS
- A user account with sudo privileges
- Access to a Kubernetes cluster (local or remote)
- Basic familiarity with the command line

## Installing kubectl on Ubuntu

There are several methods to install kubectl on Ubuntu. We will cover the most common approaches.

### Method 1: Using apt Package Manager (Recommended)

This is the most straightforward method for Ubuntu systems.

```bash
# Update the apt package index and install required packages
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl gnupg

# Download the Kubernetes signing key
# Note: This creates the keyrings directory if it doesn't exist
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Add the Kubernetes apt repository
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Update apt and install kubectl
sudo apt update
sudo apt install -y kubectl
```

### Method 2: Using curl (Direct Binary Download)

If you prefer to download the binary directly:

```bash
# Download the latest stable version of kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Download the checksum file to verify the binary
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256"

# Verify the checksum matches
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
# Expected output: kubectl: OK

# Install kubectl to /usr/local/bin
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Clean up downloaded files
rm kubectl kubectl.sha256
```

### Method 3: Using Snap

For a quick installation using Ubuntu's snap package manager:

```bash
# Install kubectl via snap
sudo snap install kubectl --classic

# Verify the installation
kubectl version --client
```

### Verifying the Installation

After installation, verify that kubectl is properly installed:

```bash
# Check the client version
kubectl version --client

# Expected output:
# Client Version: v1.31.x
# Kustomize Version: v5.x.x

# Check kubectl location
which kubectl
# Expected output: /usr/local/bin/kubectl or /snap/bin/kubectl
```

## Understanding the kubeconfig File Structure

The kubeconfig file is the heart of kubectl configuration. It tells kubectl how to connect to your Kubernetes clusters.

### Default Location

By default, kubectl looks for a file named `config` in the `~/.kube` directory:

```bash
# Create the .kube directory if it doesn't exist
mkdir -p ~/.kube

# The default config file location
# ~/.kube/config
```

### kubeconfig File Structure

A kubeconfig file consists of three main sections: clusters, users, and contexts.

```yaml
# Example kubeconfig file structure
# Save as ~/.kube/config

apiVersion: v1
kind: Config

# preferences section - global kubectl preferences
preferences:
  colors: true

# clusters section - define your Kubernetes clusters
clusters:
  # Production cluster definition
  - name: production-cluster
    cluster:
      # The API server endpoint URL
      server: https://production.k8s.example.com:6443
      # Certificate authority data (base64 encoded)
      # Use certificate-authority for file path instead
      certificate-authority-data: LS0tLS1CRUdJTi...
      # Alternative: reference CA file directly
      # certificate-authority: /path/to/ca.crt

  # Staging cluster definition
  - name: staging-cluster
    cluster:
      server: https://staging.k8s.example.com:6443
      certificate-authority-data: LS0tLS1CRUdJTi...

  # Local development cluster (minikube/kind)
  - name: local-dev
    cluster:
      server: https://127.0.0.1:6443
      # Skip TLS verification (only for development!)
      insecure-skip-tls-verify: true

# users section - authentication credentials
users:
  # Production user with client certificate authentication
  - name: prod-admin
    user:
      # Client certificate authentication
      client-certificate-data: LS0tLS1CRUdJTi...
      client-key-data: LS0tLS1CRUdJTi...

  # Staging user with token authentication
  - name: staging-user
    user:
      # Bearer token authentication
      token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

  # Development user with username/password (not recommended for production)
  - name: dev-user
    user:
      username: developer
      password: dev-password

  # User with external authentication (exec-based)
  - name: aws-user
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: aws
        args:
          - eks
          - get-token
          - --cluster-name
          - my-eks-cluster

# contexts section - combine cluster + user + namespace
contexts:
  # Production context
  - name: prod
    context:
      cluster: production-cluster
      user: prod-admin
      namespace: default

  # Staging context
  - name: staging
    context:
      cluster: staging-cluster
      user: staging-user
      namespace: staging

  # Local development context
  - name: local
    context:
      cluster: local-dev
      user: dev-user
      namespace: development

# current-context - the active context
current-context: local
```

### Environment Variables for kubeconfig

You can customize kubectl's behavior using environment variables:

```bash
# Use a different kubeconfig file
export KUBECONFIG=~/.kube/my-custom-config

# Merge multiple kubeconfig files
# kubectl will merge all files and use them together
export KUBECONFIG=~/.kube/config:~/.kube/production:~/.kube/staging

# Temporarily use a different config file (single command)
kubectl --kubeconfig=/path/to/other/config get pods
```

## Working with Multiple Clusters and Contexts

Managing multiple Kubernetes clusters is a common requirement. kubectl makes this easy with contexts.

### Viewing Available Contexts

```bash
# List all available contexts
kubectl config get-contexts

# Example output:
# CURRENT   NAME      CLUSTER              AUTHINFO      NAMESPACE
# *         local     local-dev            dev-user      development
#           prod      production-cluster   prod-admin    default
#           staging   staging-cluster      staging-user  staging

# View the current context only
kubectl config current-context
# Output: local
```

### Switching Between Contexts

```bash
# Switch to a different context
kubectl config use-context prod
# Output: Switched to context "prod".

# Verify the switch
kubectl config current-context
# Output: prod

# Run a single command in a different context without switching
kubectl --context=staging get pods
```

### Creating and Modifying Contexts

```bash
# Create a new context combining existing cluster and user
kubectl config set-context new-context \
  --cluster=production-cluster \
  --user=prod-admin \
  --namespace=monitoring

# Modify an existing context (change default namespace)
kubectl config set-context prod --namespace=production

# Delete a context
kubectl config delete-context old-context

# Rename a context
kubectl config rename-context old-name new-name
```

### Adding Clusters and Users

```bash
# Add a new cluster to your kubeconfig
kubectl config set-cluster new-cluster \
  --server=https://new-cluster.example.com:6443 \
  --certificate-authority=/path/to/ca.crt

# Add a new user with token authentication
kubectl config set-credentials new-user \
  --token=your-bearer-token-here

# Add a new user with client certificate
kubectl config set-credentials cert-user \
  --client-certificate=/path/to/client.crt \
  --client-key=/path/to/client.key

# Create a complete new context
kubectl config set-context new-env \
  --cluster=new-cluster \
  --user=new-user \
  --namespace=default
```

## Setting Namespace Defaults

Namespaces help organize resources within a cluster. You can set a default namespace to avoid typing `-n namespace` repeatedly.

### Setting Default Namespace for a Context

```bash
# Set the default namespace for the current context
kubectl config set-context --current --namespace=my-namespace

# Verify the change
kubectl config view --minify | grep namespace
# Output:     namespace: my-namespace

# Now all commands will use my-namespace by default
kubectl get pods  # equivalent to: kubectl get pods -n my-namespace
```

### Working with Namespaces

```bash
# List all namespaces
kubectl get namespaces

# Create a new namespace
kubectl create namespace development

# Run a command in a specific namespace (overrides default)
kubectl get pods -n kube-system

# Run a command across all namespaces
kubectl get pods --all-namespaces
# Or use the shorthand
kubectl get pods -A
```

### Namespace Best Practices

```bash
# Create a namespace with resource quotas
cat <<EOF | kubectl apply -f -
# Namespace definition with labels
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    team: alpha
    environment: development
EOF

# Apply resource quota to the namespace
cat <<EOF | kubectl apply -f -
# ResourceQuota limits resource consumption in a namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-quota
  namespace: team-alpha
spec:
  hard:
    # Limit the number of pods
    pods: "10"
    # Limit total CPU requests
    requests.cpu: "4"
    # Limit total memory requests
    requests.memory: 8Gi
    # Limit total CPU limits
    limits.cpu: "8"
    # Limit total memory limits
    limits.memory: 16Gi
EOF
```

## Essential kubectl Commands

Master these fundamental kubectl commands for effective cluster management.

### Viewing Resources

```bash
# Get all resources of a specific type
kubectl get pods                    # List pods in current namespace
kubectl get services               # List services
kubectl get deployments            # List deployments
kubectl get nodes                  # List cluster nodes

# Get resources with more details
kubectl get pods -o wide           # Additional columns (node, IP)
kubectl get pods --show-labels     # Display all labels

# Get resources across all namespaces
kubectl get pods -A

# Watch resources in real-time (updates automatically)
kubectl get pods -w

# Describe a resource (detailed information)
kubectl describe pod my-pod
kubectl describe node worker-1
kubectl describe service my-service
```

### Creating and Managing Resources

```bash
# Create resources from a YAML file
kubectl apply -f deployment.yaml

# Create resources from a URL
kubectl apply -f https://example.com/manifest.yaml

# Create resources from a directory
kubectl apply -f ./manifests/

# Create resources recursively from directories
kubectl apply -f ./manifests/ -R

# Create a deployment imperatively
kubectl create deployment nginx --image=nginx:latest

# Create a service to expose a deployment
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Scale a deployment
kubectl scale deployment nginx --replicas=3

# Update a deployment image
kubectl set image deployment/nginx nginx=nginx:1.21

# Delete resources
kubectl delete pod my-pod
kubectl delete -f deployment.yaml
kubectl delete deployment nginx
```

### Debugging and Troubleshooting

```bash
# View pod logs
kubectl logs my-pod

# View logs for a specific container in a multi-container pod
kubectl logs my-pod -c my-container

# Stream logs in real-time
kubectl logs -f my-pod

# View logs from previous container instance (after crash)
kubectl logs my-pod --previous

# View logs with timestamps
kubectl logs my-pod --timestamps

# View last N lines of logs
kubectl logs my-pod --tail=100

# Execute a command in a running container
kubectl exec my-pod -- ls -la /app

# Open an interactive shell in a container
kubectl exec -it my-pod -- /bin/bash

# Port forward to access a pod locally
kubectl port-forward my-pod 8080:80

# Port forward to a service
kubectl port-forward svc/my-service 8080:80

# Copy files to/from a container
kubectl cp my-pod:/var/log/app.log ./app.log
kubectl cp ./config.yaml my-pod:/app/config.yaml

# View resource usage (requires metrics-server)
kubectl top nodes
kubectl top pods
```

### Cluster Information

```bash
# Display cluster information
kubectl cluster-info

# View API resources available in the cluster
kubectl api-resources

# View API versions
kubectl api-versions

# Check your permissions
kubectl auth can-i create pods
kubectl auth can-i delete deployments --namespace=production
kubectl auth can-i '*' '*'  # Check if you're cluster admin

# View the current kubeconfig settings
kubectl config view

# View kubeconfig with secrets shown
kubectl config view --raw
```

## Output Formatting Options

kubectl supports multiple output formats for different use cases.

### JSON Output

```bash
# Get pod details as JSON
kubectl get pod my-pod -o json

# Use jq to parse JSON output
kubectl get pods -o json | jq '.items[].metadata.name'

# Get specific field using JSONPath
kubectl get pod my-pod -o jsonpath='{.status.podIP}'

# Get multiple fields with JSONPath
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}'
```

### YAML Output

```bash
# Get resource definition as YAML
kubectl get deployment nginx -o yaml

# Export a resource for backup/replication
kubectl get deployment nginx -o yaml > nginx-backup.yaml

# Get only the spec section
kubectl get deployment nginx -o jsonpath='{.spec}' | yq -P
```

### Wide Output

```bash
# Get extended information with additional columns
kubectl get pods -o wide
# Shows: NAME, READY, STATUS, RESTARTS, AGE, IP, NODE, NOMINATED NODE, READINESS GATES

kubectl get nodes -o wide
# Shows: NAME, STATUS, ROLES, AGE, VERSION, INTERNAL-IP, EXTERNAL-IP, OS-IMAGE, KERNEL, CONTAINER-RUNTIME
```

### Custom Columns

```bash
# Define custom columns for output
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,IP:.status.podIP

# Load custom columns from a file
cat <<EOF > columns.txt
# Custom columns definition file
NAME          NAMESPACE           STATUS          NODE
metadata.name metadata.namespace  status.phase    spec.nodeName
EOF

kubectl get pods -o custom-columns-file=columns.txt
```

### Go Template Output

```bash
# Use Go templates for complex formatting
kubectl get pods -o go-template='{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}'

# Get pods with their restart counts
kubectl get pods -o go-template='{{range .items}}{{.metadata.name}}: {{range .status.containerStatuses}}{{.restartCount}}{{end}}{{"\n"}}{{end}}'
```

## Labels and Selectors

Labels are key-value pairs attached to Kubernetes objects. Selectors allow you to filter objects based on labels.

### Working with Labels

```bash
# View labels on resources
kubectl get pods --show-labels

# Add a label to a resource
kubectl label pod my-pod environment=production

# Update an existing label (use --overwrite)
kubectl label pod my-pod environment=staging --overwrite

# Remove a label (use minus sign after label key)
kubectl label pod my-pod environment-

# Add labels to multiple resources
kubectl label pods --all environment=development
```

### Label Selectors

```bash
# Select resources by exact label match
kubectl get pods -l environment=production

# Select resources with label existing (any value)
kubectl get pods -l environment

# Select resources without a specific label
kubectl get pods -l '!environment'

# Multiple label selectors (AND logic)
kubectl get pods -l environment=production,tier=frontend

# Set-based selectors
kubectl get pods -l 'environment in (production, staging)'
kubectl get pods -l 'environment notin (development)'
kubectl get pods -l 'tier in (frontend, backend),environment=production'
```

### Field Selectors

```bash
# Select resources by field values
kubectl get pods --field-selector status.phase=Running

# Multiple field selectors
kubectl get pods --field-selector status.phase=Running,spec.restartPolicy=Always

# Combine with label selectors
kubectl get pods -l app=nginx --field-selector status.phase=Running

# Select pods on a specific node
kubectl get pods --field-selector spec.nodeName=worker-1
```

### Annotations

```bash
# Annotations are similar to labels but for non-identifying metadata
kubectl annotate pod my-pod description="Production web server"

# View annotations
kubectl describe pod my-pod | grep -A5 Annotations

# Remove an annotation
kubectl annotate pod my-pod description-
```

## kubectl Plugins with Krew

Krew is the plugin manager for kubectl, allowing you to discover and install useful plugins.

### Installing Krew

```bash
# Install Krew on Ubuntu
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

# Add Krew to your PATH
echo 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify Krew installation
kubectl krew version
```

### Using Krew

```bash
# Update the plugin index
kubectl krew update

# Search for plugins
kubectl krew search
kubectl krew search ctx  # Search for context-related plugins

# Install a plugin
kubectl krew install ctx        # Easy context switching
kubectl krew install ns         # Easy namespace switching
kubectl krew install neat       # Clean up YAML output
kubectl krew install tree       # Show resource hierarchy
kubectl krew install images     # Show container images
kubectl krew install whoami     # Show current user info

# List installed plugins
kubectl krew list

# Get info about a plugin
kubectl krew info ctx

# Upgrade installed plugins
kubectl krew upgrade

# Uninstall a plugin
kubectl krew uninstall ctx
```

### Popular kubectl Plugins

```bash
# After installing plugins, use them like regular kubectl commands

# ctx - Quick context switching
kubectl ctx                     # List contexts
kubectl ctx production          # Switch to production context

# ns - Quick namespace switching
kubectl ns                      # List namespaces
kubectl ns kube-system          # Switch to kube-system namespace

# neat - Clean up YAML output (removes managed fields)
kubectl get pod my-pod -o yaml | kubectl neat

# tree - Show resource ownership hierarchy
kubectl tree deployment nginx

# images - List container images in use
kubectl images -A

# whoami - Show current user and permissions
kubectl whoami

# access-matrix - Show access matrix for resources
kubectl access-matrix

# tail - Stream logs from multiple pods
kubectl tail --selector app=nginx

# sniff - Capture network traffic from pods
kubectl sniff my-pod
```

## Aliases and Shortcuts

Create aliases to speed up your kubectl workflow.

### Common kubectl Aliases

Add these to your `~/.bashrc` or `~/.bash_aliases`:

```bash
# Basic kubectl alias
alias k='kubectl'

# Get commands
alias kg='kubectl get'
alias kgp='kubectl get pods'
alias kgd='kubectl get deployments'
alias kgs='kubectl get services'
alias kgn='kubectl get nodes'
alias kga='kubectl get all'
alias kgaa='kubectl get all -A'

# Get with wide output
alias kgpw='kubectl get pods -o wide'
alias kgnw='kubectl get nodes -o wide'

# Describe commands
alias kd='kubectl describe'
alias kdp='kubectl describe pod'
alias kdd='kubectl describe deployment'
alias kds='kubectl describe service'

# Delete commands
alias krm='kubectl delete'
alias krmp='kubectl delete pod'
alias krmd='kubectl delete deployment'

# Apply and create
alias ka='kubectl apply -f'
alias kc='kubectl create'

# Logs
alias kl='kubectl logs'
alias klf='kubectl logs -f'
alias klt='kubectl logs --tail=100'

# Exec
alias ke='kubectl exec -it'

# Context and namespace
alias kx='kubectl config use-context'
alias kns='kubectl config set-context --current --namespace'
alias kccc='kubectl config current-context'
alias kcgc='kubectl config get-contexts'

# Watch pods
alias kwp='watch kubectl get pods'

# Top (resource usage)
alias ktp='kubectl top pods'
alias ktn='kubectl top nodes'

# Apply common patterns
alias kaf='kubectl apply -f'
alias kdf='kubectl delete -f'

# Rollout commands
alias kro='kubectl rollout'
alias kros='kubectl rollout status'
alias kroh='kubectl rollout history'
alias krou='kubectl rollout undo'
```

### Useful Functions

Add these functions to your `~/.bashrc`:

```bash
# Quick pod shell access
# Usage: ksh my-pod
ksh() {
    kubectl exec -it "$1" -- /bin/sh
}

# Quick pod bash access
# Usage: kbash my-pod
kbash() {
    kubectl exec -it "$1" -- /bin/bash
}

# Get pod logs with grep
# Usage: klg my-pod "error"
klg() {
    kubectl logs "$1" | grep -i "$2"
}

# Delete all pods in a namespace
# Usage: kdelpods my-namespace
kdelpods() {
    kubectl delete pods --all -n "${1:-default}"
}

# Get all resources in a namespace
# Usage: kgetall my-namespace
kgetall() {
    kubectl get all -n "${1:-default}"
}

# Watch resource
# Usage: kwatch pods
kwatch() {
    watch -n 2 "kubectl get $1"
}

# Port forward with common format
# Usage: kpf my-pod 8080:80
kpf() {
    kubectl port-forward "$1" "$2"
}

# Get events sorted by time
# Usage: kevents or kevents my-namespace
kevents() {
    kubectl get events --sort-by='.lastTimestamp' ${1:+-n $1}
}

# Decode a secret
# Usage: ksecret my-secret my-key
ksecret() {
    kubectl get secret "$1" -o jsonpath="{.data.$2}" | base64 --decode
}

# Quick resource count
# Usage: kcount pods
kcount() {
    kubectl get "$1" --no-headers | wc -l
}
```

### Apply Aliases

```bash
# Reload your shell configuration
source ~/.bashrc

# Or if using aliases file
source ~/.bash_aliases
```

## kubectl Autocomplete

Enable shell autocompletion for kubectl to improve productivity.

### Bash Completion

```bash
# Install bash-completion if not already installed
sudo apt install -y bash-completion

# Enable kubectl autocompletion for the current shell session
source <(kubectl completion bash)

# Add kubectl autocompletion permanently to your bash profile
echo 'source <(kubectl completion bash)' >> ~/.bashrc

# If you're using the 'k' alias, enable completion for it too
echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc

# Reload your shell
source ~/.bashrc
```

### Zsh Completion

If you're using Zsh instead of Bash:

```bash
# Enable kubectl autocompletion in Zsh
source <(kubectl completion zsh)

# Add permanently to your Zsh configuration
echo 'source <(kubectl completion zsh)' >> ~/.zshrc

# If using the 'k' alias
echo 'compdef k=kubectl' >> ~/.zshrc

# Reload Zsh
source ~/.zshrc
```

### Testing Autocompletion

```bash
# Type 'kubectl' and press Tab twice to see all commands
kubectl [TAB][TAB]

# Type partial command and press Tab to complete
kubectl get po[TAB]  # Completes to 'kubectl get pods'

# Tab completion works for resource names too
kubectl describe pod my-[TAB]  # Lists pods starting with 'my-'

# Works with namespaces
kubectl -n kube-[TAB]  # Completes to 'kubectl -n kube-system'
```

## Troubleshooting kubectl

Common issues and their solutions when working with kubectl.

### Connection Issues

```bash
# Problem: Unable to connect to the server
# Solution 1: Check if the cluster is reachable
ping $(kubectl config view -o jsonpath='{.clusters[0].cluster.server}' | sed 's|https://||;s|:.*||')

# Solution 2: Verify your kubeconfig
kubectl config view
kubectl config current-context

# Solution 3: Check certificate validity
kubectl config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' | base64 -d | openssl x509 -text -noout | grep -A2 Validity

# Solution 4: Test with verbose output
kubectl get pods -v=8  # Very verbose, shows HTTP requests
```

### Authentication Issues

```bash
# Problem: Unauthorized or forbidden errors
# Solution 1: Check your credentials
kubectl auth whoami

# Solution 2: Verify you have the right context
kubectl config current-context

# Solution 3: Check your permissions
kubectl auth can-i get pods
kubectl auth can-i '*' '*'  # Check for admin access

# Solution 4: Refresh your credentials (for cloud providers)
# AWS EKS
aws eks update-kubeconfig --name my-cluster

# Google GKE
gcloud container clusters get-credentials my-cluster --zone us-central1-a

# Azure AKS
az aks get-credentials --resource-group myResourceGroup --name myAKSCluster
```

### Common Error Messages

```bash
# Error: "The connection to the server localhost:8080 was refused"
# Cause: No kubeconfig file or KUBECONFIG not set
# Solution:
export KUBECONFIG=~/.kube/config
# Or copy your kubeconfig to the default location

# Error: "error: You must be logged in to the server (Unauthorized)"
# Cause: Invalid or expired credentials
# Solution: Refresh your credentials or check token expiration

# Error: "Unable to connect to the server: x509: certificate signed by unknown authority"
# Cause: Self-signed certificate not trusted
# Solution 1: Add CA certificate
kubectl config set-cluster my-cluster --certificate-authority=/path/to/ca.crt
# Solution 2: Skip TLS verification (NOT recommended for production)
kubectl config set-cluster my-cluster --insecure-skip-tls-verify=true

# Error: "error: resource mapping not found"
# Cause: Using wrong API version or resource doesn't exist
# Solution: Check available API resources
kubectl api-resources | grep -i <resource-name>
```

### Debugging Techniques

```bash
# Increase verbosity level for debugging
kubectl get pods -v=6  # Useful request/response info
kubectl get pods -v=8  # Very detailed HTTP info
kubectl get pods -v=9  # Maximum verbosity

# Check cluster health
kubectl get componentstatuses
kubectl get nodes
kubectl cluster-info dump

# Check API server logs (if you have access)
kubectl logs -n kube-system kube-apiserver-master

# Validate your YAML files before applying
kubectl apply -f manifest.yaml --dry-run=client
kubectl apply -f manifest.yaml --dry-run=server  # Server-side validation

# Check resource events for issues
kubectl describe pod my-pod | tail -20  # Events are at the bottom
kubectl get events --sort-by='.lastTimestamp'

# Check resource status conditions
kubectl get pods -o jsonpath='{.items[*].status.conditions}'
```

### Reset and Clean Up

```bash
# Reset kubeconfig to defaults
rm ~/.kube/config
# Then reconfigure your clusters

# Clear kubectl cache
rm -rf ~/.kube/cache

# Reset specific context/cluster/user
kubectl config unset contexts.my-context
kubectl config unset clusters.my-cluster
kubectl config unset users.my-user
```

## Best Practices and Tips

### Security Best Practices

```bash
# Use RBAC (Role-Based Access Control) for fine-grained permissions
# Never use cluster-admin for regular tasks

# Protect your kubeconfig file
chmod 600 ~/.kube/config

# Use short-lived tokens when possible
# Rotate credentials regularly

# Avoid storing credentials in kubeconfig
# Use exec-based authentication for cloud providers

# Always use --dry-run to preview changes
kubectl apply -f dangerous-manifest.yaml --dry-run=server
```

### Productivity Tips

```bash
# Use kubectl explain to understand resource fields
kubectl explain pod
kubectl explain pod.spec.containers
kubectl explain deployment.spec.strategy

# Generate YAML templates
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml > deployment.yaml

# Edit resources directly (opens in $EDITOR)
kubectl edit deployment nginx

# Use kubectl diff to preview changes
kubectl diff -f updated-manifest.yaml

# Set up multiple terminal windows with different contexts
# Window 1: production, Window 2: staging

# Use tmux or screen for persistent sessions
```

## Complete Configuration Example

Here's a complete example bringing everything together:

```bash
#!/bin/bash
# kubectl-setup.sh - Complete kubectl configuration script for Ubuntu

set -e  # Exit on error

echo "=== Installing kubectl ==="
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl gnupg

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | \
    sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | \
    sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubectl

echo "=== Setting up bash completion ==="
sudo apt install -y bash-completion
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc

echo "=== Setting up kubectl aliases ==="
cat >> ~/.bashrc << 'EOF'
# kubectl aliases
alias kg='kubectl get'
alias kgp='kubectl get pods'
alias kgpw='kubectl get pods -o wide'
alias kd='kubectl describe'
alias kl='kubectl logs'
alias klf='kubectl logs -f'
alias ke='kubectl exec -it'
alias ka='kubectl apply -f'
alias kx='kubectl config use-context'
alias kns='kubectl config set-context --current --namespace'
EOF

echo "=== Installing Krew ==="
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)
echo 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"' >> ~/.bashrc

echo "=== Creating .kube directory ==="
mkdir -p ~/.kube
chmod 700 ~/.kube

echo "=== Installation complete! ==="
echo "Run 'source ~/.bashrc' to apply changes"
echo "Then configure your kubeconfig at ~/.kube/config"
```

Save this script and run it:

```bash
# Make the script executable and run it
chmod +x kubectl-setup.sh
./kubectl-setup.sh

# Apply the changes
source ~/.bashrc

# Verify installation
kubectl version --client
```

## Monitoring Your Kubernetes Clusters with OneUptime

While kubectl is excellent for interacting with your Kubernetes clusters, you need robust monitoring to ensure your applications stay healthy and performant. **OneUptime** provides comprehensive monitoring for Kubernetes environments.

With OneUptime, you can:

- **Monitor cluster health**: Track node status, resource utilization, and pod health across all your clusters
- **Set up intelligent alerting**: Get notified immediately when pods crash, nodes become unavailable, or resources are exhausted
- **Visualize metrics**: Create dashboards to monitor CPU, memory, network, and storage metrics in real-time
- **Track deployments**: Monitor rollout progress and automatically detect deployment failures
- **Centralize logging**: Aggregate logs from all your pods and containers in one place
- **Create status pages**: Keep your users informed about the health of your Kubernetes-hosted services

To get started with OneUptime for Kubernetes monitoring, visit [https://oneuptime.com](https://oneuptime.com) and set up your free account. With OneUptime's comprehensive monitoring capabilities, you can ensure your kubectl-managed clusters remain reliable, performant, and highly available.
