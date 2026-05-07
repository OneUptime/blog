# Validation Summary: How to Configure Application Bind Addresses for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux socket binding
- Nginx
- Apache HTTP Server
- PostgreSQL
- Redis
- Node.js
- Express
- Flask
- Gunicorn
- Docker Compose
- `ss`

## Sources Consulted
- NGINX `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Apache HTTP Server binding documentation: https://httpd.apache.org/docs/current/bind.html
- PostgreSQL connection settings (`listen_addresses`): https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL `pg_hba.conf` documentation: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- Redis sample configuration (`bind` examples): https://github.com/redis/redis/blob/unstable/redis.conf
- Node.js `net.Server.listen()` documentation: https://nodejs.org/api/net.html
- Express `app.listen()` API: https://expressjs.com/en/4x/api.html#app.listen
- Werkzeug serving documentation: https://werkzeug.palletsprojects.com/en/stable/serving/
- Flask `run()` API: https://flask.palletsprojects.com/en/latest/api/
- Gunicorn `bind` setting documentation: https://docs.gunicorn.org/en/stable/settings.html#bind
- Docker Compose services reference (`ports`): https://docs.docker.com/reference/compose-file/services/
- Docker Engine IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Docker port publishing documentation: https://docs.docker.com/engine/network/port-publishing/
- Local `ss --help` output for the installed iproute2 version

## Issues Found
- The introduction implied that IPv4-only binding typically means `0.0.0.0`. This was corrected to say the application is configured with IPv4-only addresses, which is technically broader and more accurate.
- The Apache example incorrectly presented `Listen 80` plus `Listen [::]:80` as the default dual-stack pattern. Apache documents that `Listen 80` already listens on all interfaces, with IPv4/IPv6 behavior depending on platform and build settings. The snippet was corrected to show `Listen 80`/`Listen 443` as the general case and separate IPv4/IPv6 socket examples only as an explicit alternative.
- The PostgreSQL `pg_hba.conf` example used `::/0` for all IPv6 addresses. PostgreSQL documentation uses `::0/0`, so the example was corrected accordingly.
- The PostgreSQL and Redis verification commands, plus the general verification section, assumed IPv6 listeners would appear specifically as `:::port`. `ss` output formatting varies, and `ss` provides an IPv6 filter directly. The commands were updated to use `ss -6 -tlnp`, and the wording was corrected to look for an IPv6 listener on the expected port rather than one exact text shape.
- The Node.js section created multiple listeners on the same port in one snippet and included an unused `net` import. The example was corrected so the HTTP and Express examples no longer conflict, and the specific-address Express example was converted into a commented alternative.
- The Docker Compose snippet had explicit IPv4/IPv6 mappings and the shorthand `80:80` active at the same time, which would duplicate the same published port if copied verbatim. The shorthand was turned into a commented alternative, and a note was added that Docker IPv6 support must be enabled.
- The conclusion overstated the change as simply moving from `0.0.0.0` to `::`. It was corrected to reflect that IPv6 support means adding an IPv6 listener and, for some applications, keeping a separate IPv4 listener as well.

## Review Notes
- The file paths shown for Apache and PostgreSQL are Debian/Ubuntu-style locations; the configuration syntax is correct, but the exact file paths differ across Linux distributions and package layouts.
- For Redis, `bind` controls which addresses the server listens on, but protected mode and authentication settings still affect whether remote clients can actually connect.
- Node.js dual-stack behavior when listening on `::` depends on OS/socket behavior unless `ipv6Only` is set explicitly.
- Docker IPv6 publishing depends on Docker IPv6 support being enabled on Linux hosts, as documented by Docker.
