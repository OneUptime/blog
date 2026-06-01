# Validation Summary: How to Build a Game Economy Backend with Azure Functions and PlayFab Economy V2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions for Python
- Microsoft PlayFab Economy V2
- PlayFab Catalog APIs
- PlayFab Inventory APIs
- PlayFab Authentication APIs
- Python HTTP requests

## Sources Consulted
- Microsoft Learn: Catalog - Create Draft Item - REST API (PlayFab Economy): https://learn.microsoft.com/en-us/rest/api/playfab/economy/catalog/create-draft-item?view=playfab-rest
- Microsoft Learn: Economy v2 Virtual Currency Quickstart - PlayFab: https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/tutorials/currencies
- Microsoft Learn: PlayFab Inventory APIs - PlayFab: https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/inventory/
- Microsoft Learn: Inventory - Add Inventory Items - REST API (PlayFab Economy): https://learn.microsoft.com/en-us/rest/api/playfab/economy/inventory/add-inventory-items?view=playfab-rest
- Microsoft Learn: Authentication - Get Entity Token - REST API (PlayFab Authentication): https://learn.microsoft.com/en-us/rest/api/playfab/authentication/authentication/get-entity-token?view=playfab-rest
- Microsoft Learn: Authentication - Validate Entity Token - REST API (PlayFab Authentication): https://learn.microsoft.com/en-us/rest/api/playfab/authentication/authentication/validate-entity-token?view=playfab-rest
- Microsoft Learn: Python developer reference for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python

## Issues Found
- The catalog creation examples used `X-SecretKey` directly with `Catalog/CreateDraftItem`. The official PlayFab Economy REST API requires `X-EntityToken` for this endpoint, so the examples now exchange the title secret key for a title entity token and use `X-EntityToken`.
- The virtual currency friendly IDs were `gold`, `gems`, and `energy`, but PlayFab Economy V2 currency friendly IDs are currency codes limited to one to three alphanumeric characters. The examples now use `GLD`, `GEM`, and `NRG`.
- The post implied that creating a currency with `initial_deposit` made players start with that balance. Creating the currency catalog item does not grant balances, so the comment now says to grant the starting balance separately.
- The item catalog example used `IsStackable`, which is a legacy-style field and is not part of the Economy V2 `CatalogItem` REST schema. The example now uses `DefaultStackId`, with `default` for stack-like behavior and `{guid}` for separate stacks.
- The purchase and reward examples trusted a `playerId` supplied by the request body. The updated examples validate the client entity token and derive the title player account entity from the validation result.
- The purchase request omitted `PriceAmounts`, which PlayFab documents as the list of per-item prices that must match the catalog or store price. The request now includes `PriceAmounts`.
- The reward grant helpers used the player's client entity token for direct grants. The examples now use a title entity token and an explicit title player account `Entity`, matching the server-authoritative pattern described in the post.

## Review Notes
The post remains a conceptual tutorial with placeholder helpers such as `get_currency_item_id`, `get_price_amounts`, `get_player_data`, and `subtract_item`. Those helpers would need concrete implementations, error handling, idempotency IDs, and concurrency handling before production use.
