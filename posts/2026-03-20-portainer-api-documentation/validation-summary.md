# Validation Summary: How to Access the Portainer API Documentation - A Practical Guide

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Portainer
- Portainer REST API
- OpenAPI / Swagger
- `curl`
- OpenAPI Generator

## Sources Consulted
- Portainer API documentation overview: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer hosted API docs portal: https://api-docs.portainer.io/
- Portainer CE hosted docs version index: https://api-docs.portainer.io/ce-versions.json
- Portainer CE OpenAPI spec (current published example used in the post): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source for API tags and security schemes: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/handler.go
- Portainer source for `POST /auth`: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/auth/authenticate.go
- Portainer source for user access token creation: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/user_create_access_token.go
- Portainer source for `/system/status` and `/system/version`: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/system/status.go and https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/system/version.go

## Issues Found
- The post said Portainer exposed a built-in Swagger UI at `/api/documentation`. Current official Portainer docs direct users to the hosted docs portal at `https://api-docs.portainer.io/`, and Portainer's current source exposes API route metadata but no live `/api/documentation` route. I replaced the built-in Swagger UI guidance with the current hosted-docs workflow.
- The post hardcoded an outdated SwaggerHub URL. I updated the documentation URLs to the current official hosted docs portal and edition/version query format.
- The tag table listed several tags that do not exist in the current official API spec, including `containers`, `images`, `volumes`, and `networks`. I replaced them with current published tags such as `docker`, `endpoint_groups`, `helm`, and `system`.
- The post instructed readers to use Swagger UI `Authorize` and `Try it out` steps. The current hosted docs are Redoc-based, so I replaced this with accurate authentication guidance for `X-API-Key` access tokens and `Authorization: Bearer ...` JWTs.
- The OpenAPI spec download example pointed to `/api/documentation/json`, which is not part of the current published docs workflow. I updated the example to download the published versioned YAML spec from `api-docs.portainer.io` and updated the OpenAPI Generator commands to use that file.
- The `/api/users` examples did not mention Portainer's permission requirements. I annotated those examples to avoid implying that all authenticated users can list users.

## Review Notes
- Portainer currently supports both user API access tokens in the `X-API-Key` header and JWTs returned by `POST /api/auth` in the `Authorization: Bearer ...` header.
- The hosted docs portal publishes CE and BE specs by version. Selecting the live edition/version dropdowns is more reliable than assuming every installed historical release has a stable direct docs URL.
- Validation was performed against official documentation and Portainer source code. No live Portainer instance was available in this workspace to execute the example requests end-to-end.
