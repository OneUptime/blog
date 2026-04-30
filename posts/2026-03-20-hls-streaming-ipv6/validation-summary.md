# Validation Summary: How to Configure HLS Streaming with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HLS
- IPv6
- Nginx
- nginx-rtmp-module
- FFmpeg
- hls.js
- Cloudflare
- AWS CloudFront
- `ip6tables`
- `curl`
- `ss`

## Sources Consulted
- RFC 8216, HTTP Live Streaming: https://www.rfc-editor.org/rfc/rfc8216.html
- RFC 3986, Uniform Resource Identifier (URI): Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- NGINX `listen` directive docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- NGINX `add_header` directive docs: https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header
- nginx-rtmp-module README: https://github.com/arut/nginx-rtmp-module
- nginx-rtmp-module Directives wiki: https://github.com/arut/nginx-rtmp-module/wiki/Directives
- FFmpeg HLS muxer docs: https://ffmpeg.org/ffmpeg-formats.html
- hls.js README: https://github.com/video-dev/hls.js
- Cloudflare DNS record types: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
- Cloudflare proxy status docs: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare IP addresses docs: https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/
- AWS CloudFront IPv6 docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html
- Local CLI help: `ffmpeg -hide_banner -h muxer=hls`, `curl --help all`, `ss -h`, `ip6tables -h`

## Issues Found
- The intro implied HLS over IPv6 depends on generating special IPv6-aware playlist URLs. RFC 8216 allows relative URIs in playlists, and RFC 3986 requires brackets only when a literal IPv6 address appears in a URL. I corrected that explanation.
- The nested Nginx `.m3u8` location added its own `add_header`, which prevents inherited `add_header` values from applying at that level in NGINX. That would drop the CORS header on playlist responses. I added `Access-Control-Allow-Origin` inside the nested playlist location.
- The multi-bitrate FFmpeg example was malformed. It used `-map a:0`, which is not valid stream-selection syntax, mapped only one video/audio pair while using `%v` output naming, and did not provide distinct variant outputs for `var_stream_map`. I replaced it with a working two-variant HLS command and verified the corrected syntax with a local FFmpeg run.
- The `ip6tables-save > /etc/ip6tables/rules.v6` command used a distro-specific path that is not generally valid. I changed it to `ip6tables-save` with a note that persistence depends on the distribution.
- The hls.js example instantiated `Hls` unconditionally and used `@latest`. The official hls.js usage checks `Hls.isSupported()` and falls back to native HLS playback when available. I updated the snippet to that supported pattern and pinned the CDN reference to the current major line.
- The Cloudflare section pointed readers to Cloudflare Stream live inputs, which is a managed streaming product rather than configuration of a CDN in front of their own HLS origin. I corrected the guidance to Cloudflare proxy/DNS behavior that actually applies to an HLS origin.
- The CloudFront bullets overstated IPv6 behavior by implying viewers always receive content via IPv6 once enabled. AWS documents that viewer IPv6 is optional and CloudFront may still use IPv4 for some viewer requests, while origin connectivity must be configured separately as IPv4-only, IPv6-only, or dual-stack. I corrected those bullets.
- The conclusion claimed HLS over IPv6 only requires `listen [::]:80`. That omits the firewall, DNS/CDN origin connectivity, and bracketed literal-URL requirements. I corrected the closing explanation.

## Review Notes
- The Nginx RTMP configuration assumes the third-party `nginx-rtmp-module`; the `rtmp {}` block is not part of core NGINX.
- The example IPv6 addresses remain in the `2001:db8::/32` documentation prefix, which is appropriate for a blog post and should not be used as live routable addresses.
- I verified the corrected multi-variant FFmpeg command syntax locally with synthetic audio/video inputs. I did not stand up a full Nginx/RTMP/CDN environment in this workspace.
