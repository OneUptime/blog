# Validation Summary: How to Run Tautulli in Docker for Plex Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- LinuxServer.io Tautulli container image
- Tautulli
- Plex Media Server
- Tautulli API
- Python
- Discord, email, and Telegram notifications

## Sources Consulted
- Tautulli Installation documentation: https://docs.tautulli.com/getting-started/installation
- Tautulli API Reference: https://docs.tautulli.com/extending-tautulli/api-reference
- Tautulli Custom Scripts documentation: https://docs.tautulli.com/extending-tautulli/custom-scripts
- Tautulli FAQ: https://docs.tautulli.com/support/frequently-asked-questions
- LinuxServer.io Tautulli image documentation: https://docs.linuxserver.io/images/docker-tautulli/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Plex Support article for X-Plex-Token: https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/
- Plex Support advanced server settings: https://support.plex.tv/articles/201105343-advanced-hidden-server-settings/

## Issues Found
- The Plex token instructions pointed users to the Plex server settings page as an XML/token source. Plex's supported flow is to open a library item's XML in Plex Web and copy the `X-Plex-Token` URL parameter. Updated Method 1 accordingly.
- The Compose snippet included `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete and informational. Removed it while keeping the rest of the Compose file intact.
- The API example labelled `get_libraries` as "Get server statistics". The command returns the list of libraries, according to the Tautulli API reference. Updated the comment to "Get libraries".

## Review Notes
- The LinuxServer.io image, port mapping, `/config` volume, `PUID`, `PGID`, `TZ`, and `restart: unless-stopped` settings match current LinuxServer.io documentation.
- Tautulli's API endpoint format and the `get_activity`, `get_history`, `get_libraries`, `get_home_stats`, and `terminate_session` commands are valid current API commands.
- Tautulli's current FAQ documents `tautulli.db` and `config.ini` in the Docker bind-mounted data directory, so the backup guidance is accurate.
