# Validation Summary: How to Build a Real-Time Matchmaking Service with Azure SignalR and PlayFab

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SignalR Service
- Azure Functions
- PlayFab Matchmaking
- PlayFab Multiplayer Servers
- Azure CLI
- Python
- C#
- ASP.NET Core SignalR client

## Sources Consulted
- Microsoft Learn: Azure CLI `az signalr create` - https://learn.microsoft.com/en-us/cli/azure/signalr?view=azure-cli-latest#az-signalr-create
- Microsoft Learn: Azure Functions SignalR Service input binding - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-signalr-service-input
- Microsoft Learn: Azure Functions SignalR Service output binding - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-signalr-service-output
- Microsoft Learn: PlayFab Matchmaking overview - https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/matchmaking/
- Microsoft Learn: Configuring PlayFab matchmaking queues - https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/matchmaking/config-queues
- Microsoft Learn: Specifying attributes with PlayFab matchmaking tickets - https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/matchmaking/ticket-attributes
- Microsoft Learn: PlayFab Set Matchmaking Queue REST API - https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/matchmaking-admin/set-matchmaking-queue?view=playfab-rest
- Microsoft Learn: PlayFab Create Matchmaking Ticket REST API - https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/matchmaking/create-matchmaking-ticket?view=playfab-rest
- Microsoft Learn: PlayFab Get Matchmaking Ticket REST API - https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/matchmaking/get-matchmaking-ticket?view=playfab-rest
- Microsoft Learn: PlayFab Get Match REST API - https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/matchmaking/get-match?view=playfab-rest

## Issues Found
- The architecture described a PlayFab match-found event handled by Azure Functions, while the implementation used polling. Updated the diagram and explanation to describe status polling.
- The `SetMatchmakingQueue` REST example used `X-SecretKey`; the current API requires `X-EntityToken`. Replaced the header and placeholder variable.
- The queue configuration used incorrect REST field names for the skill rule expansion. Replaced `DifferenceRule` with `DifferenceRules`, added an initial `Difference`, and changed `Expansion`/`MaxDifference` to `LinearExpansion`/`Limit`.
- The region selection rule omitted the latency attribute path. Added `Path: "Latencies"` and updated ticket creation to submit latency measurements.
- The Azure Functions SignalR negotiate function used an output binding for `signalRConnectionInfo`; this is an input binding. Changed it to `generic_input_binding` and removed the unused import.
- The PlayFab ticket creation example left `Creator.Entity.Id` blank and implied it would be filled from the entity token. Updated the example to accept and pass `entityId`.
- The ticket creation payload omitted `MembersToMatchWith`; added an empty list for the solo queue case.
- The `GetMatchmakingTicket` request omitted the required `EscapeObject` field. Added it.
- The `GetMatch` call was referenced but not defined, and the REST API requires `EscapeObject` and `ReturnMemberAttributes`. Added a `get_match_details` helper with the required payload fields.
- The skill expansion explanation calculated the old expansion timing from the invalid payload. Reworded it to say the rule expands until it reaches the configured limit.

## Review Notes
The examples still assume supporting production pieces such as authentication, entity token acquisition, active-ticket persistence, cancellation endpoints, and C# DTO classes. Those omissions are acceptable for a focused tutorial snippet, but they should be implemented before using this design in production.
