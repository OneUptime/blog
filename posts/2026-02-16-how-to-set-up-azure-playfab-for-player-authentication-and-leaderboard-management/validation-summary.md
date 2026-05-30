# Validation Summary: How to Set Up Azure PlayFab for Player Authentication and Leaderboard Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure PlayFab
- PlayFab Client API
- PlayFab Admin API
- PlayFab Server API
- Unity C#
- PlayFab CloudScript
- Player authentication and account linking
- Player statistics and leaderboards

## Sources Consulted
- PlayFab Client authentication API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/authentication
- PlayFab Login With Custom ID API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/authentication/login-with-custom-id
- PlayFab Login With Google Account API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/authentication/login-with-google-account
- PlayFab Login With Apple API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/authentication/login-with-apple
- PlayFab Link Google Account API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/account-management/link-google-account
- PlayFab Create Player Statistic Definition API reference: https://learn.microsoft.com/en-us/rest/api/playfab/admin/player-data-management/create-player-statistic-definition
- PlayFab Update Player Statistics client API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/player-data-management/update-player-statistics
- PlayFab Update Player Statistics server API reference: https://learn.microsoft.com/en-us/rest/api/playfab/server/player-data-management/update-player-statistics
- PlayFab Get Leaderboard API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/player-data-management/get-leaderboard
- PlayFab Get Leaderboard Around Player API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/player-data-management/get-leaderboard-around-player
- PlayFab Get Friend Leaderboard API reference: https://learn.microsoft.com/en-us/rest/api/playfab/client/player-data-management/get-friend-leaderboard
- PlayFab player statistics guide: https://learn.microsoft.com/en-us/gaming/playfab/community/leaderboards/tournaments-leaderboards/using-player-statistics
- PlayFab CloudScript guide: https://learn.microsoft.com/en-us/gaming/playfab/features/automation/cloudscript/writing-custom-cloudscript
- PlayFab internal player data from CloudScript: https://learn.microsoft.com/en-us/gaming/playfab/player-progression/player-data/how-to-modify-read-only-internal-player-data

## Issues Found
- The leaderboard creation example used `PlayFabServerAPI.CreatePlayerStatisticDefinition`, but statistic definitions are created through the PlayFab Admin API. Changed the example to `PlayFabAdminAPI.CreatePlayerStatisticDefinition` with Admin model types.
- The post said PlayFab keeps the maximum statistic value by default. Official documentation says the default aggregation method is `Last`. Updated the example to explicitly set `AggregationMethod = Max` and changed the explanation to describe that setting instead of the default.
- The score submission section implied client statistic updates work by default. PlayFab disables client statistic updates by default and requires the "Allow client to post player statistics" Game Manager setting. Added this caveat and recommended trusted server-side score submission for competitive leaderboards.
- The first Unity example did not define the `currentPlayerId` used later in the leaderboard-around-player example. Added a `currentPlayerId` field and assigned it from the login result.
- The CloudScript validation example read session data with `GetUserData`, which can be client-writable and is a poor fit for anti-cheat validation. Changed it to `GetUserInternalData` and used a server-written session key for validation.

## Review Notes
The PlayFab APIs used in the authentication, account linking, leaderboard retrieval, and CloudScript examples are current in the Microsoft Learn API reference as of 2026-05-30. The article uses the classic player statistics and leaderboards APIs; Microsoft also documents newer entity-based statistics and leaderboards, but the classic APIs remain documented and valid for this tutorial.
