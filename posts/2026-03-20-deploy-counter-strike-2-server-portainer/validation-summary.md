# Validation Summary: How to Deploy a Counter-Strike 2 Server via Portainer - Deploy Counter Strike

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Counter-Strike 2 (CS2) dedicated server
- Docker / Docker Compose
- Portainer
- joedwards32/cs2 Docker image
- SteamCMD
- Steam Game Server Login Token (GSLT)
- Steam Workshop
- SourceTV
- Source RCON

## Sources Consulted
- [joedwards32/cs2 on Docker Hub](https://hub.docker.com/r/joedwards32/cs2)
- [joedwards32/CS2 GitHub repository](https://github.com/joedwards32/CS2)
- [joedwards32/CS2 example docker-compose.yml](https://github.com/joedwards32/CS2/blob/main/examples/docker-compose.yml)
- [Counter-Strike 2 Dedicated Servers - Valve Developer Community](https://developer.valvesoftware.com/wiki/Counter-Strike_2/Dedicated_Servers)
- [Steam Game Server Account Management](https://steamcommunity.com/dev/managegameservers)

## Issues Found
1. **Wrong env var name for the GSLT.** The post used `CS2_GSLT`, but the joedwards32/cs2 image expects `SRCDS_TOKEN`. Updated the compose snippet, the inline comment, and Step 2 instructions to use `SRCDS_TOKEN`.
2. **Non-existent `STEAM_ACCOUNT` variable in Step 4.** The image has no `STEAM_ACCOUNT` variable; Workshop maps simply reuse the `SRCDS_TOKEN` already set in Step 1. Removed the bogus line and updated the comment to reflect this.

## Review Notes
- The container image, default ports (27015 game TCP/UDP, 27020 SourceTV UDP), volume path (`/home/steam/cs2-dedicated`), App ID 730 for GSLT registration, and the `game/csgo/cfg/server.cfg` config path are all correct for the joedwards32/cs2 image and current CS2 layout.
- `CS2_GAMETYPE`/`CS2_GAMEMODE` integer values shown match the standard Source engine matrix (e.g. 0/1 = Competitive Classic).
- `sv_region` still appears in Valve's documentation, but Steam's master server browser no longer surfaces region filters for CS2, so its practical effect is minimal. Left in place since it is not technically incorrect.
- `mp_roundtime 1.92` is the canonical competitive value (1:55), kept as-is.
- The `rcon` CLI in Step 5 is a generic external client (e.g. `rcon-cli`) rather than a binary shipped inside the container; users will need to install one or use Portainer's in-container console with `rcon_password` set in their client. This is implied but could be clearer in a future revision.
