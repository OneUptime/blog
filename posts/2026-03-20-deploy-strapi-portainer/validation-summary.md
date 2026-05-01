# Validation Summary: How to Deploy Strapi CMS via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Strapi v4
- Portainer
- Docker Compose
- PostgreSQL
- REST API
- GraphQL
- cURL
- OpenSSL

## Sources Consulted
- Strapi v4 Docker docs: https://docs-v4.strapi.io/dev-docs/installation/docker
- Strapi v4 database configuration docs: https://docs-v4.strapi.io/dev-docs/configurations/database
- Strapi v4 REST API docs: https://docs-v4.strapi.io/dev-docs/api/rest
- Strapi v4 GraphQL API docs: https://docs-v4.strapi.io/dev-docs/api/graphql
- Strapi v4 content-type creation docs: https://docs-v4.strapi.io/user-docs/content-type-builder/creating-new-content-type
- Strapi v4 field configuration docs: https://docs-v4.strapi.io/user-docs/content-type-builder/configuring-fields-content-type
- Strapi v4 API token docs: https://docs-v4.strapi.io/user-docs/settings/API-tokens
- Strapi v4 data management docs: https://docs-v4.strapi.io/dev-docs/data-management
- Official Strapi Docker repository note that `strapi/strapi` is v3-only: https://github.com/strapi/strapi-docker
- Community Strapi image documentation used for the replacement image: https://github.com/naskio/docker-strapi
- Docker Compose startup order and `service_healthy` docs: https://docs.docker.com/compose/how-tos/startup-order/

## Issues Found
- The post referenced `strapi/strapi:4.22.0-node18-alpine` as if it were a current Strapi v4 image. Strapi's official v4 Docker docs state that Strapi does not publish official container images for v4, and the official `strapi/strapi` repository is documented as v3-only. I replaced the image with a pinned community-maintained v4 image and clarified that the guide uses a community image.
- The stack set `NODE_ENV=production`, but the post later instructed readers to create a content type through the Content-Type Builder. Strapi's docs state that the Content-Type Builder is only writable in development and read-only in other environments. I changed the stack to `NODE_ENV=development` and corrected the production guidance in the conclusion.
- The sample `APP_KEYS` value was written as a plain comma-separated placeholder and the conclusion said it should be 4 base64 strings. Strapi reads `APP_KEYS` as an array and the docs only require unique random strings. I changed the example to array syntax and corrected the explanation.
- The content model used a generic rich-text field while the sample POST payload sent a plain string. In Strapi v4, `Rich Text (Markdown)` and `Rich Text (Blocks)` are distinct field types, and the plain-string payload matches the Markdown field. I updated the field example so the content type matches the API payload.
- The post said Strapi generates REST and GraphQL APIs automatically. Strapi generates REST APIs automatically, but GraphQL requires installing the GraphQL plugin first. I corrected the claims in the content-type step and conclusion.
- The REST example labeled `GET /api/articles` as public by default. Strapi's REST API docs state content types are private by default unless permissions are granted or requests are authenticated. I corrected the example note to require enabling `find` permission for the `Public` role.
- The GraphQL example omitted authentication and did not mention the GraphQL plugin requirement. I updated the example to note the plugin prerequisite and include token-based authentication.
- The example used `publishedAt` as a custom field name even though Strapi uses `publishedAt` as the publication timestamp field in Draft & Publish flows. I changed the example field name to `publishDate` to avoid conflicting with that built-in field.

## Review Notes
- This guide is now technically consistent for a Strapi v4 workflow, but it is version-specific. Strapi v4 is a maintenance-line release and Strapi 5 is the current major version.
- For production, Strapi's v4 docs recommend building a custom image from an existing Strapi project rather than relying on an official Strapi image, because no official v4 image is published.
