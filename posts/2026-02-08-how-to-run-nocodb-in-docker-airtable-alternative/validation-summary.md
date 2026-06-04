# Validation Summary: How to Run Nocodb in Docker (Airtable Alternative)

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- NocoDB
- Docker
- Docker Compose
- PostgreSQL
- REST APIs
- Webhooks
- Traefik reverse proxy

## Sources Consulted
- NocoDB self-hosting environment variables: https://nocodb.com/docs/self-hosting/environment-variables
- NocoDB Docker Compose installation: https://nocodb.com/docs/self-hosting/installation/docker-compose
- NocoDB REST API overview: https://nocodb.com/docs/product-docs/developer-resources/rest-apis
- NocoDB v2 Data API reference: https://nocodb.com/apis/v2/data
- NocoDB API tokens documentation: https://nocodb.com/docs/product-docs/account-settings/api-tokens
- NocoDB webhook v3 documentation: https://nocodb.com/docs/product-docs/automation/webhook/create-webhook
- NocoDB data source connection documentation: https://nocodb.com/docs/product-docs/data-sources/connect-to-data-source
- NocoDB roles and permissions documentation: https://nocodb.com/docs/product-docs/roles-and-permissions
- NocoDB views documentation: https://nocodb.com/docs/product-docs/views
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post described NocoDB as "open-source with no licensing fees." Current NocoDB documentation describes self-hosting under the Fair Code Sustainable Use License with permitted internal use and possible commercial licensing restrictions. Changed this to "Self-hostable with no licensing fees for internal use."
- The post claimed REST and GraphQL APIs are generated automatically for every table. Current NocoDB docs only document REST APIs for programmatic table access. Removed the GraphQL claim.
- The Docker Compose example included the obsolete top-level `version: "3.8"` key. Docker Compose still accepts it for backward compatibility, but current Docker docs mark it obsolete and warn on use. Removed the key.
- The Compose example used `NC_PUBLIC_URL`, which is now a legacy name. Updated it to the recommended `NC_SITE_URL`.
- The Compose example included `NC_TIMEZONE`, which was not listed in current NocoDB environment variable docs. Removed it.
- The external database UI steps used outdated "New Project" wording. Updated them to the current "Connect External Data" flow.
- The REST API examples used legacy v1 paths and the old `xc-auth` header. Updated examples to v2 table record endpoints using `xc-token`, and adjusted update/delete payloads to include the record ID as required by the current v2 Data API.
- The API token location was outdated. Updated it to Account Settings > API Tokens.
- The webhook JSON snippet used a legacy configuration shape. Replaced it with a current v3 record insert event payload and updated the configuration location to Details > Webhooks.

## Review Notes
The remaining Docker commands, PostgreSQL healthcheck, volume paths, NocoDB metadata database connection format, supported role descriptions, view descriptions, backup commands, and Traefik label example are technically reasonable for the scope of the guide. The API examples now use placeholder IDs and will require readers to copy their actual table ID from NocoDB's API snippets or URL.
