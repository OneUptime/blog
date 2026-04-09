# How to Enable and Configure Ceph Telemetry Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Telemetry, Module, Configuration, Storage

Description: Learn how to enable and configure the Ceph telemetry module to share anonymized cluster data with the Ceph community and improve storage software for everyone.

---

## What Is the Ceph Telemetry Module?

The Ceph telemetry module (`mgr/telemetry`) collects anonymized information about cluster configuration, usage, and health, and optionally shares it with the Ceph development team. This data helps identify common failure patterns, improve default configurations, and prioritize bug fixes.

Participation is opt-in and the data sent is anonymized.

## Checking Telemetry Module Status

```bash
ceph mgr module ls | grep telemetry
ceph telemetry status
```

Check if telemetry is currently enabled:

```bash
ceph config get mgr mgr/telemetry/enabled
```

## Enabling the Telemetry Module

Enable the module if not already active (note: since Ceph Octopus, telemetry is an always-on manager module and is enabled by default):

```bash
ceph mgr module enable telemetry
```

Opt in to sharing data with the Ceph project:

```bash
ceph telemetry on --license sharing-1-0
```

Verify the opt-in was accepted:

```bash
ceph telemetry status
```

## Previewing Telemetry Data Before Opt-In

Before opting in, review exactly what will be sent:

```bash
ceph telemetry show
```

For a specific channel:

```bash
ceph telemetry show basic
ceph telemetry show crash
ceph telemetry show device
```

## Telemetry Channels

Ceph telemetry uses channels to categorize data:

| Channel | Description |
|---------|-------------|
| `basic` | Cluster topology, version, and configuration |
| `crash` | Anonymized crash reports |
| `device` | Device health predictions (SMART data) |
| `perf` | Various performance metrics of the cluster |
| `ident` | Optional: organization name and contact |

Enable or disable individual channels:

```bash
ceph config set mgr mgr/telemetry/channel_basic true
ceph config set mgr mgr/telemetry/channel_crash true
ceph config set mgr mgr/telemetry/channel_device true
```

## Configuring the Telemetry Endpoint

By default, telemetry sends to `https://telemetry.ceph.com/report`. For air-gapped environments, configure a custom proxy:

```bash
ceph config set mgr mgr/telemetry/proxy https://your-proxy.example.com
```

Set a contact and description for your cluster:

```bash
ceph config set mgr mgr/telemetry/contact "admin@example.com"
ceph config set mgr mgr/telemetry/description "Production cluster - datacenter A"
```

## Rook Toolbox Management

Manage telemetry from the Rook toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable telemetry

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph telemetry on --license sharing-1-0
```

## Summary

The Ceph telemetry module enables opt-in sharing of anonymized cluster metrics that benefit the entire Ceph community. Enabling it requires enabling the mgr module and accepting the sharing license. Channels allow fine-grained control over what categories of data are shared. In Rook environments, the toolbox pod provides easy access to all telemetry configuration commands.
