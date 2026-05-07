# Validation Summary: How to Run Memcached in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Memcached
- Docker Official Memcached image
- Memcached text protocol
- Python
- pymemcache
- Netcat

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman container inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Docker Official Image for Memcached: https://hub.docker.com/_/memcached/
- Memcached configuring guide: https://docs.memcached.org/serverguide/configuring/
- Memcached basic text protocol documentation: https://docs.memcached.org/protocols/basic/
- pymemcache Client API documentation: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.base.html

## Issues Found
- The tuning verification command checked `curr_connections`, which reports the current number of active connections and does not verify the configured maximum connection limit. Changed it to use `stats settings` and grep for `maxbytes`, `maxconns`, and `num_threads`, which correspond to the configured memory, connection, and thread settings.

## Review Notes
- Podman and Memcached were not installed in the local environment, so CLI flags and behavior were verified against official documentation instead of local `--help` output.
- The Memcached `-m` value limits item storage memory, not total process memory. The post's separate Podman `--memory` example correctly demonstrates container-level memory limiting.
