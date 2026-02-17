# How to Troubleshoot Azure Data Factory Pipeline Failures and Data Flow Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Data Factory, ETL, Pipeline Troubleshooting, Data Flow, Data Integration, Cloud Data

Description: Comprehensive troubleshooting guide for Azure Data Factory pipeline failures, data flow errors, and common integration runtime issues.

---

Azure Data Factory (ADF) is the backbone of many data integration workflows on Azure. When pipelines fail, the ripple effect is immediate: reports go stale, downstream systems get outdated data, and data engineers start getting frantic messages from business stakeholders. The challenge with ADF troubleshooting is that failures can originate from many different layers, from the pipeline orchestration level down to individual activity execution and data flow transformations.

Having spent years building and debugging ADF pipelines, I have developed a systematic approach to troubleshooting that starts broad and narrows down. Here is how I work through common failure scenarios.

## Understanding ADF Error Anatomy

When an ADF pipeline fails, the first thing to check is the Monitor hub in the ADF Studio. Navigate to Pipeline runs, find the failed run, and click into it. Each activity in the pipeline shows its status, and you can click on a failed activity to see the error details.

ADF errors typically include an error code, a message, and sometimes a failure type. The error code is your best friend for troubleshooting because it points you to a specific category of problem.

Common error code prefixes:
- **2001-2099**: Source-related errors (cannot read from source)
- **2101-2199**: Sink-related errors (cannot write to destination)
- **2200-2299**: Data flow errors
- **9001-9099**: Integration runtime errors
- **4001-4099**: Timeout errors

## Pipeline-Level Failures

Pipeline-level failures are usually orchestration issues rather than data issues. The most common ones are:

**Activity dependency failures.** If an upstream activity fails, downstream activities with "On Success" dependencies will be skipped. Check the first activity in the failure chain, not the last one.

**Parameter and variable issues.** Pipelines fail if required parameters are missing or if dynamic expressions evaluate to null. Check parameter values passed by triggers or parent pipelines.

```json
// Example: A common pattern that causes null reference errors
// If the trigger does not include scheduledTime, this expression fails
{
  "type": "Expression",
  "value": "@formatDateTime(trigger().scheduledTime, 'yyyy-MM-dd')"
}

// Fix: Use coalesce to provide a fallback value
{
  "type": "Expression",
  "value": "@formatDateTime(coalesce(trigger().scheduledTime, utcNow()), 'yyyy-MM-dd')"
}
```

**Timeout errors.** Pipeline activities have a default timeout of 7 days, but individual activities like Copy or Data Flow have their own timeout settings. If a long-running query or data movement exceeds the timeout, the activity fails with error code 4002.

## Copy Activity Failures

Copy activity is the workhorse of ADF, and it has the most diverse set of failure modes.

**Connection failures.** The most common issue. Check that your linked service credentials are current, the source or sink is accessible from the integration runtime, and network connectivity is in place. If you are using a Self-Hosted Integration Runtime (SHIR), verify it is online and healthy.

```bash
# Check Self-Hosted Integration Runtime status
# A degraded or offline SHIR is a common cause of connection failures
az datafactory integration-runtime show \
  --resource-group myResourceGroup \
  --factory-name myDataFactory \
  --name mySelfHostedIR \
  --query "{name:name, state:properties.state, version:properties.version}" \
  -o table
```

**Schema mismatch errors.** When the source schema changes but the dataset definition has not been updated, you get column mapping errors. This is especially common with database sources where someone adds or removes columns.

**File format errors.** CSV files with inconsistent quoting, unexpected delimiters, or corrupt rows cause parse failures. Use the fault tolerance settings in the Copy activity to skip bad rows instead of failing the entire activity.

To enable fault tolerance, configure the copy activity settings:

```json
// Copy activity settings that handle bad rows gracefully
{
  "typeProperties": {
    "source": { "type": "DelimitedTextSource" },
    "sink": { "type": "AzureSqlSink" },
    "enableSkipIncompatibleRow": true,
    "redirectIncompatibleRowSettings": {
      "linkedServiceName": {
        "referenceName": "ErrorLogStorage",
        "type": "LinkedServiceReference"
      },
      "path": "errors/incompatible-rows"
    }
  }
}
```

## Data Flow Errors

Mapping Data Flows add a layer of complexity because they execute on Spark clusters. Errors can come from the Spark execution, the transformation logic, or the data itself.

**Cluster startup failures.** Data flows need a Spark cluster to execute. If the cluster fails to start (often due to Azure capacity constraints or subnet exhaustion for VNet-injected runtimes), the entire data flow fails before processing a single row.

If you see error code 2200 with a message about cluster creation, try:
- Running the data flow again (transient capacity issues)
- Using a different Azure Integration Runtime region
- Reducing the core count in the Data Flow runtime configuration

**Type casting errors.** Data flows are strongly typed, and implicit conversions that work in SQL often fail in Spark. If you are reading a CSV and trying to aggregate a column as a number, but some rows contain non-numeric values, the data flow fails.

Use the `isNull()` and `iif()` functions to handle dirty data in your transformations.

```
// Data flow expression to safely cast a string column to integer
// Returns 0 for null or non-numeric values instead of failing
iif(isNull(column1) || !isInteger(column1), 0, toInteger(column1))
```

**Out of memory errors.** Large data flows with many joins, lookups, or aggregations can run out of memory. Symptoms include error messages mentioning "java.lang.OutOfMemoryError" or "GC overhead limit exceeded."

To fix memory issues:
- Increase the core count in the Data Flow activity settings
- Add partition hints on large transformations to improve parallelism
- Break up complex data flows into smaller ones that process data in stages
- Use broadcast joins only when one side of the join is small

## Integration Runtime Issues

The integration runtime is the compute infrastructure that executes ADF activities. Problems here affect everything.

**Self-Hosted IR offline.** If the machine hosting the SHIR goes down, loses network, or has the IR service stopped, all activities that depend on it fail. Set up SHIR high availability by installing the runtime on multiple machines in the same logical group.

**Auto-resolve IR capacity.** The Azure Integration Runtime in auto-resolve mode picks the closest region, but during capacity crunches, it might fail to allocate resources. Create a dedicated Azure IR in a specific region as a fallback.

**VNet-injected IR subnet exhaustion.** Managed VNet integration runtimes consume IP addresses from the delegated subnet. If the subnet is too small and you run many concurrent data flows, new executions fail because there are no available IPs.

## Retry and Error Handling Patterns

Build resilience into your pipelines instead of relying on everything working perfectly every time.

Use the retry policy on activities that interact with external systems. A retry count of 3 with a 30-second interval handles most transient failures.

Use the "On Failure" dependency to create error-handling branches. When an activity fails, route to a Logic App or Function that sends an alert and logs the error details.

```json
// Pipeline pattern: activity with retry and error handling branch
{
  "name": "CopyFromSource",
  "type": "Copy",
  "policy": {
    "retry": 3,
    "retryIntervalInSeconds": 30,
    "timeout": "01:00:00"
  },
  "dependsOn": []
}
```

For pipelines that process multiple files or partitions, use ForEach with the "Continue on error" option so that one failed file does not stop processing of all others.

## Monitoring and Proactive Alerting

Do not wait for stakeholders to tell you a pipeline failed. Set up diagnostic settings on your Data Factory to send logs to Log Analytics.

```bash
# Enable diagnostic logging for Data Factory
az monitor diagnostic-settings create \
  --name "adf-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.DataFactory/factories/myADF" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myLAW" \
  --logs '[{"category":"PipelineRuns","enabled":true},{"category":"ActivityRuns","enabled":true},{"category":"TriggerRuns","enabled":true}]'
```

Create alerts on pipeline failure counts and long-running pipelines. A pipeline that usually takes 15 minutes but has been running for 2 hours is worth investigating even before it times out.

ADF troubleshooting comes down to methodically working through the layers: pipeline orchestration, activity execution, data transformation, and infrastructure. Start at the top, read the error messages carefully, and work your way down until you find the root cause.
