# Validation Summary: How to Fix 'Network Latency' Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DNS and CoreDNS
- TCP, TLS, Linux networking, and sysctl
- curl, dig, ping, MTR, traceroute, netstat, and ss
- Python requests and urllib3 retries
- Go net/http and net.Dialer
- NGINX upstream keepalive
- JavaScript fetch and Promise.all
- Cloudflare Workers, Wrangler, and Cache API
- Prometheus alerting and PromQL

## Sources Consulted
- curl write-out documentation: https://everything.curl.dev/usingcurl/verbose/writeout.html
- Requests HTTPAdapter API documentation: https://requests.kennethreitz.org/en/stable/api/
- Go net/http package documentation: https://pkg.go.dev/net/http
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Cloudflare Wrangler configuration documentation: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Workers fetch handler documentation: https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/
- Cloudflare Workers Context API documentation: https://developers.cloudflare.com/workers/runtime-apis/context/
- Cloudflare Workers Cache API documentation: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Local command help for curl, dig, ping, mtr, netstat, and ss.

## Issues Found
- The application reuse section was titled "Use DNS Connection Reuse", and the Go example comment said `net.Dialer` provided DNS caching. Changed this to "Use HTTP Connection Reuse in Applications" and clarified that connection reuse reduces repeated DNS lookups when new connections are avoided; `net.Dialer` itself does not cache DNS.
- The Python requests example said DNS was resolved once per connection pool. Updated the comment to state that DNS lookups happen when new connections are opened.
- The Linux sysctl snippet grouped `tcp_fin_timeout` and `tcp_tw_reuse` under "Reduce TIME_WAIT connections". Updated the comment to describe connection teardown and TIME_WAIT reuse more accurately and added caution because current Linux kernel documentation recommends care with global `tcp_tw_reuse`.
- The JavaScript Promise.all example described parallel requests as "1x network round trip". Changed the comment to explain that the requests overlap in wall-clock time rather than becoming a single network round trip.
- The Go request coalescer could panic because `c.inflight` was never initialized before assignment. Added lazy map initialization inside `Do`.
- The Cloudflare Workers example used one `yaml` code block for both `wrangler.toml` and `worker.js`, used deprecated/legacy Wrangler configuration shape, and referenced `event.waitUntil` outside its scope. Split it into TOML and JavaScript blocks, added current `main` and `compatibility_date` Wrangler fields, used `[[routes]]`, and changed the Worker to module syntax with `ctx.waitUntil`.

## Review Notes
The JavaScript Worker snippet was syntax-checked locally with Node. Go tooling was not installed in the environment, so the Go snippets were reviewed against official Go documentation rather than compiled locally.
