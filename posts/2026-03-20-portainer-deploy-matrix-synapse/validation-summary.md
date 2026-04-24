# Validation Summary: How to Deploy Matrix/Synapse via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Matrix
- Synapse
- PostgreSQL
- Element Web
- TURN / VoIP configuration

## Sources Consulted
- Synapse Docker image documentation: https://hub.docker.com/r/matrixdotorg/synapse/
- Synapse Docker README: https://github.com/element-hq/synapse/blob/develop/docker/README.md
- Synapse installation docs: https://element-hq.github.io/synapse/latest/setup/installation.html
- Synapse federation docs: https://element-hq.github.io/synapse/latest/federate.html
- Synapse configuration manual: https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html
- Synapse TURN setup docs: https://element-hq.github.io/synapse/latest/turn-howto.html
- Synapse admin API docs: https://element-hq.github.io/synapse/latest/usage/administration/admin_api/
- Synapse shared-secret registration docs: https://element-hq.github.io/synapse/latest/admin_api/register_api.html
- Element Web configuration docs: https://web-docs.element.dev/Element%20Web/config.html
- Portainer stack deployment docs: https://docs.portainer.io/2.33-lts/user/docker/stacks/add
- Portainer relative path volume docs: https://docs.portainer.io/sts/advanced/relative-paths

## Issues Found
- The post mixed `example.com` and `matrix.example.com` for the Synapse `server_name` and Element client configuration. I changed the examples to use `matrix.example.com` consistently so the documented deployment matches the stated prerequisite domain and default federation behavior.
- The Portainer stack used relative bind mounts (`./synapse-config`, `./element-config.json`). Portainer documents relative path volume support as a Business Edition feature for Git-based stack deployments, so I changed the examples to absolute host paths under `/opt/matrix/...` to make the stack configuration generally valid for Portainer deployments.
- The stack implied that publishing `8448` by itself enables federation. Synapse’s Docker docs state the default container config exposes HTTP on `8008`, and federation on `8448` requires TLS or delegation. I corrected the prerequisite wording and port comment so the post no longer overstates what the stack does by default.
- The registration example set `registration_requires_token: true` while also setting `enable_registration: false`. Synapse’s configuration docs say token-based registration only applies when registration is enabled. I replaced this with `registration_shared_secret`, which is the documented requirement for `register_new_matrix_user`.
- The TURN configuration snippet only included `turn_uris`, which is incomplete for a working Synapse TURN integration. I added `turn_shared_secret`, `turn_user_lifetime`, and `turn_allow_guests` to align with Synapse’s TURN setup documentation.
- The admin-user command was syntactically invalid because the inline comment after the line-continuation backslash breaks the shell command. I fixed the command format and kept it aligned with Synapse’s documented `register_new_matrix_user` usage.

## Review Notes
- No remaining technical inaccuracies were found after the fixes above.
- The guide still assumes HTTPS and federation delegation or TLS setup already exist outside the stack itself; that is technically valid given the prerequisites, but a future revision could document the reverse proxy or TLS listener setup explicitly.
- The use of `:latest` image tags is valid, but pinning tested image versions would make the guide more reproducible over time.
