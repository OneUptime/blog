# Validation Summary: How to Run MISP in Docker for Threat Intelligence

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- MISP
- Docker
- Docker Compose
- MariaDB / MySQL
- Valkey / Redis
- Nginx / PHP-FPM
- PyMISP
- MISP REST API
- Threat intelligence feeds and synchronization

## Sources Consulted
- Official MISP Docker repository README: https://github.com/MISP/misp-docker
- Official MISP Docker template.env: https://github.com/MISP/misp-docker/blob/master/template.env
- Official MISP Docker Compose file: https://github.com/MISP/misp-docker/blob/master/docker-compose.yml
- MISP Automation API / OpenAPI documentation: https://www.misp-project.org/openapi/
- PyMISP API documentation: https://pymisp.readthedocs.io/en/main/modules.html
- PyMISP source documentation for current method signatures: https://github.com/MISP/PyMISP/blob/main/pymisp/api.py

## Issues Found
- The prerequisites listed outdated Docker versions. Updated them to Docker Engine 25+ and Docker Compose plugin 2.17+, matching the current official MISP Docker README.
- The architecture described the current Docker stack as Apache/MySQL/Redis only. Updated it to reflect the current official stack using Nginx with PHP-FPM, MariaDB-compatible database settings, and Valkey/Redis.
- The `.env` example used outdated variable names such as `MISP_BASEURL`, `MISP_ADMIN_EMAIL`, `MISP_ADMIN_PASSPHRASE`, and `TIMEZONE`. Replaced them with current variables such as `BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ORG`, `GPG_PASSPHRASE`, `REDIS_PASSWORD`, and `TZ`.
- The custom Compose example used outdated service assumptions and environment variables. Updated it to use MariaDB 10.11, Valkey 7.2, `misp-modules`, and the current `misp-core` environment variables.
- The feed API example used the wrong endpoint and method. Replaced `/feeds/enableFeed` with `/feeds/enable/{feedId}` and changed feed fetching from `GET` to `POST /feeds/fetchFromAllFeeds`.
- The PyMISP example used an outdated event creation helper and keyword-style attribute calls. Replaced it with the documented `MISPEvent`, `add_event`, and dictionary-based `add_attribute` flow.
- The synchronization API payload was wrapped in a `Server` object and used a non-length-specific authkey placeholder. Updated it to match the current OpenAPI request schema and show a 40-character auth key placeholder.
- Worker troubleshooting used an incorrect settings command for worker status. Replaced it with the documented `/servers/getWorkers` and `/servers/restartWorkers` API endpoints.
- Maintenance language and cache clearing commands referred only to Redis. Updated them to Valkey-compatible terminology and `valkey-cli`.

## Review Notes
- The post is technically relevant and includes implementation details, so it was reviewed as a code/tutorial post.
- The official MISP Docker repository recommends using the bundled Compose file and `.env` where possible. The custom Compose example is now aligned with the current public images and environment variables, but production deployments should still start from the upstream Compose file to inherit future changes.
- Python and YAML snippets were syntax-checked locally.
