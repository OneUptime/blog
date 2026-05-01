# Validation Summary: How to Deploy Sonic Search via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Sonic search backend
- Portainer stacks
- Docker Compose
- Sonic Channel TCP protocol
- Python (`sonic-client`)

## Sources Consulted
- Sonic GitHub repository README — https://github.com/valeriansaliou/sonic
- Sonic sample configuration — https://raw.githubusercontent.com/valeriansaliou/sonic/master/config.cfg
- Sonic protocol reference — https://raw.githubusercontent.com/valeriansaliou/sonic/master/PROTOCOL.md
- Sonic Dockerfile — https://raw.githubusercontent.com/valeriansaliou/sonic/master/Dockerfile
- Sonic inner workings documentation — https://github.com/valeriansaliou/sonic/blob/master/INNER_WORKINGS.md
- Portainer documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- `sonic-client` package documentation — https://pypi.org/project/sonic-client/1.0.0/

## Issues Found
1. The Sonic configuration snippet used an incorrect authentication section. Sonic expects `auth_password` under `[channel]`, not a separate `[channel.auth]` table. Updated the config example and the conclusion accordingly.
2. The Compose snippet included `version: "3.8"`, which is obsolete in current Compose. Removed it to match current Docker guidance.
3. The Compose healthcheck was not valid for the official Sonic image. The image is built from `gcr.io/distroless/cc`, so `CMD-SHELL`, `/bin/sh`, and `nc` are not available inside the container. The healthcheck also hardcoded the password separately from the mounted config. Removed the invalid healthcheck.
4. Step 3 incorrectly referred to Portainer environment variables even though the stack does not use them. Renamed the step so it accurately reflects the actual action: updating the password in `config.cfg` before deployment.
5. The sample `START` response was incorrect. Sonic documents `STARTED ingest protocol(1) buffer(20000)`, not `backend(sonic)`. Corrected the example.
6. The search example used an imprecise `QUERY` syntax comment and showed quoted event result IDs. Updated the syntax comment to match the protocol reference and changed the event example to use unquoted object IDs.
7. The Python example showed an incorrect result set. Given the indexed sample documents, querying `"search engine"` matches only document `1`, not `1` and `2`. Corrected the example output comment.
8. The conclusion described the FST store incorrectly as a reverse lookup mechanism. Sonic’s documentation describes RocksDB-backed KV storage for indexed mappings and FST usage for suggestions and typo correction. Updated the explanation.

## Review Notes
- `valeriansaliou/sonic:v1.4.9` still appears to be the latest official Docker tag as of 2026-05-01, but the image has not been updated recently.
- `sonic-client` is a community Python client listed by the Sonic project, not one of Sonic’s officially maintained libraries.
- Search result ordering can vary, so the updated search example uses “for example” for the returned object IDs.
