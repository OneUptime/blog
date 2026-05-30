# Validation Summary: How to Sync Microsoft 365 Calendar Events to Azure Cosmos DB Using Graph API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Graph API
- Microsoft 365 calendar events and calendar view delta queries
- Azure Cosmos DB for NoSQL
- Azure Functions timer triggers and HTTP triggers
- Azure Cosmos DB change feed trigger
- Azure Durable Functions
- C# and Microsoft Graph .NET SDK

## Sources Consulted
- Microsoft Graph: Get incremental changes to events in a calendar view: https://learn.microsoft.com/en-us/graph/delta-query-events
- Microsoft Graph: event delta API reference: https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0
- Microsoft Graph: List calendarView API reference: https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Azure Cosmos DB trigger for Azure Functions 2.x and higher: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-trigger
- Azure Cosmos DB change feed modes: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-modes
- Azure Cosmos DB query language reference: https://learn.microsoft.com/en-us/cosmos-db/query/
- Azure Cosmos DB AVG query function: https://learn.microsoft.com/en-us/cosmos-db/query/avg
- Azure Cosmos DB DATETIMEDIFF query function: https://learn.microsoft.com/en-us/cosmos-db/query/datetimediff
- Azure Cosmos DB LOWER query function: https://learn.microsoft.com/en-us/cosmos-db/query/lower

## Issues Found
- The initial sync used a normal `calendarView` request and then attempted to read an `OdataDeltaLink`. Microsoft Graph only returns delta state links from the `calendarView/delta` endpoint, so the sample was changed to start with `CalendarView.Delta.GetAsDeltaGetResponseAsync`.
- The delta query sample used `$select` and `$top`. Microsoft Graph calendar view delta does not support `$select`; page size should be requested with the `Prefer: odata.maxpagesize={x}` header. The sample was updated accordingly.
- The incremental sync sample did not apply the saved `@odata.deltaLink` URL. Microsoft Graph documents these state tokens as opaque URLs that should be reused as returned, so the sample now uses `WithUrl(syncState.DeltaLink)`.
- The sync code saved either `@odata.nextLink` or `@odata.deltaLink` without explaining the difference. The comments now explain that `nextLink` continues paging and `deltaLink` completes the round.
- The Cosmos DB analytics query used `DateTimeDiff('minute', ...)`. The documented function is `DATETIMEDIFF`, and the valid minute date part is `mi`; the query was corrected.
- The Cosmos DB queries compared local calendar `start.dateTime` values. The post recommends UTC-normalized values later, so the document example, mapping code, and queries were aligned on `startUtc` and `endUtc`.
- The deletion sample assumed `AdditionalData` was non-null. The check now uses a null-safe condition before looking for `@removed`.
- The post described Cosmos DB as providing "sub-millisecond" reads and "aggregation pipelines" for the NoSQL API. These claims were adjusted to "low-latency reads" and "aggregation queries".
- The app registration step used the older "Azure AD" name. It was updated to Microsoft Entra ID.
- The recurring events note claimed each instance has a unique ID. The wording was changed to match Microsoft Graph calendar view documentation, which says the response can include single instances, occurrences, and exceptions of recurring series.

## Review Notes
The snippets remain illustrative and omit surrounding application code such as dependency injection setup, sync-state document definitions, and helper methods like `GetUsersToSync`, `GetSyncState`, and `SaveSyncState`. For production use, the sync loop should continue following `@odata.nextLink` pages until an `@odata.deltaLink` is returned, either within one invocation or through persisted continuation state.
