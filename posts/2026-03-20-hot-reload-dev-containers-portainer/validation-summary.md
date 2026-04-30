# Validation Summary: How to Set Up Hot Reload for Development Containers in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Docker bind mounts and volumes
- Node.js
- nodemon
- Python
- Uvicorn
- watchfiles
- Go
- Air
- Rust
- cargo-watch
- PHP CLI built-in web server
- .NET file watching

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker inline cache documentation: https://docs.docker.com/build/cache/backends/inline/
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path support documentation: https://docs.portainer.io/advanced/relative-paths
- Portainer container logs documentation: https://docs.portainer.io/user/docker/containers/logs
- Portainer `.env` vs `stack.env` documentation: https://docs.portainer.io/faqs/troubleshooting/environment-variable-management-in-docker-.env-vs.-stack.env
- Nodemon package documentation: https://www.npmjs.com/package/nodemon
- Uvicorn settings documentation: https://www.uvicorn.org/settings/
- Uvicorn installation documentation: https://uvicorn.dev/installation/
- watchfiles polling documentation: https://watchfiles.helpmanual.io/api/watch/
- Air project documentation: https://github.com/air-verse/air
- Air example configuration: https://github.com/air-verse/air/blob/master/air_example.toml
- cargo-watch project documentation: https://github.com/watchexec/cargo-watch
- PHP built-in web server documentation: https://www.php.net/commandline.webserver
- .NET `dotnet watch` documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- watchpack package documentation: https://www.npmjs.com/package/watchpack

## Issues Found
- The introduction incorrectly equated hot reload with hot module replacement. I changed the wording to describe hot reload as being used interchangeably with live reload, which is the accurate umbrella for the rest of the post.
- The bind mount examples used relative host paths and implied they were generically appropriate in Portainer. I replaced them with absolute Docker-host paths because Portainer's relative path support is deployment-mode specific.
- The anonymous-volume explanation said the mount "masks" the directory on the host. I corrected this to the container path, which is what Docker actually obscures.
- The Node.js example mixed a CLI entrypoint for `src/index.js` with a `nodemon.json` that executes `src/index.ts`. I changed the container command to `npx nodemon` so the documented config file is the source of truth.
- The Python section was labeled `watchdog/uvicorn`, but current Uvicorn reload behavior is based on `watchfiles` when installed. I renamed the section and updated the example to install `uvicorn[standard]` so the command shown is runnable in the stated base image.
- The Go examples used `golang:1.22-alpine`, but the current Air documentation requires Go 1.25 or higher for `github.com/air-verse/air@latest`. I updated both Go image tags to `golang:1.25-alpine`.
- The Go and Rust snippets used named volumes without declaring them. I added the missing top-level `volumes` declarations so the Compose examples are valid.
- The Rust example invoked `cargo watch` even though the base Rust image does not include `cargo-watch`. I updated the command to install the tool before running it.
- The PHP built-in server example omitted `-t public`, so the document root was not set correctly for the common `public/index.php` pattern. I fixed the command to use the proper document root and router script form.
- The permissions section claimed file permissions stop watch events from triggering and suggested generic `PUID`/`PGID` environment variables. I corrected this to the portable `user: "${UID}:${GID}"` approach and reframed the issue as UID/GID mismatch on bind mounts.
- The polling section said `inotify` "doesn't work" on Docker Desktop/NFS and suggested Uvicorn's `--reload-delay` as the fix. I replaced that with the current `WATCHFILES_FORCE_POLLING` and `WATCHFILES_POLL_DELAY_MS` guidance from Uvicorn/watchfiles docs.
- The optimized Compose section used the obsolete top-level `version` field and contained misleading comments about `BUILDKIT_INLINE_CACHE`, bind-mount consistency, and Node startup speed. I removed the obsolete `version` lines and corrected the comments to match current Docker behavior.

## Review Notes
- No remaining technical blockers after the fixes.
- `cargo-watch` is still usable for the documented command pattern, but its upstream repository is archived as of January 18, 2025. A future refresh of the post may want to evaluate a more actively maintained Rust watcher.
- Portainer's current documentation still notes limited support for building images directly from Git-deployed Compose stacks. The post's main Portainer deployment example already uses prebuilt images, which avoids that limitation.
