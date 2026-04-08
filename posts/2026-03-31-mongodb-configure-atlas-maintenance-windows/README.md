# How to Configure Atlas Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Maintenance, Cloud, Database

Description: Learn how to configure MongoDB Atlas maintenance windows to schedule automatic updates at times that minimize impact on your application workloads.

---

## What Are Atlas Maintenance Windows

MongoDB Atlas periodically applies patches, security updates, and minor version upgrades to your clusters. By default, Atlas schedules these maintenance events automatically. Configuring a maintenance window lets you control when these operations occur, reducing risk to production traffic.

Maintenance windows apply to patch releases and minor upgrades. Major version upgrades must be triggered manually.

## How to Set a Maintenance Window via the Atlas UI

1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com) and navigate to your project.
2. Click **Project Settings** in the left sidebar.
3. Under **Maintenance Window**, click **Edit**.
4. Choose a **day of week** and a **start time** (UTC).
5. Click **Save**.

Atlas will now schedule routine maintenance during the configured window. If no maintenance is pending, no action occurs during that window.

## How to Set a Maintenance Window via the Atlas API

You can automate maintenance window configuration using the Atlas Administration API.

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{GROUP_ID}/maintenanceWindow" \
  --data '{
    "dayOfWeek": 7,
    "hourOfDay": 2,
    "startASAP": false
  }'
```

`dayOfWeek` uses values 1 (Sunday) through 7 (Saturday). `hourOfDay` is expressed in UTC (0-23).

## How to Defer a Pending Maintenance Event

If a maintenance event is already scheduled but the timing is inconvenient, you can defer it up to two weeks.

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{GROUP_ID}/maintenanceWindow/defer"
```

This pushes the maintenance event out by one week. You can defer a maximum of two times.

## How to Trigger Maintenance Immediately

If you want to apply a pending update right away outside your window, you can trigger it on demand.

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{GROUP_ID}/maintenanceWindow" \
  --data '{
    "startASAP": true
  }'
```

You can also click **Apply Now** in the Atlas UI when a maintenance event is pending.

## Best Practices for Maintenance Windows

Choose a window during your lowest-traffic period. For global applications, analyze traffic patterns by region and pick the time with the least impact across all regions.

- Set the window at least 24 hours in advance so Atlas can prepare.
- Atlas maintenance windows do not have a configurable duration. Atlas performs rolling restarts across replica set members automatically once the window starts.
- Monitor your cluster during and after maintenance using Atlas metrics or a tool like OneUptime to verify normal operation resumes.
- Set up Atlas alerts for maintenance events so your team receives advance notice.

## Monitoring Maintenance Events

You can check the current maintenance window configuration at any time:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{GROUP_ID}/maintenanceWindow"
```

Example response:

```json
{
  "dayOfWeek": 7,
  "hourOfDay": 2,
  "startASAP": false,
  "numberOfDeferrals": 0
}
```

Use this in a monitoring script to alert your team if the maintenance window has drifted from your policy.

## Summary

MongoDB Atlas maintenance windows let you schedule automated patch and upgrade operations for off-peak hours. You can configure the window via the Atlas UI or the Administration API, defer pending events up to two weeks, or trigger immediate maintenance when needed. Pairing maintenance window alerts with external monitoring ensures your team stays informed before and after each event.
