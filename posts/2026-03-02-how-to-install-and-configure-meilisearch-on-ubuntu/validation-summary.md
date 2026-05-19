# Validation Summary: How to Install and Configure Meilisearch on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Meilisearch
- systemd
- Nginx
- cURL
- TOML
- JSON

## Sources Consulted
- Meilisearch documentation: local installation, https://www.meilisearch.com/docs/resources/self_hosting/getting_started/install_locally
- Meilisearch documentation: running in production, https://www.meilisearch.com/docs/resources/self_hosting/deployment/running_production
- Meilisearch documentation: configuration overview, https://www.meilisearch.com/docs/resources/self_hosting/configuration/overview
- Meilisearch documentation: configuration reference, https://www.meilisearch.com/docs/resources/self_hosting/configuration/reference
- Meilisearch documentation: create API key, https://www.meilisearch.com/docs/reference/api/keys/create-api-key
- Meilisearch documentation: create index, https://www.meilisearch.com/docs/reference/api/indexes/create-index
- Meilisearch documentation: add or replace documents, https://www.meilisearch.com/docs/reference/api/documents/add-or-replace-documents
- Meilisearch documentation: search with POST, https://www.meilisearch.com/docs/reference/api/search
- Meilisearch documentation: filter expression syntax, https://www.meilisearch.com/docs/capabilities/filtering_sorting_faceting/advanced/filter_expression_syntax
- Meilisearch documentation: settings API, https://www.meilisearch.com/docs/reference/api/settings

## Issues Found
- The configuration comment said production mode disables `/experimental-features`. Current Meilisearch documentation says production mode requires a master key and disables the search preview interface, so the comment was corrected.
- The `max_indexing_memory` comment described a maximum index size and a 100GB default. Current documentation defines it as the maximum RAM used while indexing, with a default of two thirds of available RAM, so the comment was corrected.
- The log level comment omitted `OFF`, which is a supported value in current documentation. The comment was updated.
- The filtered and sorted search example appeared before the settings required for filtering and sorting. Meilisearch requires attributes to be configured as `filterableAttributes` and `sortableAttributes` before using them in filters or sort expressions, so a note was added to make the dependency explicit.
- The Nginx example claimed to block admin endpoints while the broad `/` proxy still exposed other write/admin routes. The snippet now only proxies `/health` and per-index search routes, returning `403` for all other paths.

## Review Notes
The API key, index creation, document indexing, search, settings, systemd, and installation examples match the current Meilisearch API and deployment documentation. Filtering and sorting settings are asynchronous tasks, so in a production walkthrough it would be useful to show checking task status before running dependent searches.
