# Check Azure MySQL Parameter Restart Requirements Before Changing Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Reliability, Troubleshooting

Description: Distinguish saved, running, and session-level MySQL settings, inspect restart requirements, and coordinate an Azure parameter change with application recovery.

A parameter update can succeed in Azure while the database continues using the previous value. That is expected for a static parameter waiting for a restart. A different confusion happens with session settings: the server's global default changes, but an application connection opened earlier still has its old session value.

Before restarting anything, establish which of those situations you have. The goal is to verify the intended behavior with the smallest justified disruption, while avoiding an unexpected restart that also activates someone else's pending changes.

## Separate three questions

A **static parameter** requires a server restart to take effect. A **dynamic parameter** can change while the server runs. A **session variable** is a setting associated with an individual database connection; changing its global default does not necessarily change existing sessions. Azure's parameter metadata and the MySQL variable documentation answer different parts of this picture. [Azure server parameters](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters), [MySQL variable scope](https://dev.mysql.com/doc/refman/8.0/en/using-system-variables.html)

For every proposed change, ask:

| Question | Evidence to collect |
|---|---|
| Can Azure change this parameter on this server? | Modifiability, allowed values, engine version, and service restrictions |
| Does the saved value need a restart? | Dynamic/static classification and pending-restart status |
| Will the application see it immediately? | Running global value, session scope, and connection-pool behavior |

Do not build a permanent spreadsheet of “always dynamic” names and trust it across versions. Query the actual server and review the parameter's current documentation. Some settings also have restrictions beyond a simple restart requirement.

## Inspect one parameter before editing it

These examples use command syntax checked against **Azure CLI 2.80.0**. They require an authenticated Azure identity with permission to read the server configuration. Replace the subscription, resource group, and server placeholders. `max_connections` is an inspection example, not a recommendation to increase it.

```bash
SUBSCRIPTION_ID='REPLACE_WITH_SUBSCRIPTION_ID'
RESOURCE_GROUP='REPLACE_WITH_RESOURCE_GROUP'
SERVER_NAME='REPLACE_WITH_SERVER_NAME'
PARAMETER_NAME='max_connections'

az mysql flexible-server parameter show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$SERVER_NAME" \
  --name "$PARAMETER_NAME" \
  --output json
```

Retain the full response, including the value and its source, allowed range, description, and any restart indicators. The CLI's `show` command reads an existing configuration; it does not update it. [Parameter CLI reference](https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/parameter?view=azure-cli-latest), [Pinned command registration](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli/azure/cli/command_modules/mysql/commands.py)

The Azure configuration API documents `isReadOnly`, `isDynamicConfig`, and `isConfigPendingRestart` as string-valued flags such as `"True"` and `"False"`. They are not interchangeable: a static parameter may have no pending change, and a writable parameter may still require a restart. Missing metadata means you need more evidence, not that a restart is unnecessary. [Configuration API 2024-12-30](https://learn.microsoft.com/en-us/rest/api/mysql/configurations/get?view=rest-mysql-2024-12-30)

If output differs from the expected shape, keep the raw response and compare the CLI version, server, and portal view. Avoid automation that silently interprets absent properties as `False`.

## Look for other pending changes

Before planning a restart, inspect the server's parameter inventory. This command uses the variables from the previous block and produces compact JSON without hiding missing fields:

```bash
az mysql flexible-server parameter list \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$SERVER_NAME" \
  --query "[].{name:name,value:value,source:source,dynamic:isDynamicConfig,pending:isConfigPendingRestart,readOnly:isReadOnly}" \
  --output json
```

Review every pending entry, not just the parameter in your ticket. For each, identify its owner, old value, intended value, and acceptance test. A restart is server-wide; it is not a request to activate only your selected parameter. If the inventory is unexpectedly empty or incomplete, resolve that before the maintenance window.

Record a small change set in your deployment system. Do not use **Reset all to default** as a rollback strategy: the desired previous configuration may contain many intentional overrides. Azure's portal distinguishes saving a static change from choosing **Restart now** or **Restart later**. Choosing later creates a pending operational task that needs an owner. [Portal parameter workflow](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-configure-server-parameters-portal)

## Compare saved values with running behavior

Use a database connection with normal certificate verification to inspect engine variables. The following MySQL 8.0 read-only query illustrates a global-only limit and a setting with both global and session scope:

```sql
SELECT @@GLOBAL.max_connections AS running_connection_limit,
       @@GLOBAL.long_query_time AS default_slow_query_seconds,
       @@SESSION.long_query_time AS this_connection_slow_query_seconds;
```

The two `long_query_time` values can differ. A fresh connection normally inherits the current global default, while an existing connection can retain its prior session setting. An application or connection initializer can also set its own value, so inspect through the relevant application path when diagnosing a mismatch. [MySQL system-variable behavior](https://dev.mysql.com/doc/refman/8.0/en/using-system-variables.html)

This query does not prove every parameter has applied. For your chosen setting, use its documented runtime variable or a concrete behavior check. Some Azure service parameters do not map directly to a MySQL `@@` variable. Do not invent a variable name by copying an Azure parameter into SQL.

If a dynamic global setting applied but old application sessions differ, plan a controlled connection-pool refresh where appropriate. Restarting the whole server solely to refresh those sessions can introduce unnecessary disruption. Also check pool initialization: a refreshed connection can immediately reapply the old application override.

## Coordinate the restart as a maintenance action

For a required restart, establish the maintenance owner, affected applications, expected interruption, rollback values, and recovery criteria. Rehearse against a representative test server. Arrange application retry behavior and pause or drain normal writers and scheduled jobs before the operation; do not assume every interrupted transaction is safe to replay.

```mermaid
flowchart LR
    I[Inspect all pending changes] --> A[Approve values and recovery checks]
    A --> D[Drain normal traffic]
    D --> R[Restart if required]
    R --> C[Check values and controlled traffic]
    C --> N[Resume normal writers gradually]
```

Azure documents that a restart causes an outage, can be blocked while another operation is running, and takes time according to database recovery work. There is no universal duration to promise. [Restart behavior](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-restart-server-portal)

Only in the approved window, after draining traffic, the standard restart command is:

```bash
az mysql flexible-server restart \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SERVER_NAME"
```

This is a mutating command and can begin the interruption immediately. It is not a dry run. The pinned CLI uses a standard restart when `--failover` is absent; forced failover is a separate option with different operational intent. Do not add it as a generic way to make a parameter apply. [CLI restart implementation](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli/azure/cli/command_modules/mysql/custom.py)

If the operation fails, inspect its status and error before retrying. Repeated restarts do not resolve an incompatible value or a concurrent service operation.

## Close the change with application evidence

After the server recovers, reread the configuration metadata and verify the intended running values. Check that the relevant pending-restart flags cleared. Reconnect using the application's authentication and TLS settings, then allow controlled test traffic while normal writers remain paused.

Use a known read and, when appropriate, an approved idempotent test write whose result you can verify. An idempotent operation can be retried without creating duplicate business effects. Observe connection failures, latency, and replica health before gradually resuming normal work.

If the new behavior is unacceptable, restore the recorded previous values through the managed configuration path and reassess their restart requirements. Reverting a static setting may need another interruption. Keep normal traffic controlled until the rollback is verified; saving an old value is not the same as restoring the old runtime behavior.

The completed record should contain the before-and-after configuration, runtime observations, restart result, and application checks. Those details let the next operator distinguish an unapplied setting from a session override without guessing or restarting the server again.
