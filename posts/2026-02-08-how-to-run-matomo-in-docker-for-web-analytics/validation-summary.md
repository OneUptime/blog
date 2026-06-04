# Validation Summary: How to Run Matomo in Docker for Web Analytics

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Matomo 5
- MariaDB
- Redis
- Matomo JavaScript Tracking API
- Matomo HTTP Tracking API
- Matomo Reporting API
- GeoIP2 / MaxMind GeoLite2
- Traefik

## Sources Consulted
- Matomo Docker installation FAQ: https://matomo.org/faq/how-to-install/install-matomo-with-docker/
- Official Matomo Docker image documentation: https://github.com/matomo-org/docker
- Matomo auto-archiving documentation: https://matomo.org/faq/on-premise/how-to-set-up-auto-archiving-of-your-reports/
- Matomo JavaScript Tracking Client API reference: https://developer.matomo.org/guides/tracking-javascript
- Matomo HTTP Tracking API reference: https://developer.matomo.org/api-reference/tracking-api
- Matomo Reporting API reference: https://developer.matomo.org/api-reference/reporting-api
- Matomo geolocation documentation: https://matomo.org/faq/how-to/setting-up-accurate-visitors-geolocation/
- Matomo QueuedTracking plugin documentation: https://matomo.org/faq/on-premise/how-to-use-the-queuedtracking-plugin/
- Matomo Heatmap & Session Recording plugin documentation: https://developer.matomo.org/guides/heatmap-session-recording
- Matomo A/B Testing plugin marketplace page: https://plugins.matomo.org/AbTesting
- Matomo Funnels plugin marketplace page: https://plugins.matomo.org/Funnels
- Docker Compose file reference for the obsolete top-level version field: https://docs.docker.com/reference/compose-file/version-and-name/
- MariaDB Docker healthcheck documentation: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/using-healthcheck-sh

## Issues Found
- The opening feature list implied that heatmaps, session recordings, A/B testing, and funnel analysis are built-in Matomo features. These are available through optional Matomo plugins, with several provided as marketplace/premium plugins, so the wording was updated to clarify that distinction.
- The Docker Compose example used the top-level `version: "3.8"` field. Docker's current Compose Specification treats this field as obsolete and informational, so it was removed.
- The HTTP Tracking API examples placed query parameters directly in the URL. Matomo's API reference says string values should be URL encoded, so the examples were changed to `curl --get` with `--data-urlencode`.
- The GeoIP download command used `wget`, which is not the downloader used by the official Matomo image build and may not be present in the runtime image. It was changed to `curl -L`, which also handles MaxMind's download redirects.
- The MariaDB backup and restore commands expanded `$MARIADB_ROOT_PASSWORD` on the host shell, but credentials in a Compose `.env` file are not automatically exported to the host environment. The commands now expand the variable inside the MariaDB container.

## Review Notes
The remaining examples align with current Matomo 5, Docker Compose, MariaDB, and Traefik conventions. For production use, the post could later add security hardening details such as secrets management, trusted proxy headers, and token handling, but those are outside the scope of the technical corrections requested.
