# Validation Summary: How to Deploy Prowlarr via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Prowlarr
- Sonarr
- Radarr
- Docker networking

## Sources Consulted
- LinuxServer.io Prowlarr container documentation: https://docs.linuxserver.io/images/docker-prowlarr/
- Docker Compose file reference, `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docker networks documentation: https://docs.portainer.io/sts/user/docker/networks
- Prowlarr official source, Sonarr application settings: https://github.com/Prowlarr/Prowlarr/blob/develop/src/NzbDrone.Core/Applications/Sonarr/SonarrSettings.cs
- Prowlarr official source, Radarr application settings: https://github.com/Prowlarr/Prowlarr/blob/develop/src/NzbDrone.Core/Applications/Radarr/RadarrSettings.cs
- Prowlarr official source, indexer page toolbar (`Test All Indexers` / `Sync App Indexers`): https://github.com/Prowlarr/Prowlarr/blob/develop/frontend/src/Indexer/Index/IndexerIndex.tsx
- Prowlarr official source, provider test-all API behavior: https://github.com/Prowlarr/Prowlarr/blob/develop/src/Prowlarr.Api.V1/ProviderControllerBase.cs

## Issues Found
1. **Obsolete Compose `version` key.** Both Compose snippets used `version: "3.8"`. Current Docker Compose documentation marks the top-level `version` field as obsolete and only kept for backward compatibility, so I removed it from both examples.
2. **Incorrect and incomplete Prowlarr app field names.** The Sonarr and Radarr setup examples used generic labels like `API URL`, and the Radarr example omitted the required `Prowlarr Server` field entirely. I updated both examples to match Prowlarr's current field names: `Prowlarr Server`, `Sonarr Server`, and `Radarr Server`.
3. **Inaccurate description of indexer testing output.** The post said `Test All` shows response time and number of results. Current Prowlarr behavior exposes `Test All Indexers`, and its bulk test flow reports validation success/failure and validation/connectivity errors rather than search-result counts or response-time metrics. I corrected that section accordingly.

## Review Notes
- The Docker image name, exposed port `9696`, `PUID`/`PGID`/`TZ` environment variables, and `/config` volume mapping are correct for the current LinuxServer.io Prowlarr image.
- The container-name URLs such as `http://prowlarr:9696`, `http://sonarr:8989`, and `http://radarr:7878` are valid when the containers share a Docker network, which aligns with the later `media-network` example.
- If Sonarr or Radarr are configured with a URL base, that base path must be included in the corresponding server URL in Prowlarr.
