# Validation Summary: How to Set Up Docker Container Auto-Updates with Watchtower

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Watchtower
- Shoutrrr notifications
- PostgreSQL Docker image
- Private Docker registry authentication

## Sources Consulted
- Watchtower official arguments documentation: https://containrrr.dev/watchtower/arguments/
- Watchtower official usage overview: https://containrrr.dev/watchtower/usage-overview/
- Watchtower official notifications documentation: https://containrrr.dev/watchtower/notifications/
- Watchtower official container selection documentation: https://containrrr.dev/watchtower/container-selection/
- Watchtower official private registry documentation: https://containrrr.dev/watchtower/private-registries/
- Watchtower official stop signals documentation: https://containrrr.dev/watchtower/stop-signals/
- Watchtower official lifecycle hooks documentation: https://containrrr.dev/watchtower/lifecycle-hooks/
- Watchtower official HTTP API documentation: https://containrrr.dev/watchtower/http-api-mode/
- Shoutrrr official service URL overview: https://containrrr.dev/shoutrrr/v0.8/services/overview/
- Docker Compose official version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- Watchtower GitHub repository status: https://github.com/containrrr/watchtower

## Issues Found
- The Docker Compose examples used the top-level `version: '3.8'` property. Docker Compose now treats this property as obsolete and only informative, so it was removed from the Compose snippets.
- The PostgreSQL examples used `postgres:15` without the required `POSTGRES_PASSWORD` environment variable. Added `POSTGRES_PASSWORD=change-me` to the `docker run` and Compose examples so the container starts successfully.
- The lifecycle hook example configured hook labels but did not enable lifecycle hooks in Watchtower. Added a Watchtower service with `WATCHTOWER_LIFECYCLE_HOOKS=true`, matching the documented requirement.
- The summary table listed no command flag for notification URLs. Updated it to show the documented `--notification-url` flag.

## Review Notes
Watchtower's repository is archived and read-only as of December 17, 2025, although the documented image and configuration options reviewed here remain available. Future updates to this post should mention that maintenance status when discussing production suitability.
