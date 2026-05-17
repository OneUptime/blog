# Validation Summary: How to Set Up Nginx RTMP Server for Live Streaming on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nginx (web server)
- nginx-rtmp-module (RTMP streaming module)
- Ubuntu 20.04 / 22.04
- HLS (HTTP Live Streaming)
- MPEG-DASH
- OBS Studio (encoder)
- FFmpeg (transcoding)
- VLC / ffplay (playback)
- UFW (firewall)
- Python `http.server` (auth callback example)
- cron (scheduled cleanup)

## Sources Consulted
- nginx-rtmp-module wiki / directives: https://github.com/arut/nginx-rtmp-module/wiki/Directives
- Ubuntu jammy package filelist for libnginx-mod-rtmp: https://packages.ubuntu.com/jammy/amd64/libnginx-mod-rtmp/filelist
- Nginx dynamic modules admin guide: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/dynamic-modules/
- Nginx blog on installable packages for dynamic modules: https://blog.nginx.org/blog/creating-installable-packages-dynamic-modules
- Original nginx-rtmp HTTP callbacks introduction: https://rarut.wordpress.com/2012/03/31/nginx-rtmp-introducing-asynchronous-http-callbacks/

## Issues Found

1. **Incorrect `stat.xsl` location for the statistics page.** The post configured `root /usr/share/doc/libnginx-mod-rtmp;`, but the Ubuntu `libnginx-mod-rtmp` package actually ships `stat.xsl` inside the `examples/` subdirectory (`/usr/share/doc/libnginx-mod-rtmp/examples/stat.xsl`). With the original config Nginx would return 404 for `/stat.xsl`. Changed the `root` to `/usr/share/doc/libnginx-mod-rtmp/examples`.

2. **Broken variable substitution in `exec_push`.** The transcoding example used `rtmp://localhost/hls/$name_720p` and `$name_480p`. The nginx-rtmp parser treats identifier characters (letters/digits/underscore) after `$` as part of the variable name, so `$name_720p` is interpreted as a single (undefined) variable `name_720p` and expands to empty. Changed to `${name}_720p` and `${name}_480p` so the stream key from `$name` is correctly concatenated with the literal suffix.

## Review Notes
- `nginx -V 2>&1 | grep rtmp` does work on Ubuntu because the distribution builds the core `nginx` package with an `--add-dynamic-module=...rtmp...` flag referencing the module sources. It is, however, not a universal verification for arbitrary third-party `.so` modules dropped in at runtime — those will not appear in `nginx -V` output. The post's check is fine for the path it walks the reader through.
- `nginx-extras` and `libnginx-mod-rtmp` provide the RTMP module via different mechanisms (statically compiled vs. dynamic module) and conflict on a typical install. A user following the fallback step would normally need to remove `libnginx-mod-rtmp` first, but the post's wording ("If the module does not show up...") is acceptable as fallback guidance.
- The on_publish callback example is correct: nginx-rtmp issues a POST with `application/x-www-form-urlencoded` body containing `name`, `app`, `addr`, `clientid`, `call`, `flashver`, `tcurl`, `pageurl`, etc., and parsing `name` is the canonical way to receive the stream key.
- The `application hls { ... }` block used for transcoded output has no `allow publish`/`deny publish` restrictions, so it will accept publishes from any source by default. Since `exec_push` pushes from localhost this is fine, but tightening with `allow publish 127.0.0.1; deny publish all;` would be a reasonable hardening step.
- The DASH location block does not set MIME types for `.mpd` (`application/dash+xml`) or `.m4s`/`.mp4` segments. Most players tolerate the defaults, but explicit MIME types would be more robust.
- Tutorial targets Ubuntu 20.04 / 22.04; LTS support for 20.04 ends April 2025, so on a fresh 24.04 install the same packages (`libnginx-mod-rtmp` 1.2.2 + nginx 1.24) apply and the instructions remain valid.
