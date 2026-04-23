# Validation Summary: How to Configure RTMP Streaming Server with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RTMP live streaming
- IPv6 URL and listener syntax
- Nginx
- nginx-rtmp-module
- FFmpeg and FFplay
- HLS file serving
- Linux ip6tables and netfilter-persistent

## Sources Consulted
- Nginx RTMP module README and examples: https://github.com/arut/nginx-rtmp-module
- Nginx RTMP module directives wiki: https://github.com/arut/nginx-rtmp-module/wiki/Directives
- Nginx HTTP core `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx official download page: https://nginx.org/en/download.html
- FFmpeg protocols documentation for RTMP: https://ffmpeg.org/ffmpeg-protocols.html
- FFmpeg formats documentation for HLS muxer options: https://ffmpeg.org/ffmpeg-formats.html#hls-2
- RFC 3986 URI generic syntax for IPv6 literals in square brackets: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- Debian `iptables-persistent` IPv6 plugin source showing `/etc/iptables/rules.v6`: https://sources.debian.org/src/iptables-persistent/1.0.20/plugins/25-ip6tables/
- Ubuntu package metadata for `libnginx-mod-rtmp`: https://packages.ubuntu.com/jammy/libnginx-mod-rtmp

## Issues Found

1. **Invalid IPv6 example literals**: Replaced `2001:db8::streamserver` and `2001:db8::relay` with valid documentation-prefix IPv6 addresses, `2001:db8::10` and `2001:db8::20`. IPv6 literals can only contain hexadecimal hextets, and RFC 3849 reserves `2001:db8::/32` for documentation examples.

2. **Outdated and insecure Nginx source download**: Updated the source-build example from `http://nginx.org/download/nginx-1.24.0.tar.gz` to `https://nginx.org/download/nginx-1.30.0.tar.gz`, matching the current stable Nginx version listed on the official download page at validation time and using HTTPS.

3. **Missing package index update**: Added `sudo apt update` before the `apt install nginx libnginx-mod-rtmp` command so the install snippet works reliably on a fresh Debian/Ubuntu system.

4. **Ambiguous IPv4/IPv6 listener comments**: Reworded the RTMP listener comment and made the IPv6 RTMP and HTTP listeners explicit with `ipv6only=on`, matching the documented Nginx and nginx-rtmp `listen` syntax.

5. **Inaccurate access-control comment**: Changed the comment above `allow publish all;` and `allow play all;` because `all` allows both IPv4 and IPv6 clients, not only IPv6 clients.

6. **Incomplete RTMP statistics stylesheet configuration**: Added a `/stat.xsl` location pointing to the packaged `stat.xsl` example path so `rtmp_stat_stylesheet stat.xsl;` can resolve correctly for browser-rendered statistics.

7. **Incorrect firewall persistence command**: Replaced `sudo ip6tables-save > /etc/ip6tables/rules.v6` with `iptables-persistent` installation and `sudo netfilter-persistent save`. The original path is not the Debian/Ubuntu persistence path, and shell redirection after `sudo` would not write as root.

8. **HLS output directory prerequisite missing**: Added `sudo install -d -o "$USER" -m 0755 /var/www/html/hls` before the FFmpeg HLS command so the target directory exists and is writable by the invoking user.

## Review Notes
- The Nginx RTMP directives used in the post (`rtmp`, `server`, `listen`, `application`, `live`, `record`, `allow`, `play`, `push`, `rtmp_stat`, and `rtmp_stat_stylesheet`) match the nginx-rtmp-module documentation.
- `allow publish all;` is technically valid but unsafe for production public servers. A future security-focused revision should add publisher authentication or source allowlisting.
- The HLS HTTP location serves files produced by the later FFmpeg HLS command. Native nginx-rtmp HLS generation would require `hls on;` and `hls_path` in an RTMP application.
- `netstat` remains usable when `net-tools` is installed, but `ss` is the preferred modern Linux socket inspection tool.
- If readers build nginx-rtmp from source instead of using the Debian/Ubuntu package, they may need to copy `stat.xsl` into the configured `/stat.xsl` root path.
