# Prevent Azure MySQL Storage Exhaustion Before Writes Stop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Monitoring, Reliability

Description: Combine Azure MySQL storage autogrow, growth-based capacity alerts, and IOPS checks to detect exhaustion early and recover without risky cleanup.

A database can keep answering read queries while rejecting the writes your application needs. When Azure Database for MySQL Flexible Server approaches its storage limit, read-only protection can produce exactly that situation. An HTTP health check that only reads a row may stay green while orders or background jobs fail.

Preventing this requires more than enabling autogrow. You need enough free space to absorb a burst, enough time for someone to respond, and evidence that disk performance is keeping up. This guide separates those concerns and includes a locally tested Python 3.11 capacity calculation. No Azure configuration was changed while preparing it.

## Know the protection boundary

Microsoft documents read-only protection below 5% free space for servers provisioned at 100 GiB or less, and below 5 GiB free for larger servers. Increasing provisioned storage is the documented recovery action. Storage can grow but cannot be reduced in place. See [Azure MySQL storage behavior](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage).

Those thresholds are emergency boundaries, not sensible alert targets. If a bulk import consumes several GiB per minute, discovering the problem with 6 GiB remaining gives an operator very little room to act.

Also confirm which server rejected the write. An application accidentally connected to a read replica has a different problem. Capture the endpoint, error, time, and affected operation before assuming every read-only error means a full disk.

## Verify autogrow on the actual server

Open **Compute + storage** and inspect the server's storage settings. Record the provisioned capacity and whether autogrow is enabled. Do not infer the setting from a deployment template that may no longer match the resource.

Azure enables autogrow by default on new servers; documented maximum capacities still apply. Autogrow is mandatory for high-availability and accelerated-log configurations. Review the current [autogrow rules](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage) before relying on a specific growth increment.

Treat autogrow as protection within a capacity plan. Record an owner for approaching the server's supported maximum, and review the resulting capacity and cost after growth. A successful increase can lower the percentage-used graph without resolving the job that caused the unexpected growth.

Before a major import or schema change, estimate its temporary space requirement and arrange headroom in advance. Waiting for automatic growth during a known large operation makes your success depend on reacting at the busiest moment.

## Watch bytes and growth, not only percentages

Use **Storage Used** (`storage_used`), **Storage Limit** (`storage_limit`), and **Storage Percent** (`storage_percent`) in Azure Monitor. The byte-based metrics let you calculate remaining capacity. Use the same server and aligned timestamps; mixing today's usage with yesterday's limit after autogrow produces a false result.

Storage breakdown metrics distinguish database files, binlogs, and other consumers. Binlogs are the binary logs used to record changes for replication. Compare the components when usage rises unexpectedly rather than assuming all growth is new application rows. The names, units, and breakdown are in the [monitoring reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference).

Consider two servers at 90% usage. One has days of normal growth left; the other has minutes during an import. The same percentage can justify very different responses.

## Calculate an operating reserve

Choose a reserve above the protection boundary and add the space consumed during your response time. Include detection, notification, investigation, approval if required, and the actual capacity operation. Use an observed busy-period growth rate rather than an optimistic daily average.

This example uses illustrative values, all in GiB. A GiB is 1,073,741,824 bytes. Replace the values with aligned measurements and your own response budget; the script reads no credentials and makes no network requests:

```python
capacity_gib = 1024.0
used_gib = 930.0
growth_gib_per_hour = 8.0
reserve_gib = 30.0
response_hours = 6.0

if not (0 <= used_gib <= capacity_gib):
    raise ValueError("Usage must be within provisioned capacity")
if growth_gib_per_hour <= 0 or reserve_gib < 0 or response_hours <= 0:
    raise ValueError("Use positive growth and response time, and a valid reserve")

free_gib = capacity_gib - used_gib
hours_to_reserve = max(0.0, free_gib - reserve_gib) / growth_gib_per_hour
alert_free_gib = reserve_gib + growth_gib_per_hour * response_hours
if alert_free_gib >= capacity_gib:
    raise ValueError("The proposed reserve and response budget exceed capacity")
alert_used_gib = capacity_gib - alert_free_gib

print(f"Free space: {free_gib:.1f} GiB")
print(f"Estimated hours to reserve: {hours_to_reserve:.1f}")
print(f"Alert before used space reaches: {alert_used_gib:.1f} GiB")
```

The output is 94 GiB free, eight hours to the reserve, and a used-space alert boundary of 946 GiB. At that boundary, 78 GiB remains: 30 GiB of reserve plus six hours of growth at 8 GiB per hour. Set the actual warning earlier if measurement delays or burst uncertainty require more margin.

This is a planning estimate, not a prediction guarantee. A nightly job, temporary files, or a sudden retention problem can invalidate the assumed rate. Recalculate after capacity changes and compare multiple observation windows. Flat recent growth does not mean an upcoming import needs no space.

## Create alerts that lead to an action

In the server's **Monitoring > Alerts**, create a metric alert, select the storage signal, choose the threshold and evaluation settings, and attach the intended action group. Microsoft's [metric-alert setup guide](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-alert-on-metric) describes the workflow.

An action group defines the recipients or automation receiving the alert. Use a warning for planned capacity work and a more urgent condition when the remaining response time becomes short. Start with settings justified by the calculation and test them against recent busy periods.

For a fixed-capacity server, you can translate the example's GiB threshold into bytes for Storage Used. Keep that threshold synchronized with capacity changes. A fixed absolute used-space rule will otherwise keep firing after a successful increase, or stop describing your intended reserve.

Write the response into the alert description: inspect growth components, pause a known nonessential producer if appropriate, and arrange supported capacity growth. Include the server's identity and runbook link. Test notification delivery separately from checking that the threshold expression matches the intended metric.

## Keep disk performance separate

IOPS means input/output operations per second. It describes storage work, not free capacity. Azure offers provisioned and autoscale IOPS; autoscale remains bounded by the maximum supported for the compute size. See the [IOPS documentation](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-storage-iops).

A server can have abundant free space and still be slow because storage work is saturated. Conversely, a quiet server can be almost full. Compare Storage IO Percent with query latency, CPU, and job timing before deciding whether a performance change is needed.

| Observation | First response |
| --- | --- |
| Free bytes falling rapidly | Identify the producer and increase capacity headroom |
| Capacity stable, I/O pressure high | Investigate expensive queries and storage performance |
| Usage percentage falls after autogrow | Confirm new capacity and review continuing byte growth |
| Writes fail but reads work | Check endpoint, errors, storage state, and application behavior |

## Recover without making exhaustion worse

If storage protection has already activated, reduce avoidable incoming work and follow the supported capacity-increase procedure. Verify the resulting capacity, then use a controlled application write to confirm recovery before resuming normal producers.

Do not assume a large `DELETE` immediately returns disk capacity. Space reuse and physical reclamation differ. MySQL's [OPTIMIZE TABLE documentation](https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html) explains reclamation for applicable InnoDB tables, but a rebuild is not an emergency free-space shortcut. Plan cleanup separately with enough working space and a recovery path.

Finally, inspect failed jobs and uncertain writes. Retrying every request without checking its business outcome can create duplicates. Keep the incident open until capacity is stable, a representative write succeeds, and queued work resumes without another surge toward the limit.
