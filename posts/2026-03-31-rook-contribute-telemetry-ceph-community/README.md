# How to Contribute Telemetry Data to the Ceph Community

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Telemetry, Community, Open Source, Storage

Description: Learn how contributing anonymized telemetry data to the Ceph community improves the project, what benefits you get back, and how to configure and verify your contribution.

---

## Why Contribute Telemetry Data?

Ceph telemetry contributions help the community in several concrete ways:

- Identify the most common hardware configurations to improve defaults
- Track which Ceph versions are in active use, prioritizing bug backports
- Detect crash patterns across deployments, surfacing systemic bugs
- Guide feature development toward real-world use cases

As a contributor, you benefit from:
- Faster fixes for bugs affecting your configuration
- More relevant release priorities
- Access to aggregated community data at https://telemetry.ceph.com/

## Opting In

Review the data before contributing:

```bash
ceph telemetry show
ceph telemetry show basic
ceph telemetry show crash
```

Accept the sharing license and opt in:

```bash
ceph telemetry on --license sharing-1-0
```

Confirm opt-in status:

```bash
ceph telemetry status
```

## Adding Optional Identification

While not required, adding organization information helps the Ceph team understand the deployment landscape:

```bash
ceph config set mgr mgr/telemetry/channel_ident true
ceph config set mgr mgr/telemetry/organization "Your Organization Name"
ceph config set mgr mgr/telemetry/contact "admin@yourorg.com"
ceph config set mgr mgr/telemetry/description "Production cluster - region us-east"
```

This information is kept confidential and is not published publicly.

## Enabling All Telemetry Channels

To maximize your contribution to the community:

```bash
ceph config set mgr mgr/telemetry/channel_basic true
ceph config set mgr mgr/telemetry/channel_crash true
ceph config set mgr mgr/telemetry/channel_device true
ceph config set mgr mgr/telemetry/channel_ident true
```

Verify all channels are active:

```bash
ceph config dump | grep mgr/telemetry
```

## Sending an Immediate Report

Trigger a telemetry report manually (useful to verify transmission):

```bash
ceph telemetry send
```

If the send is successful, you will see a confirmation message such as `Ceph report sent to <url>`. Check for errors:

```bash
ceph log last 20 | grep telemetry
```

## Viewing Community Statistics

After contributing, explore aggregate data from the broader Ceph community:

```bash
# Telemetry dashboard available at:
# https://telemetry.ceph.com/
```

This public dashboard shows anonymized aggregate data including version distribution, OSD counts, and hardware types across all contributing clusters.

## Rook Configuration for Telemetry Contribution

Set up telemetry contribution via the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph mgr module enable telemetry
  ceph telemetry on --license sharing-1-0
  ceph config set mgr mgr/telemetry/channel_basic true
  ceph config set mgr mgr/telemetry/channel_crash true
  ceph config set mgr mgr/telemetry/channel_device true
  ceph telemetry status
"
```

## Summary

Contributing telemetry data to the Ceph community is a straightforward opt-in process that helps improve the software for everyone. The data shared is anonymized and covers only cluster configuration and crash reports. Optional organization identification can be added to help the Ceph team understand deployment diversity. In Rook clusters, the toolbox pod provides all the commands needed to enable and configure telemetry contribution.
