# Validation Summary: How to Use Docker Desktop File Sharing Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Desktop
- Docker Engine bind mounts and volumes
- Docker Compose
- macOS file sharing backends: VirtioFS, gRPC FUSE, osxfs
- Windows WSL 2 Docker Desktop backend
- Node.js dependency mounts
- webpack-dev-server file watching
- nodemon file watching
- Alpine Linux package installation

## Sources Consulted
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Engine bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Desktop WSL 2 best practices: https://docs.docker.com/desktop/features/wsl/best-practices/
- Docker Desktop WSL 2 backend documentation: https://docs.docker.com/desktop/features/wsl/
- Docker Desktop synchronized file shares documentation: https://docs.docker.com/desktop/features/synchronized-file-sharing/
- webpack-dev-server configuration documentation: https://webpack.js.org/configuration/dev-server/
- webpack watch options documentation: https://webpack.js.org/configuration/watch/
- nodemon documentation: https://github.com/remy/nodemon

## Issues Found
- The post omitted `/Volumes` from Docker Desktop's default macOS shared directories. Updated the default list to include `/Volumes`, matching Docker Desktop settings documentation.
- The shared-directory section said Docker Desktop only allows mounting explicitly shared directories without platform scope. Updated the sentence to clarify this behavior is for macOS in this context; Docker's current settings documentation scopes virtual file shares to Mac, Linux, and Windows Hyper-V, while WSL 2 has separate filesystem behavior.
- The webpack-dev-server `watchFiles` example used an `options` object without `paths`. Updated the snippet to include `paths: ["src/**/*"]`, matching the documented object form for `devServer.watchFiles`.
- The `nodemon.json` example was fenced as JSON but contained a JavaScript-style comment. Removed the comment so the JSON snippet is syntactically valid.
- The troubleshooting command `docker info --format '{{json .DockerRootDir}}'` was labeled as a way to verify shared directories, but it only prints Docker's root directory. Replaced it with a note that shared directories must be confirmed in Docker Desktop settings.
- The `inotifywait` troubleshooting command used Alpine but did not install `inotifywait`. Updated the command to install `inotify-tools` before running `inotifywait`.

## Review Notes
The Docker Compose consistency examples are platform-specific, which matches Docker Compose's current documentation for the `consistency` mount field. Docker Desktop now also offers Synchronized file shares for large repositories on eligible subscriptions; this does not invalidate the post, but it is a related feature worth mentioning in a future broader update.
