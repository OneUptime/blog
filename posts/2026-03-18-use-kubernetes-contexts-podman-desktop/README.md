# How to Use Kubernetes Contexts in Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Kubernetes, Context, kubeconfig

Description: Learn how to manage and switch between multiple Kubernetes contexts in Podman Desktop to work with different clusters from a single interface.

---

> Kubernetes contexts let you switch between clusters, users, and namespaces without editing configuration files every time you change environments.

When working with multiple Kubernetes clusters such as local development, staging, and production, Kubernetes contexts provide a way to switch between them efficiently. Podman Desktop integrates with your kubeconfig file to display and manage these contexts through a convenient graphical interface.

---

## Understanding Kubernetes Contexts

A Kubernetes context is a combination of a cluster, user, and namespace. Your kubeconfig file stores these contexts and determines which cluster kubectl communicates with.

```bash
# View your current kubeconfig file location

echo $KUBECONFIG
# Defaults to ~/.kube/config if not set

# List all available contexts
kubectl config get-contexts

# Show the current active context
kubectl config current-context

# View the full kubeconfig
kubectl config view
```

## Viewing Contexts in Podman Desktop

Podman Desktop reads your kubeconfig and displays available contexts:

1. Open Podman Desktop and navigate to **Settings**.
2. Go to the **Kubernetes** section.
3. You will see a list of configured contexts.
4. The currently active context is shown in the list.
5. Click the **Set as Current Context** icon next to the context you want to use.

The status bar at the bottom of Podman Desktop also shows the active context.

## Switching Contexts

Switch between contexts using Podman Desktop or the CLI:

```bash
# Switch to a different context via CLI
kubectl config use-context minikube

# Switch to a Kind cluster context
kubectl config use-context kind-my-cluster

# Switch to a remote production context
kubectl config use-context production-cluster

# Verify the switch
kubectl config current-context

# Test connectivity to the new context
kubectl cluster-info
```

In Podman Desktop, click the **Set as Current Context** icon for the desired context in the Kubernetes settings to switch.

## Creating New Contexts

You can create custom contexts that combine specific clusters, users, and namespaces:

```bash
# Set a new context for a specific namespace
kubectl config set-context dev-frontend \
  --cluster=minikube \
  --user=minikube \
  --namespace=frontend

# Set a context for staging with a specific user
kubectl config set-context staging-admin \
  --cluster=staging-cluster \
  --user=staging-admin \
  --namespace=default

# Switch to the new context
kubectl config use-context dev-frontend

# Verify the namespace is set
kubectl config view --minify --output 'jsonpath={..namespace}'
```

## Managing Multiple Kubeconfig Files

When working with multiple clusters, you may have separate kubeconfig files:

```bash
# Merge multiple kubeconfig files
export KUBECONFIG=~/.kube/config:~/.kube/staging-config:~/.kube/production-config

# View all merged contexts
kubectl config get-contexts

# Make the merge permanent by flattening
kubectl config view --flatten > ~/.kube/merged-config
cp ~/.kube/config ~/.kube/config.backup
mv ~/.kube/merged-config ~/.kube/config
```

Podman Desktop uses the kubeconfig file configured in **Settings > Preferences > Kubernetes**. After you flatten the merged output into that file, the merged contexts appear in the UI.

## Setting Default Namespaces per Context

Avoid typing `--namespace` on every command by setting defaults:

```bash
# Set the default namespace for the current context
kubectl config set-context --current --namespace=my-app

# Set a namespace for a specific context
kubectl config set-context minikube --namespace=development

# Verify the namespace setting
kubectl config view --minify | grep namespace
```

## Renaming and Deleting Contexts

Keep your context list clean and organized:

```bash
# Rename a context
kubectl config rename-context old-name new-name

# Delete a context you no longer need
kubectl config delete-context staging-old

# Delete a cluster entry
kubectl config delete-cluster old-cluster

# Delete user credentials
kubectl config delete-user old-user
```

## Using Contexts with Podman Desktop Kubernetes Features

When you deploy to Kubernetes from Podman Desktop, select or confirm the Kubernetes context you want to use before deploying:

```bash
# Ensure the correct context is active before deploying
kubectl config use-context kind-my-cluster

# Generate and deploy from Podman
podman generate kube my-app > my-app.yaml
kubectl apply -f my-app.yaml

# Verify in the target cluster
kubectl get pods -n default
```

Podman Desktop lets you select the Kubernetes context in the deployment flow, so you can confirm the target before deploying.

## Troubleshooting Context Issues

Common context-related issues and their fixes:

```bash
# Check if the kubeconfig file exists and is valid
kubectl config view

# Test connectivity for a specific context
kubectl --context=minikube cluster-info

# Reset a context if credentials expired
kubectl config set-credentials my-user \
  --token=new-token-here

# Check for certificate issues
kubectl --context=my-context get nodes -v=6
```

## Summary

Kubernetes contexts in Podman Desktop provide a seamless way to manage multiple cluster connections from a single interface. By configuring contexts for development, staging, and production environments, you can switch between clusters with a single click. Combined with default namespace settings and proper kubeconfig management, contexts keep your multi-cluster workflow organized and efficient.
