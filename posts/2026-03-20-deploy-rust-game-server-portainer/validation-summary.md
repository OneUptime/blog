# Validation Summary: How to Deploy a Rust Game Server via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust dedicated server
- Portainer
- Docker Compose
- Docker CLI
- uMod/Oxide
- RCON

## Sources Consulted
- Facepunch Rust Wiki, "Creating a server": https://wiki.facepunch.com/rust/Creating-a-server
- Facepunch Rust Wiki, "Getting started with your rust server": https://wiki.facepunch.com/rust/Getting-Started_w-Server
- Facepunch Rust Wiki, "Creating a hidden, whitelisted server": https://wiki.facepunch.com/rust/Creating_a_hidden_whitelisted_server
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, "Edge Jobs": https://docs.portainer.io/2.33-lts/user/edge/jobs
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, `docker exec`: https://docs.docker.com/engine/reference/commandline/exec
- Docker Docs, `docker stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker Docs, `docker start`: https://docs.docker.com/reference/cli/docker/container/start
- Docker Docs, `docker run`: https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs, Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- uMod Docs, "Plugin installation": https://umod.org/documentation/plugins/installation
- Didstopia `rust-server` repository: https://github.com/Didstopia/rust-server
- Didstopia `start_rust.sh`: https://raw.githubusercontent.com/Didstopia/rust-server/master/start_rust.sh
- Didstopia `Dockerfile`: https://raw.githubusercontent.com/Didstopia/rust-server/master/Dockerfile

## Issues Found
- The compose example used invalid image environment variables: `RUST_QUERY_PORT` and `RUST_SERVER_SAVEINTERVAL`. These were corrected to `RUST_SERVER_QUERYPORT` and `RUST_SERVER_SAVE_INTERVAL` to match the image's documented and implemented variables.
- The compose example overwrote the image's default startup arguments with an incomplete value that dropped `-nographics` and `+server.secure 1`. This was corrected so the startup arguments match the image defaults documented in the image source.
- The post relied on `/steamcmd/rust/server/rust/cfg/server.cfg` without setting `server.identity`. `RUST_SERVER_IDENTITY=rust` was added so the documented config path is correct.
- The networking example exposed `28015/tcp`, but Facepunch documents the game port as UDP. The TCP mapping was removed, and the query port was set explicitly to `28017/udp` so the example aligns with Rust's documented query-port behavior when RCON uses `28016`.
- The top-level Compose `version: "3.8"` field is obsolete in current Compose. It was removed to avoid outdated configuration guidance.
- The named volume was later referenced as plain `rust-data`, but Compose normally scopes volume names by project. A custom volume name was added so the later maintenance commands consistently target the actual volume.
- The plugin installation commands used a hard-coded host path under `/var/lib/docker/volumes/...`, which assumes Docker's default data-root and a specific host layout. These were changed to `docker exec rust-server ...` commands that write directly into the mounted plugin directory inside the container.
- The wipe instructions referred to a generic "Portainer scheduled job", but current Portainer scheduling is documented as Edge Jobs for supported Docker Standalone environments. The wording was corrected accordingly.
- The wipe script used an unstable generated container name (`rust_rust_1`) and deleted nonexistent `user.seed.map` and `user.seed.db` files. The script was corrected to use the explicit container name and to delete Rust world `*.map` and `*.sav*` files from the named volume.
- The wipe script implied it updated the map seed automatically, but it did not. The note was corrected to say the seed should be updated in Portainer before restarting.
- The RCON section used a generic `rcon -H ...` client invocation that was not documented by the chosen image and depended on an unmapped TCP port. It was replaced with the image's documented bundled `rcon` relay via `docker exec rust-server rcon ...`.
- The `server.cfg` example included comment lines and inline comments. These were removed so the snippet is safe to paste as plain Rust convar lines.

## Review Notes
- The article now accurately reflects a Docker Standalone deployment managed through Portainer. It is not written for Docker Swarm.
- The image used in the post is a third-party container, not an official Facepunch image. The corrected post now matches that image's documented environment variables and bundled RCON workflow.
- I did not run the stack or the Docker commands locally because `docker` is not installed in this review environment. The fixes were validated against official Docker, Portainer, Facepunch, uMod, and image-source documentation.
