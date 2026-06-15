# Validation Summary: How to Configure DNS Caching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS resolution and caching
- systemd-resolved
- dnsmasq
- macOS mDNSResponder and dscacheutil
- Node.js DNS APIs, lru-cache, cacheable-lookup
- Python socket.getaddrinfo
- Go net and net/http
- DNS TTLs and BIND-style zone records
- Browser dns-prefetch and preconnect resource hints

## Sources Consulted
- systemd resolved.conf manual: https://man7.org/linux/man-pages/man5/resolved.conf.5.html
- Local resolved.conf(5), resolvectl --help, dnsmasq --help, and dig -h output
- dnsmasq official manual: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Node.js DNS documentation: https://nodejs.org/api/dns.html
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- lru-cache package documentation: https://github.com/isaacs/node-lru-cache
- cacheable-lookup package documentation: https://github.com/szmarczak/cacheable-lookup
- Python socket documentation: https://docs.python.org/3/library/socket.html
- Go net documentation: https://pkg.go.dev/net
- Go net/http documentation: https://pkg.go.dev/net/http
- MDN dns-prefetch guide: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/dns-prefetch

## Issues Found
- The opening claim said every network request starts with DNS and that uncached DNS happens for every request. I changed it to refer to opening new hostname connections and to mention connection reuse, because DNS resolution is not repeated for every logical request when a connection is reused.
- The systemd-resolved example used `CacheSize`, which is not a documented `resolved.conf` key. I changed it to `DNSCacheSize=8192` and noted that this cache-size option is available in systemd 261+.
- The Node.js example used CommonJS `require()` for `cacheable-lookup`, but the current package is ESM-only. I changed the example to ESM `import` syntax for Node built-ins, `lru-cache`, and `cacheable-lookup`.
- The Python monkey-patch called `socket.getaddrinfo` from inside the cache lookup after replacing `socket.getaddrinfo`, causing recursive calls. I changed the cache to call `_original_getaddrinfo` and to include the original `family`, `type`, `proto`, and `flags` arguments in the cache key and lookup.
- The Go example referenced `http.Transport` and `http.Client` without importing `net/http`. I added the import.
- The Go example included an unused `Dialer()` method that did not implement DNS answer caching and was not used. I removed it to avoid a misleading example.
- The Go example created `client` without using it, which would fail a Go build. I added `_ = client` to keep the sample compile-safe while preserving the placeholder request code.

## Review Notes
JavaScript and Python code blocks were syntax-checked locally. The Go toolchain is not installed in this workspace, so the Go example was reviewed by inspection against the official `net` and `net/http` documentation rather than compiled locally.
