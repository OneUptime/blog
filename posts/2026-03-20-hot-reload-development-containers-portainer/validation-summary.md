# Validation Summary: How to Set Up Hot Reload for Development Containers in Portainer - Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Bind mounts and volumes
- Node.js / nodemon
- Python / Uvicorn / watchdog
- Go / Air
- Rust / cargo-watch
- Spring Boot DevTools
- Ruby on Rails
- .NET `dotnet watch`
- PHP built-in development server
- Linux `inotify`

## Sources Consulted
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Define and manage volumes in Docker Compose: https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs, Synchronized file shares: https://docs.docker.com/desktop/features/synchronized-file-sharing/
- Docker Docs, docker service create mount consistency options: https://docs.docker.com/reference/cli/docker/service/create/
- Portainer Docs, View container logs: https://docs.portainer.io/user/docker/containers/logs
- Portainer Docs, Relative path support: https://docs.portainer.io/advanced/relative-paths
- Uvicorn settings: https://www.uvicorn.org/settings/
- watchdog documentation: https://python-watchdog.readthedocs.io/
- watchdog GitHub repository: https://github.com/gorakhargosh/watchdog
- Air GitHub repository: https://github.com/air-verse/air
- cargo-watch GitHub repository: https://github.com/watchexec/cargo-watch
- Spring Boot Developer Tools: https://docs.spring.io/spring-boot/reference/using/devtools.html
- Spring Boot Maven plugin run goal: https://docs.spring.io/spring-boot/maven-plugin/run.html
- Spring Boot Gradle plugin running docs: https://docs.spring.io/spring-boot/gradle-plugin/running.html
- Ruby on Rails Guides, Autoloading and Reloading Constants: https://guides.rubyonrails.org/v7.1/autoloading_and_reloading_constants.html
- .NET `dotnet watch` command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- PHP manual, built-in web server: https://www.php.net/commandline.webserver
- Linux kernel docs, `/proc/sys/fs` sysctls: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/fs.html

## Issues Found
- The `watchmedo auto-restart` example omitted the `--` separator before the child command. I added it so the command matches the documented CLI pattern.
- The Spring entry implied DevTools was simply automatic with the dependency alone. I changed it to a runnable `spring-boot:run` / `bootRun` pattern with DevTools, because Spring Boot DevTools restarts on classpath changes after recompilation.
- The Rails entry said `rails server` "always reloads". I corrected this to `bin/rails server` and clarified that reloading happens in development between requests.
- The PHP entry overstated the behavior by saying PHP reads files on each request. I narrowed this to "development server" to keep the guidance accurate without overclaiming.
- The Compose example used `version: "3.8"`, which current Docker docs mark as obsolete. I removed the `version` field.
- The bind-mount examples used relative host paths like `./src`. I changed them to host-path placeholders because Portainer-specific relative path support is limited and not safe as general guidance.
- The inotify section used an arbitrary "below 100000" threshold. I changed the wording to say the limit should be increased if the project needs more watches, keeping the example command as an example rather than a rule.
- The macOS section recommended `:delegated` / `:cached` as a blanket performance fix. I replaced that guidance with Docker Desktop Synchronized file shares, since current Docker docs document that as the supported optimization for large bind-mounted codebases and consistency options can trade off change visibility.
- The Portainer section referred to **Follow** in the logs view. Current Portainer docs describe **Auto refresh**, so I updated the UI wording.

## Review Notes
- The bind mount and anonymous volume patterns are technically sound for development containers.
- `air`, `cargo-watch`, `nodemon`, `uvicorn --reload`, and `dotnet watch run` are all valid current commands, but installation and project-specific configuration are intentionally out of scope for this post.
- Docker now also supports Compose watch / develop workflows, but the post’s bind-mount-plus-framework-watcher approach remains technically relevant for Portainer-managed development containers.
