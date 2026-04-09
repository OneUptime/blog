# How to Opt In and Out of Ceph Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Telemetry, Privacy, Configuration, Storage

Description: Learn how to opt in and out of Ceph telemetry sharing, manage individual channels, and configure telemetry behavior in Rook-managed clusters.

---

## Telemetry Opt-In by Default

Starting with Ceph Octopus (15.x), the telemetry module is enabled by default as an always-on module, but data sharing is opt-in. The module runs locally but does not transmit data until you explicitly accept the license.

Check current telemetry status:

```bash
ceph telemetry status
```

Output example:

```json
{
    "enabled": true,
    "last_opt_revision": 0,
    "channel_basic": true,
    "channel_crash": true,
    "channel_device": false,
    "channel_ident": true,
    "channel_perf": false
}
```

## Opting In to Telemetry

To opt in and begin sharing data with the Ceph community:

```bash
ceph telemetry on --license sharing-1-0
```

The `--license sharing-1-0` flag acknowledges the telemetry sharing agreement. Preview the data first:

```bash
ceph telemetry show
```

## Opting Out of Telemetry

To stop sending telemetry data:

```bash
ceph telemetry off
```

Verify telemetry is disabled:

```bash
ceph telemetry status | grep enabled
```

## Selectively Enabling Channels

You can opt in to specific channels while opting out of others:

```bash
# Enable basic cluster stats
ceph config set mgr mgr/telemetry/channel_basic true

# Enable crash reports
ceph config set mgr mgr/telemetry/channel_crash true

# Disable device health sharing
ceph config set mgr mgr/telemetry/channel_device false

# Disable the ident channel (organization info)
ceph config set mgr mgr/telemetry/channel_ident false

# Disable performance metrics sharing
ceph config set mgr mgr/telemetry/channel_perf false
```

Check channel settings:

```bash
ceph config get mgr mgr/telemetry/channel_basic
ceph config get mgr mgr/telemetry/channel_crash
```

## Telemetry Module Status

Since Ceph Octopus (15.x), telemetry is an always-on manager module and cannot be disabled with `ceph mgr module disable telemetry`. To stop all telemetry data sharing without disabling the module, use:

```bash
ceph telemetry off
```

## Verifying No Data Is Sent

After opting out, verify no scheduled transmissions exist:

```bash
ceph telemetry status
ceph mgr module ls | grep telemetry
```

## Air-Gapped Environment Configuration

In air-gapped environments, keep the module enabled for local crash collection but ensure no outbound connections:

```bash
ceph mgr module enable telemetry
ceph telemetry off
ceph config set mgr mgr/telemetry/channel_device false
```

This allows local crash log collection via `ceph crash ls` without any data leaving your environment.

## Rook Toolbox Management

Manage opt-in status from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph telemetry on --license sharing-1-0

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph telemetry off
```

## Summary

Ceph telemetry opt-in is controlled by the `ceph telemetry on/off` command paired with a license acknowledgment. Individual channels can be enabled or disabled for granular control. In air-gapped deployments, keeping the module enabled while opting out lets you benefit from local crash collection without transmitting any data externally.
