# Validation Summary: How to Import Environment Variables from a .env File in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Container environment variables
- `.env` files and `stack.env`

## Sources Consulted
- Portainer Documentation: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation: Add a new stack — https://docs.portainer.io/2.33-lts/user/docker/stacks/add
- Portainer Documentation: Environment Variable Management in Docker: .env vs. stack.env — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker Docs: Set, use, and manage variables in a Compose file with interpolation — https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs: Set environment variables within your container's environment — https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- The Twelve-Factor App: Config — https://www.12factor.net/config

## Issues Found
1. **The `.env` syntax rules were too strict in a few places.** The post said there must be no spaces around `=` and that values with spaces must be quoted. Docker's current Compose docs allow more flexibility, including quoted values, inline comments with spacing rules, and whitespace handling. I updated the rules to recommend the portable `KEY=VALUE` style without claiming stricter requirements than the docs support.
2. **The stack section blurred Portainer stack variables with a Compose `.env` file on disk.** Portainer's stack UI uploads values into Portainer's environment-variable list, which are then referenced from the Compose file. I clarified that behavior and added the official Portainer caveat that `env_file: - stack.env` works for Docker Standalone and Podman but not for Docker Swarm deployments via `docker stack deploy`.
3. **The Compose example used the obsolete top-level `version` field.** Docker's current Compose reference marks `version` as obsolete and only informative. I removed `version: "3.8"` from the example.
4. **The Twelve-Factor reference was imprecise.** Twelve-Factor guidance standardizes storing config in environment variables, not the use of `.env` files specifically. I adjusted the introduction to avoid implying `.env` files are themselves a Twelve-Factor standard.
5. **One troubleshooting note pointed readers at the wrong failure mode.** The post said spaces around `=` cause missing variables after import. Since Docker's documented `.env` parsing is more permissive than that, I changed the guidance to malformed lines / invalid key-value entries instead.

## Review Notes
- The Portainer UI labels referenced in the post, including `Load variables from .env file`, match current Portainer documentation for container environment variables and stack environment variables.
- The guidance to keep sensitive `.env` files out of version control is correct. For production deployments, Docker and Portainer users should still prefer dedicated secrets/config mechanisms over plain environment variables for high-sensitivity values.
- The post does not pin a Portainer version. The validated behavior matches current Portainer 2.33 LTS documentation and current Docker Compose documentation as of 2026-04-24.
