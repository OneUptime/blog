# Validation Summary: How to Hot-Reload Code Inside a Podman Container

## Status
validated

## Post Type
Tutorial / development workflow guide

## Technologies Covered
- Podman
- Bind mounts and SELinux volume labels
- Node.js, nodemon, webpack-dev-server, Vite, chokidar, watchpack
- Flask, Werkzeug reloader, Django autoreload, Uvicorn, FastAPI, watchfiles
- Go and Air
- Rust and cargo-watch
- .NET and dotnet watch
- Ruby on Rails file watchers
- PHP with Apache/Nginx and OPcache
- Spring Boot DevTools
- entr and inotify-style file watchers
- Compose-style service configuration

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman volume and SELinux labeling documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- nodemon README: https://github.com/remy/nodemon
- webpack watch options: https://webpack.js.org/configuration/watch/
- webpack-dev-server watchFiles documentation: https://webpack.js.org/configuration/dev-server/
- Vite server.watch documentation: https://vite.dev/config/server-options
- Vite troubleshooting documentation: https://vite.dev/guide/troubleshooting
- Werkzeug reloader documentation: https://werkzeug.palletsprojects.com/en/stable/serving/
- Django runserver autoreload and Watchman documentation: https://docs.djangoproject.com/en/5.1/ref/django-admin/#runserver
- Uvicorn settings documentation: https://uvicorn.dev/settings/
- Air README and example TOML: https://github.com/air-verse/air and https://github.com/air-verse/air/blob/master/air_example.toml
- cargo-watch README: https://github.com/watchexec/cargo-watch
- dotnet watch documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- Rails configuration guide: https://guides.rubyonrails.org/v7.2/configuring.html
- Rails ActiveSupport::FileUpdateChecker API: https://api.rubyonrails.org/classes/ActiveSupport/FileUpdateChecker.html
- Spring Boot DevTools documentation: https://docs.spring.io/spring-boot/reference/using/devtools.html

## Issues Found
- The Django section said `DJANGO_WATCHMAN_TIMEOUT=0` could force the stat reloader. Django documents this variable as the Watchman client timeout, not as a switch to force `StatReloader`. I changed the text to explain that stat-based polling is used when Watchman/`pywatchman` are not installed, and changed the example timeout to `10`.
- The Uvicorn section implied `--reload` uses `watchfiles` by default and that installing `watchfiles` is enough for polling. Uvicorn uses `watchfiles` only when available and otherwise polls `*.py` modification times; `watchfiles` polling is controlled with `WATCHFILES_FORCE_POLLING`. I updated the command and explanation accordingly.
- The Spring Boot DevTools example used bare numeric environment values for poll interval and quiet period. Spring Boot documents these settings as durations, with examples such as `2s` and `1s`. I changed the environment values to duration strings.
- The macOS optimization section suggested `.containerignore` reduces bind-mount synchronization scope. Ignore files affect build context, not an already-declared bind mount. I replaced that comment with guidance to keep dependency and build output directories out of bind mounts.

## Review Notes
- The post is technically relevant and code-focused.
- Several version numbers in image tags are older than current latest releases as of 2026-05-07, but they are still plausible pinned examples rather than incorrect commands.
- `cargo-watch` is archived and in maintenance mode, but the documented `--poll` flag remains valid.
- Generic `entr` and `inotifywait` approaches are best suited to environments where filesystem events are available; VM-backed host mounts may still require a polling watcher.
