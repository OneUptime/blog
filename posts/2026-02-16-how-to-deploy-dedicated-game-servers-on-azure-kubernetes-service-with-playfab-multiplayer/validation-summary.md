# Validation Summary: How to Deploy Dedicated Game Servers on Azure Kubernetes Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PlayFab Multiplayer Servers
- PlayFab Game Server SDK (GSDK)
- PlayFab MultiplayerServer REST API
- Docker
- Linux containers
- Python requests
- C# game server integration
- Azure compute / PlayFab container registry

## Sources Consulted
- Microsoft Learn: PlayFab Multiplayer Servers terminology, https://learn.microsoft.com/en-us/gaming/playfab/features/multiplayer/servers/server-terms
- Microsoft Learn: Basics of a PlayFab game server, https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/servers/basics-of-a-playFab-game-server
- Microsoft Learn: Using PlayFab Multiplayer Servers to host multiplayer games, https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/servers/using-playfab-servers-to-host-games
- Microsoft Learn: Integrating game servers with the PlayFab Game Server SDK, https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/servers/integrating-game-servers-with-gsdk
- Microsoft Learn: Create and deploy Linux container images, https://learn.microsoft.com/en-us/gaming/playfab/multiplayer/servers/deploying-linux-based-builds
- Microsoft Learn REST API: CreateBuildWithCustomContainer, https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/multiplayer-server/create-build-with-custom-container?view=playfab-rest
- Microsoft Learn REST API: RequestMultiplayerServer, https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/multiplayer-server/request-multiplayer-server?view=playfab-rest
- Microsoft Learn REST API: ListBuildSummariesV2, https://learn.microsoft.com/en-us/rest/api/playfab/multiplayer/multiplayer-server/list-build-summaries-v2?view=playfab-rest
- Microsoft Learn REST API: GetEntityToken, https://learn.microsoft.com/en-us/rest/api/playfab/authentication/authentication/get-entity-token?view=playfab-rest
- Official PlayFab GSDK repository: C# GameserverSDK, https://github.com/PlayFab/gsdk

## Issues Found
- The post incorrectly framed the tutorial as an AKS deployment. Official PlayFab MPS documentation describes the service as running containerized game servers on PlayFab-managed Azure VMs/Azure compute, not on a user-managed AKS cluster. I changed the title, tags, description, intro, diagram, and conclusion to describe PlayFab Multiplayer Servers and Azure compute instead of AKS.
- The container publishing flow used a generic Azure Container Registry and `az acr login`. PlayFab Linux custom container builds use the PlayFab-associated container registry shown in Game Manager or returned by `GetContainerRegistryCredentials`. I changed the Docker commands to use a PlayFab registry-style example.
- The `CreateBuildWithCustomContainer` payload included `ContainerRegistryCredentials`, which is not part of the documented request schema. I removed that field and used `ContainerImageReference` with the uploaded image name and tag.
- The MultiplayerServer REST API examples used `X-SecretKey` directly. The current MultiplayerServer API requires `X-EntityToken`, while `GetEntityToken` can exchange a title secret key for that token. I added a `get_entity_token()` helper and changed CreateBuild, RequestMultiplayerServer, and ListBuildSummariesV2 calls to use `X-EntityToken`.
- The C# GSDK sample used obsolete `RegisterMaintenanceCallback`. I updated it to `RegisterMaintenanceV2Callback` and adjusted the callback signature to use `MaintenanceSchedule`.
- The C# sample did not explicitly start GSDK communication and described `ReadyForPlayers()` only as a ready signal. I added `GameserverSDK.Start()` and updated the text/sample to show that `ReadyForPlayers()` blocks until allocation or termination.
- The fleet metrics example read `CurrentServerStats.StandBy`, but the documented field is `StandingBy`. I corrected the field name.

## Review Notes
- The Dockerfile is a representative example and still assumes the game server binary and assets exist at the shown paths. That is acceptable for this tutorial.
- The Azure CLI was not available in the local environment, but the original Azure CLI command was removed after verifying PlayFab's documented registry flow.
