# Validation Summary: How to Tune PHP-FPM for Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- PHP-FPM (FastCGI Process Manager) 8.3
- Ubuntu
- OPcache (including JIT)
- Nginx (FastCGI integration)
- Apache Bench (`ab`)
- Linux kernel parameters (`net.core.somaxconn`)
- `ps` / `awk` for memory diagnostics

## Sources Consulted
- PHP-FPM official configuration reference: https://www.php.net/manual/en/install.fpm.configuration.php
- PHP-FPM global configuration: https://www.php.net/manual/en/install.fpm.configuration.php#configuration.section.global
- OPcache configuration directives: https://www.php.net/manual/en/opcache.configuration.php
- OPcache JIT: https://wiki.php.net/rfc/jit (and php.net opcache.jit docs)
- procps-ng `ps(1)` man page (`--sort` syntax)
- Linux `listen(2)` man page (backlog/somaxconn behavior)
- Nginx FastCGI module docs: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html

## Issues Found
1. **Incorrect `ps --sort` syntax.** The post used `ps -ylC php-fpm8.3 --sort:rss`. The `--sort:rss` form is silently ignored by procps-ng `ps` (no error, but no sort). The correct GNU-style syntax is `--sort=-rss`. Fixed both occurrences (worker-count calculation block and the diagnostic script).

2. **Off-by-one in the awk average.** `ps -ylC` emits a header row, so `awk '{ sum+=$8 } END { print sum/NR/1024 }'` divides by N+1 instead of N. Updated to `awk 'NR>1 { sum+=$8 } END { print sum/(NR-1)/1024 }'` in both places to skip the header consistently in both sum and divisor.

3. **Timeout Settings section conflated pool and global FPM settings.** `emergency_restart_threshold`, `emergency_restart_interval`, and `process_control_timeout` are global settings that must live in `php-fpm.conf`, not in a pool file. The previous block put them alongside `request_terminate_timeout` (a pool setting) under one heading. Split into two clearly-labelled snippets pointing at the correct files.

4. **Misleading comment on `process_control_timeout`.** The original comment claimed it should be `>= request_terminate_timeout` and described it as "Timeout for child process to stop gracefully during shutdown". `process_control_timeout` actually bounds how long the master waits for children to react to signals (reload/stop) — it has no relationship to request termination. Replaced with an accurate one-line description.

5. **Wrong comment on `opcache.revalidate_freq`.** The original said `0 = never check, requires restart to update`. Per the PHP docs, `opcache.revalidate_freq = 0` means *check on every request* (when `validate_timestamps = 1`); the "never check" behavior comes from `opcache.validate_timestamps = 0`. Rewrote the comments on both directives to attribute each behavior to the correct directive.

## Review Notes
- The default `net.core.somaxconn` on modern Ubuntu kernels (Linux 5.4+, so 20.04+) is 4096, not 128. The post hedges with "If it's 128 (default), increase it", which still reads correctly because the user checks the actual value first, so left as-is.
- `listen.backlog = 511` matches PHP-FPM's built-in default on Linux; explicitly setting it is harmless and good documentation.
- The post uses PHP 8.3 paths throughout. Users on PHP 8.2 / 8.4 will need to swap version numbers in paths and service names. This is conventional and not an error.
- `pm.max_spare_servers` example value (12) is consistent with the "max_children * 0.4" rule of thumb against the example `max_children = 30`.
- Quick diagnostic script's `opcache_get_status(false)` correctly omits the per-script details for a lighter snapshot; the keys referenced (`memory_usage.used_memory`, `memory_usage.free_memory`, `opcache_statistics.num_cached_scripts`, `opcache_statistics.opcache_hit_rate`) all exist in current OPcache.
- OPcache JIT value `tracing` is valid (alias for the numeric tri-digit form). 128M JIT buffer is reasonable for a non-trivial app.
