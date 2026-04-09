# How to Fix TELEMETRY_CHANGED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Health Check

Description: Learn how to resolve the TELEMETRY_CHANGED health warning in Ceph by reviewing and accepting updated telemetry settings.

---

## What Is TELEMETRY_CHANGED

The `TELEMETRY_CHANGED` health check appears in Ceph when the telemetry module has been updated and new data collection fields have been introduced since the last time the operator accepted the telemetry configuration. Ceph requires explicit re-consent before it sends any updated telemetry reports to the upstream team.

You can observe this warning using the health command:

```bash
ceph health detail
```

Sample output:

```text
HEALTH_WARN Telemetry requires re-opt-in
[WRN] TELEMETRY_CHANGED: Telemetry requires re-opt-in
    telemetry module includes new collections; please re-opt-in to new collections with `ceph telemetry on`
```

## Why This Happens

When Ceph undergoes a major version upgrade or the telemetry module introduces new collections, it requires renewed consent. This is a privacy-protecting mechanism - Ceph will not send data about new collections without explicit approval. Until you review and accept the changes, the cluster remains in `HEALTH_WARN`.

## How to Inspect the Changes

Before accepting, you can preview exactly what changed. Use the Rook toolbox pod to access the Ceph CLI:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Then preview the telemetry diff:

```bash
ceph telemetry diff
```

This shows telemetry collections available in the module that you have not yet opted into.

## Fixing the Warning - Option 1: Accept Telemetry

If you are comfortable sending telemetry data to the Ceph upstream team, re-accept with:

```bash
ceph telemetry on --license sharing-1-0
```

This clears the `TELEMETRY_CHANGED` warning and resumes telemetry reporting.

## Fixing the Warning - Option 2: Disable Telemetry

If your organization does not permit telemetry reporting, disable the module entirely:

```bash
ceph telemetry off
```

This also clears the warning and ensures no data is sent externally.

## Verifying the Fix

After accepting or disabling, confirm the warning is gone:

```bash
ceph health
```

Expected output:

```text
HEALTH_OK
```

You can also inspect the telemetry module status:

```bash
ceph telemetry status
```

Sample output:

```json
{
  "enabled": true,
  "last_opt_revision": 3,
  "last_upload": "2026-03-30T12:00:00",
  "channel_basic": true,
  "channel_crash": true,
  "channel_device": true,
  "channel_perf": false
}
```

## Using Rook CephCluster Configuration

If you manage Ceph via Rook, you can pre-configure telemetry module settings through the Ceph dashboard or toolbox. Rook does not expose a direct telemetry CRD field, so you manage this at the Ceph layer. Keeping your Ceph version current reduces the frequency of telemetry consent resets.

## Summary

The `TELEMETRY_CHANGED` warning appears when Ceph updates its telemetry reporting fields and requires renewed operator consent. Resolve it by running `ceph telemetry diff` to review changes, then either accept with `ceph telemetry on --license sharing-1-0` or disable with `ceph telemetry off`. Always verify with `ceph health` afterward to confirm `HEALTH_OK`.
