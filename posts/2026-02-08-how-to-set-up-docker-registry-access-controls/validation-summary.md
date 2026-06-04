# Validation Summary: How to Set Up Docker Registry Access Controls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CNCF Distribution / Docker Registry
- Docker CLI and Docker Compose
- htpasswd / HTTP Basic authentication
- Token-based registry authentication
- cesanta/docker_auth
- TLS certificates for Docker registry clients
- Harbor registry and Harbor API
- NGINX reverse proxy
- Registry logging and jq

## Sources Consulted
- CNCF Distribution registry deployment documentation: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution token authentication specification: https://distribution.github.io/distribution/spec/auth/token/
- CNCF Distribution configuration documentation: https://distribution.github.io/distribution/about/configuration/
- Docker certificate trust documentation: https://docs.docker.com/engine/security/certificates/
- Docker login CLI reference: https://docs.docker.com/reference/cli/docker/login/
- cesanta/docker_auth README and example configs: https://github.com/cesanta/docker_auth and https://raw.githubusercontent.com/cesanta/docker_auth/main/examples/reference.yml
- Harbor releases: https://github.com/goharbor/harbor/releases
- Harbor project documentation: https://goharbor.io/docs/2.13.0/working-with-projects/create-projects/
- Harbor API schema: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml
- Harbor role constants: https://raw.githubusercontent.com/goharbor/harbor/main/src/common/const.go

## Issues Found
- The htpasswd comment said `-c` creates the first file, but the command uses output redirection with `-Bbn`; updated the comment to match the actual command.
- The registry examples used `registry:2`; updated them to `registry:3`, which is the current image used in CNCF Distribution documentation.
- The docker_auth token realm used `/token`; updated it to `/auth`, matching docker_auth's documented registry configuration.
- The docker_auth token config omitted `disable_legacy_key_id: true`, which is required when using registry v3; added it.
- The Harbor section included a partial Compose file that was not a valid Harbor deployment; removed it and kept the official installer workflow.
- The Harbor installer version was outdated at `v2.10.0`; updated it to `v2.14.4`, the latest Harbor release available on the review date.
- The Harbor project creation example used top-level `public`, which the current API schema marks deprecated/reserved; moved visibility to `metadata.public` as a string.
- The Harbor role list omitted Limited Guest; added role ID 5.
- The NGINX proxy example used `proxy_pass https://registry` even though the upstream registry service is plain HTTP behind TLS termination; changed it to `http://registry`.
- The log parsing example piped registry logs to `jq` without enabling JSON formatting; added `REGISTRY_LOG_FORMATTER=json`.

## Review Notes
The article is technically relevant and the remaining examples are appropriate as tutorial snippets. For a production deployment, Harbor configuration should continue to follow the generated Compose files from the official installer rather than hand-written service subsets.
