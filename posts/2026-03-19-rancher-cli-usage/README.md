# How to Use the Rancher CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CLI, Cluster Management

Description: A practical guide to using the Rancher CLI for managing clusters, projects, apps, and resources from the command line.

The Rancher CLI gives you command-line access to your Rancher server, letting you manage clusters, projects, namespaces, and Kubernetes resources without opening a browser. This guide covers the most common operations you will perform with the Rancher CLI.

## Logging In

Before you can use any CLI commands, you need to authenticate with your Rancher server:

```bash
rancher login https://rancher.example.com --token token-xxxxx:yyyyyyyyyyyyyyyy
```

If your Rancher instance uses a private or self-signed CA certificate, pass it with `--cacert`:

```bash
rancher login https://rancher.example.com --token token-xxxxx:yyyyyyyyyyyyyyyy --cacert /path/to/cacerts.pem
```

After a successful login, the CLI stores your credentials in `~/.rancher/cli2.json`.

## Switching Contexts

Rancher CLI uses contexts to determine which cluster and project you are working with.

### List Available Contexts

```bash
rancher context switch
```

This displays an interactive menu of all available clusters and projects. Select one by entering its number.

### View Current Context

```bash
rancher context current
```

### Switch to a Specific Project

```bash
rancher context switch c-m-abc12345:p-xyz789
```

## Managing Clusters

### List All Clusters

```bash
rancher clusters ls
```

This outputs a table with cluster IDs, states, names, providers, node counts, and cluster resource totals.

### Inspect a Cluster

```bash
rancher inspect --type cluster production
```

### Get Cluster Kubeconfig

```bash
rancher clusters kubeconfig production
```

This outputs the kubeconfig YAML, which you can redirect to a file:

```bash
rancher clusters kubeconfig production > ~/.kube/production.yaml
```

## Managing Projects

### List Projects

```bash
rancher projects ls
```

### Create a New Project

```bash
rancher projects create --cluster production --description "Team Alpha services" team-alpha
```

### Switch to a Project

```bash
rancher context switch team-alpha
```

## Managing Namespaces

### List Namespaces

To list namespaces in your current project:

```bash
rancher namespaces ls
```

### Create a Namespace

```bash
rancher namespaces create my-namespace
```

### Move a Namespace to a Different Project

```bash
rancher namespaces move my-namespace c-m-abc12345:p-abcde
```

## Working with Applications (Catalog Apps)

Current Rancher CLI releases do not include the legacy `catalog` or `apps` command groups. Manage Rancher apps through the Rancher UI or Helm CLI instead.

## Running kubectl Commands

With `kubectl` installed locally, the Rancher CLI can run it against the cluster in your current Rancher context:

```bash
rancher kubectl get pods --all-namespaces
```

```bash
rancher kubectl get nodes -o wide
```

```bash
rancher kubectl apply -f deployment.yaml
```

The CLI uses the current Rancher context to generate and cache the kubeconfig it needs for the selected cluster, so you do not need to manage a separate kubeconfig manually for each command.

## Managing Tokens

Current Rancher CLI releases do not provide `tokens ls`, `tokens create`, or `tokens delete` commands for Rancher API keys. Create API tokens in the Rancher UI or API, then use them with `rancher login --token`.

To clear cached kubeconfig credentials used by the CLI, run:

```bash
rancher token delete all
```

## Working with Multi-Cluster Apps

Current Rancher CLI releases do not include the legacy `multiclusterapps` command group.

## Using Output Formats

The CLI supports different output formats for scripting:

### JSON Output

```bash
rancher clusters ls --format json
```

### Custom Format

```bash
rancher clusters ls --format '{{.Cluster.Name}} {{.Cluster.State}}'
```

### Quiet Mode (IDs only)

```bash
rancher clusters ls -q
```

## Practical Scripting Examples

### Deploy to All Clusters

```bash
#!/bin/bash

for cluster_id in $(rancher clusters ls -q); do
  echo "Deploying to cluster: ${cluster_id}"
  kubeconfig="$(mktemp)"
  rancher clusters kubeconfig "${cluster_id}" > "${kubeconfig}"
  KUBECONFIG="${kubeconfig}" kubectl apply -f deployment.yaml
  rm -f "${kubeconfig}"
done
```

### Check Node Status Across Clusters

```bash
#!/bin/bash

for cluster_id in $(rancher clusters ls -q); do
  echo "=== ${cluster_id} ==="
  kubeconfig="$(mktemp)"
  rancher clusters kubeconfig "${cluster_id}" > "${kubeconfig}"
  KUBECONFIG="${kubeconfig}" kubectl get nodes -o wide
  rm -f "${kubeconfig}"
  echo ""
done
```

### Export All Cluster Kubeconfigs

```bash
#!/bin/bash

mkdir -p ~/.kube/rancher

for cluster_id in $(rancher clusters ls -q); do
  rancher clusters kubeconfig "${cluster_id}" > ~/.kube/rancher/${cluster_id}.yaml
  echo "Exported kubeconfig for ${cluster_id}"
done
```

## Helpful CLI Tips

### Check Command Help

Current Rancher CLI releases do not include a built-in `completion` command. Use the built-in help for command discovery:

```bash
rancher --help
rancher clusters --help
rancher context switch --help
```

### Use Environment Variables

The CLI supports environment variables for some options:

```bash
export RANCHER_CONFIG_DIR="$HOME/.rancher"
export CATTLE_OAUTH_AUTH_FLOW=authcode
```

### Check CLI Version

```bash
rancher --version
```

## Summary

The Rancher CLI provides a fast and scriptable way to manage common Rancher workflows from the terminal. From switching contexts and managing clusters and namespaces to generating kubeconfigs and running kubectl commands, it works well for both day-to-day administration and automation.
