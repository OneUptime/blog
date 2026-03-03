# How to Merge talosconfig into Your Default Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosconfig, Configuration Management, talosctl, Multi-Cluster

Description: Learn how to merge talosconfig files to manage multiple Talos Linux clusters from a single configuration.

---

When you generate a Talos Linux cluster configuration with `talosctl gen config`, one of the output files is `talosconfig`. This file contains the client credentials and endpoint information that talosctl needs to communicate with your cluster. If you manage multiple Talos clusters, you quickly end up with multiple talosconfig files, and juggling them manually gets tedious.

The solution is merging these configs into a single file, similar to how kubectl users merge multiple kubeconfig files into `~/.kube/config`. This guide shows you how to do that with Talos.

## Where talosconfig Lives

By default, talosctl looks for its configuration at `~/.talos/config`. You can override this with the `TALOSCONFIG` environment variable or the `--talosconfig` flag.

```bash
# Default location
~/.talos/config

# Override with environment variable
export TALOSCONFIG="/path/to/custom/talosconfig"

# Override per-command
talosctl services --talosconfig /path/to/talosconfig
```

## Understanding talosconfig Structure

A talosconfig file looks like this:

```yaml
context: my-cluster
contexts:
  my-cluster:
    endpoints:
      - 192.168.1.101
      - 192.168.1.102
      - 192.168.1.103
    nodes:
      - 192.168.1.101
    ca: LS0tLS1CRUdJTi... # base64-encoded CA certificate
    crt: LS0tLS1CRUdJTi... # base64-encoded client certificate
    key: LS0tLS1CRUdJTi... # base64-encoded client key
```

Key fields:

- **context** - The currently active cluster context
- **contexts** - A map of named cluster configurations
- **endpoints** - The control plane addresses talosctl connects through
- **nodes** - Default target nodes for commands
- **ca, crt, key** - TLS credentials for authenticating with the Talos API

When you merge configs, you are combining multiple contexts (each representing a cluster) into a single file and switching between them.

## Merging a New talosconfig

The `talosctl config merge` command adds a talosconfig file into your default configuration:

```bash
# Merge a talosconfig into the default location (~/.talos/config)
talosctl config merge ./talosconfig
```

If `~/.talos/config` does not exist yet, it is created. If it already exists, the new context is added to it.

Let us walk through a practical example. Say you have two clusters:

```bash
# Cluster A - generate and save configs
cd ~/clusters/cluster-a
talosctl gen config cluster-a https://10.0.1.100:6443
# This creates: controlplane.yaml, worker.yaml, talosconfig

# Merge cluster-a's config into the default talosconfig
talosctl config merge ./talosconfig

# Cluster B - generate and save configs
cd ~/clusters/cluster-b
talosctl gen config cluster-b https://10.0.2.100:6443

# Merge cluster-b's config
talosctl config merge ./talosconfig
```

Now your `~/.talos/config` contains both clusters:

```yaml
context: cluster-b  # The last merged context becomes active
contexts:
  cluster-a:
    endpoints:
      - 10.0.1.100
    ca: ...
    crt: ...
    key: ...
  cluster-b:
    endpoints:
      - 10.0.2.100
    ca: ...
    crt: ...
    key: ...
```

## Switching Between Clusters

Once you have multiple contexts, switch between them:

```bash
# See available contexts
talosctl config contexts

# Switch to a different cluster
talosctl config context cluster-a

# Verify you are on the right cluster
talosctl config info

# Run a command against the active cluster
talosctl version
```

This is very similar to `kubectl config use-context` for Kubernetes.

## Renaming Contexts During Merge

When you generate a config, the context name defaults to the cluster name you specified. If you want a different name:

```bash
# Generate config with the default name "prod-cluster"
talosctl gen config prod-cluster https://10.0.3.100:6443

# The talosconfig has context name "prod-cluster"
# Merge it as-is
talosctl config merge ./talosconfig
```

If two clusters have the same context name, the merge will fail to avoid accidentally overwriting credentials. In that case, you can edit the talosconfig file to change the context name before merging:

```bash
# Check what the context name is
cat ./talosconfig | grep "^context:"

# If it conflicts, edit the file to change the context name
# Change both the top-level "context" field and the key under "contexts"
```

## Setting Endpoints and Nodes After Merge

After merging, you might want to update the endpoints or default nodes for a context:

```bash
# Switch to the cluster you want to configure
talosctl config context cluster-a

# Update the endpoints
talosctl config endpoint 10.0.1.101 10.0.1.102 10.0.1.103

# Set a default node
talosctl config node 10.0.1.101

# Verify
talosctl config info
```

These changes are written to `~/.talos/config` automatically.

## Manually Editing the Config

Sometimes it is easier to edit the config file directly. The format is straightforward YAML:

```yaml
context: cluster-a
contexts:
  cluster-a:
    endpoints:
      - 10.0.1.101
      - 10.0.1.102
      - 10.0.1.103
    nodes:
      - 10.0.1.101
    ca: LS0tLS1CRUdJ...
    crt: LS0tLS1CRUdJ...
    key: LS0tLS1CRUdJ...
  cluster-b:
    endpoints:
      - 10.0.2.100
    nodes:
      - 10.0.2.100
    ca: LS0tLS1CRUdJ...
    crt: LS0tLS1CRUdJ...
    key: LS0tLS1CRUdJ...
  staging:
    endpoints:
      - 172.16.0.100
    nodes:
      - 172.16.0.100
    ca: LS0tLS1CRUdJ...
    crt: LS0tLS1CRUdJ...
    key: LS0tLS1CRUdJ...
```

Just make sure you do not corrupt the base64-encoded certificate data.

## Removing a Cluster Context

If you decommission a cluster and want to remove its context:

```bash
# There is no built-in remove command, so edit the file directly
# Open ~/.talos/config and delete the context entry

# If the deleted context was the active one, switch to another:
talosctl config context cluster-a
```

## Using TALOSCONFIG for Temporary Overrides

If you get a talosconfig for a temporary task (like helping debug someone else's cluster), use the environment variable instead of merging:

```bash
# Temporarily use a different config without merging
export TALOSCONFIG=/tmp/their-talosconfig
talosctl services --nodes 10.99.0.1

# When done, unset the override
unset TALOSCONFIG
```

This keeps your default config clean and avoids cluttering it with one-off contexts.

## Backup Your talosconfig

The talosconfig file contains private keys that grant full access to your Talos clusters. Treat it like you would treat SSH private keys.

```bash
# Back up your talosconfig
cp ~/.talos/config ~/.talos/config.backup

# Set restrictive permissions
chmod 600 ~/.talos/config
```

If someone gets access to your talosconfig, they can manage your Talos nodes - apply configurations, reset nodes, or retrieve secrets from the cluster.

## Shell Integration Tips

Add these to your shell profile for convenience:

```bash
# Add to ~/.bashrc or ~/.zshrc

# Always use the default talosconfig location
export TALOSCONFIG="$HOME/.talos/config"

# Quick function to switch Talos contexts
tc() {
  if [ -z "$1" ]; then
    talosctl config contexts
  else
    talosctl config context "$1"
  fi
}

# Show the current Talos context in your prompt (for zsh)
talos_context() {
  talosctl config info 2>/dev/null | grep "Current context" | awk '{print $3}'
}
```

Merging talosconfig files is a simple but important practice for anyone managing multiple Talos Linux clusters. It keeps your workflow efficient and prevents the common mistake of running commands against the wrong cluster because you forgot to set the right config file.
