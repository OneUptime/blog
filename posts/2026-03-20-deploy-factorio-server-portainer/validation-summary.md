# Validation Summary: How to Deploy a Factorio Server via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Factorio dedicated server
- factoriotools/factorio Docker image
- Portainer (stack deployment)
- Docker Compose
- Factorio Mod Portal API
- Watchtower (container auto-update)
- Factorio in-game console / admin commands

## Sources Consulted
- factoriotools/factorio-docker GitHub repo: https://github.com/factoriotools/factorio-docker
- factoriotools/factorio Docker Hub: https://hub.docker.com/r/factoriotools/factorio
- Factorio Multiplayer wiki: https://wiki.factorio.com/Multiplayer
- Factorio Console wiki: https://wiki.factorio.com/Console
- Factorio Mod Portal API wiki: https://wiki.factorio.com/Mod_portal_API
- wube/factorio-data server-settings.example.json: https://github.com/wube/factorio-data/blob/master/server-settings.example.json
- Watchtower arguments docs: https://containrrr.dev/watchtower/arguments/
- Angel's Refining mod page: https://mods.factorio.com/mod/angelsrefining

## Issues Found

1. **Mod download URL pattern was wrong.** The original used `https://mods.factorio.com/api/downloads/data/mods/45/angels-refining_0.12.2.zip`, which is not how the Factorio Mod Portal API works. The API returns a `download_url` field (e.g. `/download/<mod>/<release_id>`) that must be appended to `https://mods.factorio.com` and called with `?username=...&token=...` query params. Replaced the hand-built URL with a `curl` call to `https://mods.factorio.com/api/mods/<mod>/full` to fetch `download_url`, then a `wget` to the correct authenticated URL.

2. **Mod name was wrong.** Angel's Refining is published as `angelsrefining` (one word, no hyphen) on the mod portal. Changed `angels-refining` to `angelsrefining` in the `MOD_NAME` variable, the wget output filename interpolation, and the `mod-list.json` snippet.

3. **`/save manual-save-001` is not a valid Factorio multiplayer command.** The correct admin command for forcing a save on a dedicated server is `/server-save`, which takes no arguments and overwrites the current save. Replaced the line in the console-commands snippet.

## Review Notes

- The `factoriotools/factorio:stable` image, `/factorio` volume mount, default `34197/udp` port, and the `GENERATE_NEW_SAVE` / `LOAD_LATEST_SAVE` env vars are all correct.
- All `server-settings.json` field names match the upstream `server-settings.example.json` from `wube/factorio-data`. `autosave_interval` and `afk_autokick_interval` are documented in minutes — the post's values (10 and 0) are valid.
- Watchtower's 6-field cron format (`0 0 4 * * *`) is correct; Watchtower uses Go's robfig/cron with seconds.
- The post does not mention RCON; Factorio supports RCON via `--rcon-port` / `--rcon-password` (env vars `RCON_PORT` and `RCON_PASSWORD` in the image), which could be a useful future addition for remote admin command execution but is out of scope for the current corrections.
- For real production use, readers should be reminded that the Factorio account token (not the website password) is what `password`/`token` in `server-settings.json` and the mod portal API expect — but the post's wording is acceptable as-is.
