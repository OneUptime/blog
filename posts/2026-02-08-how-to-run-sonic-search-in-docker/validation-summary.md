# Validation Summary: How to Run Sonic Search in Docker

## Status
validated

## Post Type
Tutorial / Docker deployment guide

## Technologies Covered
- Sonic search backend
- Docker and Docker Compose
- Sonic Channel TCP protocol
- TOML configuration
- Node.js with `sonic-channel`
- Python with `sonic-client`
- PostgreSQL integration example

## Sources Consulted
- Sonic official README: https://github.com/valeriansaliou/sonic
- Sonic official Docker usage notes: https://github.com/valeriansaliou/sonic#install-from-docker-hub
- Sonic official configuration reference: https://github.com/valeriansaliou/sonic/blob/master/CONFIGURATION.md
- Sonic sample `config.cfg`: https://github.com/valeriansaliou/sonic/blob/master/config.cfg
- Sonic Channel protocol reference: https://github.com/valeriansaliou/sonic/blob/master/PROTOCOL.md
- Node `sonic-channel` package documentation: https://www.npmjs.com/package/sonic-channel
- Python `sonic-client` package documentation: https://pypi.org/project/sonic-client/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/

## Issues Found
- The `docker run` example did not mount a Sonic configuration file, but the official Docker image runs `sonic -c /etc/sonic.cfg`. Added a bind mount for `sonic.cfg` and clarified that the file should be created before running the command.
- The Docker CLI bind mount used a local config file, so the command now uses `$(pwd)/sonic.cfg` for an absolute host path.
- The sample config comment for binding to all interfaces was attached to `[server]` instead of `channel.inet`. Moved the comment to the correct setting.
- The sample config used `SecretPassword` in client examples but did not set `channel.auth_password`. Added `auth_password = "SecretPassword"` under `[channel]`.
- The post described `SecretPassword` as Sonic's default password. Sonic's configuration reference says `auth_password` has no default; `SecretPassword` is the sample config value. Updated the note accordingly.
- The Sonic channel summary said the control channel manages flush operations. Sonic protocol documents `FLUSHC`, `FLUSHB`, and `FLUSHO` under ingest mode, while control mode handles commands such as `TRIGGER` and `INFO`. Updated the wording and raw command comments.
- The Node.js example used `controlChannel.consolidate()`, but `sonic-channel` documents `trigger(action)` for control actions. Changed it to `controlChannel.trigger('consolidate')`.
- The Node.js ingest example could call `push()` before the ingest channel finished connecting. Moved `indexProducts()` into the documented `connected` callback flow.
- The Python example used `control.consolidate()`, but `sonic-client` documents `control.trigger("consolidate")`. Updated the example.

## Review Notes
Sonic v1.4.9 remains valid for the examples in the post, but it is version-specific. Future updates could mention checking the current Docker tag before deploying new production systems.
