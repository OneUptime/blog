# How to Use talosctl version to Check Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Version Management, Kubernetes, Cluster Administration

Description: Learn how to use the talosctl version command to check client and node versions in your Talos Linux cluster

---

Knowing exactly which version of Talos Linux is running on your nodes is fundamental to cluster management. Version mismatches between your client tool and the nodes, or between nodes themselves, can cause unexpected behavior. The `talosctl version` command is the quickest way to get this information and is something you will use regularly when managing Talos Linux clusters.

## What talosctl version Shows

The `talosctl version` command reports two pieces of information: the version of the `talosctl` client you are running locally, and the version of Talos Linux running on the target node. This dual reporting makes it easy to spot version mismatches at a glance.

```bash
# Check versions
talosctl version --nodes 192.168.1.10
```

The output looks something like this:

```text
Client:
    Tag:         v1.7.0
    SHA:         abc1234
    Built:
    Go version:  go1.22.0
    OS/Arch:     linux/amd64

Server:
    NODE:        192.168.1.10
    Tag:         v1.7.0
    SHA:         abc1234
    Built:
    Go version:  go1.22.0
    OS/Arch:     linux/amd64
    Enabled:     RBAC
```

The Client section shows the version of your local `talosctl` binary. The Server section shows what is running on the targeted node.

## Checking Multiple Nodes

One of the most useful things about `talosctl version` is that you can check multiple nodes at once:

```bash
# Check versions across all control plane nodes
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

The output will include a Server section for each node, making it easy to compare versions across your cluster:

```text
Client:
    Tag:         v1.7.0
    ...

Server:
    NODE:        192.168.1.10
    Tag:         v1.7.0
    ...

Server:
    NODE:        192.168.1.11
    Tag:         v1.7.0
    ...

Server:
    NODE:        192.168.1.12
    Tag:         v1.6.5
    ...
```

In this example, you can immediately see that the third node is running a different version. This kind of mismatch is something you want to catch and fix.

## Checking Just the Client Version

If you only want to see the client version without connecting to any node, you can run the command without specifying nodes and without a configured endpoint:

```bash
# Show only the client version
talosctl version --client
```

This is useful when you are setting up a new workstation and want to verify that `talosctl` installed correctly, or when you are troubleshooting and want to make sure you are running the expected version.

## Understanding Version Tags

Talos Linux follows semantic versioning. The version tag looks like `v1.7.0`, where:

- The first number (1) is the major version. Major version changes can include breaking changes.
- The second number (7) is the minor version. Minor versions add new features but remain backward compatible.
- The third number (0) is the patch version. Patch versions contain bug fixes and security updates.

When managing a cluster, you generally want all nodes running the same minor version. Mixing minor versions is supported during upgrades but should not be a permanent state.

## Using Version Information for Upgrades

The version command is essential when planning upgrades. Before starting an upgrade, check the current state of your cluster:

```bash
#!/bin/bash
# Script to check versions across the entire cluster

ALL_NODES="192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21,192.168.1.22"

echo "Checking versions across all nodes..."
talosctl version --nodes "$ALL_NODES"
```

After running an upgrade on each node, use the version command to verify the upgrade was successful:

```bash
# Upgrade a node
talosctl upgrade --nodes 192.168.1.20 --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back
sleep 60

# Verify the new version
talosctl version --nodes 192.168.1.20
```

## JSON Output for Automation

For scripting and automation purposes, you can get the version information in JSON format:

```bash
# Get version info as JSON
talosctl version --nodes 192.168.1.10 -o json
```

This outputs structured data that you can parse with tools like `jq`:

```bash
# Extract just the server tag from JSON output
talosctl version --nodes 192.168.1.10 -o json | jq -r '.server[0].version.tag'

# Check if all nodes are running the same version
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12 -o json | \
  jq -r '.server[].version.tag' | sort -u
```

If the `sort -u` command returns a single line, all nodes are running the same version. If it returns multiple lines, you have a version mismatch.

## Version Compatibility

Talos Linux maintains compatibility between the client and server within the same minor version. However, it is recommended to keep your `talosctl` client at the same version as your nodes. If there is a mismatch, some newer features or commands might not work as expected.

```bash
# Check for version mismatch
CLIENT_VERSION=$(talosctl version --client -o json | jq -r '.client.version.tag')
SERVER_VERSION=$(talosctl version --nodes 192.168.1.10 -o json | jq -r '.server[0].version.tag')

if [ "$CLIENT_VERSION" != "$SERVER_VERSION" ]; then
  echo "WARNING: Version mismatch detected"
  echo "Client: $CLIENT_VERSION"
  echo "Server: $SERVER_VERSION"
  echo "Consider updating your talosctl binary"
fi
```

## Checking the Kubernetes Version

While `talosctl version` shows the Talos Linux version, you might also want to know which Kubernetes version your cluster is running. Each Talos Linux release ships with a specific Kubernetes version:

```bash
# Check Kubernetes version via kubectl
kubectl version

# Or check the kubelet version on a specific node
talosctl services --nodes 192.168.1.10 | grep kubelet
```

Talos Linux documentation provides a compatibility matrix that maps Talos versions to supported Kubernetes versions. Checking this matrix before upgrading ensures you pick compatible versions.

## Integrating Version Checks into CI/CD

If you manage your Talos Linux cluster through a CI/CD pipeline, adding version checks is a good practice:

```bash
#!/bin/bash
# CI/CD version verification script

EXPECTED_VERSION="v1.7.0"
ALL_NODES="192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21"

# Get unique versions across all nodes
VERSIONS=$(talosctl version --nodes "$ALL_NODES" -o json | jq -r '.server[].version.tag' | sort -u)
VERSION_COUNT=$(echo "$VERSIONS" | wc -l)

# Check that all nodes are on the expected version
if [ "$VERSION_COUNT" -ne 1 ]; then
  echo "ERROR: Multiple versions detected across cluster"
  echo "$VERSIONS"
  exit 1
fi

ACTUAL_VERSION=$(echo "$VERSIONS" | head -1)
if [ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]; then
  echo "ERROR: Expected $EXPECTED_VERSION but found $ACTUAL_VERSION"
  exit 1
fi

echo "All nodes running expected version: $EXPECTED_VERSION"
```

This script fails the pipeline if nodes are running different versions or if the version does not match what you expect. This kind of automated check prevents configuration drift.

## Troubleshooting Version Issues

If `talosctl version` fails to connect to a node, here are some things to check:

```bash
# Verify network connectivity
ping -c 3 192.168.1.10

# Check if the Talos API port is open (default 50000)
nc -zv 192.168.1.10 50000

# Verify your talosctl config has the correct endpoints
talosctl config info
```

If the client version is significantly newer than the server version, some commands might behave differently or fail. Always try to keep versions in sync.

## Best Practices

- Run `talosctl version` before any maintenance operation to establish a baseline.
- Check versions after every upgrade to confirm success.
- Keep your `talosctl` client version matched to your cluster version.
- Use JSON output and scripting to automate version checks across large clusters.
- Include version checks in your monitoring and alerting.
- Document the expected version for each cluster in your runbooks.

The `talosctl version` command is simple but provides critical visibility into your cluster state. Making it part of your regular operational workflow will help you catch issues early and keep your cluster running smoothly.
