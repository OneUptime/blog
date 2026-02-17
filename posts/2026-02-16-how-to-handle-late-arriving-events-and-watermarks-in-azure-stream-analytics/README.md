# How to Handle Late-Arriving Events and Watermarks in Azure Stream Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Stream Analytics, Late Events, Watermarks, Event Processing, Real-Time Analytics, Azure Cloud, Stream Processing

Description: Learn how to configure watermarks and handle late-arriving events in Azure Stream Analytics to maintain data accuracy in real-time pipelines.

---

If you have worked with real-time data pipelines long enough, you know that events do not always arrive in order. Network delays, device connectivity issues, and distributed system quirks mean that some events show up late. Azure Stream Analytics has built-in mechanisms to deal with this reality, and understanding how to configure them properly is the difference between a pipeline that produces reliable results and one that silently drops important data.

In this post, we will walk through how Azure Stream Analytics handles late-arriving events using watermarks, tolerance windows, and output policies. We will also look at practical configuration examples and discuss trade-offs you need to consider for your specific workload.

## Why Events Arrive Late

Before diving into configuration, it helps to understand why late arrivals happen in the first place. In a distributed streaming system, data flows from multiple sources - IoT devices, web applications, microservices, mobile apps - through intermediaries like Azure Event Hubs or IoT Hub before reaching your Stream Analytics job. Each hop in this chain introduces potential latency. A sensor might buffer readings locally before sending them in a batch. A mobile device might go offline for a few minutes and then flush a queue of events when connectivity returns. Even within a data center, network partitions and retries can delay delivery.

The key insight is that the event timestamp (when something actually happened) and the arrival timestamp (when your Stream Analytics job receives it) are often different. Azure Stream Analytics lets you use either as the basis for windowed aggregations, but event time is usually what matters for correctness.

## Understanding Watermarks in Stream Analytics

A watermark in Azure Stream Analytics represents a point in event time up to which the system believes it has received all events. It is essentially the system saying, "I am confident that no events with a timestamp earlier than this watermark will arrive." The watermark advances as new events come in, and it drives when windowed computations produce their results.

The watermark is computed as the minimum of the latest event time across all input partitions, minus the late arrival tolerance window. This means the slowest partition determines your overall watermark progress. If one partition goes quiet while others keep producing events, the watermark will stall until that silent partition either produces an event or the late arrival tolerance window kicks in.

## Configuring Event Ordering Policies

Azure Stream Analytics provides two key tolerance windows that control how late events are handled.

### Late Arrival Tolerance Window

This window defines how long the system waits for late events before giving up. The default is 5 seconds, but you can set it anywhere from 0 seconds up to 20 days. Here is how to configure it in the Azure portal:

1. Open your Stream Analytics job in the Azure portal
2. Navigate to "Event ordering" under the Configure section
3. Set the "Out-of-order tolerance window" and "Late arrival tolerance window"

You can also set this through an ARM template or Azure CLI. Here is the Azure CLI approach for setting a 10-minute late arrival tolerance:

```bash
# Update the Stream Analytics job with a 10-minute late arrival tolerance
# The value is specified in the ISO 8601 duration format
az stream-analytics job update \
  --resource-group my-resource-group \
  --name my-stream-job \
  --late-arrival-max-delay-time "00:10:00"
```

### Out-of-Order Tolerance Window

This window controls how far out of order events can be and still be processed normally. Events that arrive within this window (relative to other events) are automatically reordered. Events that arrive outside this window are either dropped or adjusted, depending on your chosen policy.

```bash
# Set a 30-second out-of-order tolerance window
az stream-analytics job update \
  --resource-group my-resource-group \
  --name my-stream-job \
  --out-of-order-max-delay-time "00:00:30"
```

## Drop vs. Adjust - Choosing an Output Policy

When an event arrives outside the tolerance window, Azure Stream Analytics can do one of two things:

**Drop**: The event is silently discarded. This is appropriate when late data is genuinely stale and including it would be worse than missing it. For example, if you are computing real-time fraud scores and a transaction event arrives 30 minutes late, it may no longer be actionable.

**Adjust**: The event timestamp is modified to fall within the tolerance window boundary. The event is still processed, but with an adjusted timestamp. This is better when you want to capture all data even if timing precision suffers slightly. For instance, in IoT telemetry aggregation where you want total counts to be accurate even if some readings get bucketed into slightly wrong time windows.

You configure this in the event ordering settings:

```bash
# Set the policy to adjust late events instead of dropping them
az stream-analytics job update \
  --resource-group my-resource-group \
  --name my-stream-job \
  --out-of-order-policy "Adjust"
```

## Practical Example - Windowed Aggregation with Late Events

Let us walk through a concrete scenario. Suppose you are aggregating IoT temperature readings into 5-minute tumbling windows. Your Stream Analytics query looks like this:

```sql
-- Aggregate temperature readings into 5-minute windows
-- Use the event timestamp (DeviceTimestamp) for windowing
SELECT
    DeviceId,
    System.Timestamp() AS WindowEnd,
    AVG(Temperature) AS AvgTemperature,
    COUNT(*) AS ReadingCount
INTO [output-table]
FROM [iot-input]
TIMESTAMP BY DeviceTimestamp  -- Use the device-generated timestamp
GROUP BY
    DeviceId,
    TumblingWindow(minute, 5)
```

With a late arrival tolerance of 10 minutes, here is what happens:

- Events arriving within 10 minutes of their event timestamp are processed normally
- The window for 12:00-12:05 will not finalize until the watermark passes 12:05
- If a device goes offline for 8 minutes and then sends a burst of readings, those readings still get included in the correct windows
- If a reading for 12:02 arrives at 12:20 (18 minutes late), it exceeds the 10-minute tolerance and gets either dropped or adjusted

## Monitoring Late Events

You can monitor how many late events your job encounters using Azure metrics. The key metrics to watch are:

- **Late Input Events**: Count of events arriving outside the late arrival tolerance window
- **Out-of-Order Events**: Count of events received out of order (within the tolerance window, so they were reordered successfully)
- **Watermark Delay**: How far behind real time your watermark is

Set up alerts on these metrics so you know when your tolerance windows need adjustment:

```bash
# Create an alert rule for late input events exceeding a threshold
az monitor metrics alert create \
  --name "high-late-events" \
  --resource-group my-resource-group \
  --scopes "/subscriptions/{sub-id}/resourceGroups/my-resource-group/providers/Microsoft.StreamAnalytics/streamingjobs/my-stream-job" \
  --condition "total LateInputEvents > 100" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group my-action-group
```

## Trade-offs to Consider

Setting a larger late arrival tolerance means you capture more late data, but there are costs:

1. **Increased output latency**: Results are delayed because the system waits longer before finalizing windows. A 10-minute tolerance means your aggregations are at least 10 minutes behind real time.

2. **Higher resource consumption**: The system needs to buffer more events in memory while waiting for the tolerance window to pass.

3. **Watermark stalls**: If any input partition stops producing events, the watermark stalls until the late arrival tolerance expires for that partition. This can cascade into delayed results across all partitions.

A good approach is to start with a small tolerance (a few seconds to a few minutes), monitor the late event metrics, and increase only if you see a meaningful number of dropped events that matter to your use case.

## Handling Partitioned Inputs

When your input has multiple partitions (as is common with Event Hubs), the watermark tracks each partition independently. The overall job watermark is the minimum across all partitions. This has a practical implication: if you have a partition that receives very little traffic, it can hold back your entire watermark.

One strategy to mitigate this is to ensure even distribution of events across partitions. Another is to use the "Last Event Time" arrival policy, which adjusts the watermark when a partition has been idle for a period.

## Summary

Late-arriving events are a fact of life in streaming systems. Azure Stream Analytics gives you straightforward knobs to handle them - the late arrival tolerance window, the out-of-order tolerance window, and the drop-or-adjust policy. The right settings depend on your specific requirements around data completeness versus output latency. Start conservative, monitor the metrics, and adjust based on what you observe in production. The watermark mechanism ensures that your windowed computations produce correct results as long as events arrive within the configured tolerance, and monitoring tools help you verify that your configuration matches reality.
