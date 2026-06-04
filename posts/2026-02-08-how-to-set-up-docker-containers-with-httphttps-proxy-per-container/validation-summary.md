# Validation Summary: How to Set Up Docker Containers with HTTP/HTTPS Proxy Per Container

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Dockerfile build arguments
- HTTP/HTTPS proxy environment variables
- Squid proxy
- Node.js
- Python Requests
- Go net/http
- Java networking system properties
- Linux container CA certificate installation

## Sources Consulted
- Docker Docs: Use a proxy server with the Docker CLI, https://docs.docker.com/engine/cli/proxy/
- Docker Docs: Daemon proxy configuration, https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Dockerfile reference / predefined ARGs, https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose file reference, https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose services reference for `environment` and `env_file`, https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version top-level element, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI local help output for `docker run` and `docker build`
- everything curl: Proxy environment variables, https://everything.curl.dev/usingcurl/proxies/env.html
- GNU Wget manual: Proxies, https://www.gnu.org/software/wget/manual/html_node/Proxies.html
- Node.js HTTP API documentation: built-in proxy support, https://nodejs.org/api/http.html
- Requests documentation: Advanced Usage / Proxies, https://requests.readthedocs.io/en/stable/user/advanced/
- Go net/http package documentation: `ProxyFromEnvironment`, https://pkg.go.dev/net/http
- Oracle Java networking properties, https://docs.oracle.com/en/java/javase/15/docs/api/java.base/java/net/doc-files/net-properties.html

## Issues Found
- The post said `wget` uses uppercase proxy environment variables. GNU Wget documents lowercase `http_proxy`, `https_proxy`, and `no_proxy`, and curl requires lowercase `http_proxy` for HTTP proxying. Updated the wording to avoid the incorrect wget claim.
- The Compose examples used the top-level `version: "3.8"` key. Current Docker Compose treats the `version` property as obsolete and only informative, so the examples now omit it.
- The Dockerfile example declared `ARG HTTP_PROXY`, `ARG HTTPS_PROXY`, and `ARG NO_PROXY`, while also saying this was just for readability. Docker documents these as predefined proxy build arguments that do not need declarations, and declaring/referencing them can expose values in build history and affect cache behavior. Removed the declarations and added the caveat.
- The `NO_PROXY` examples used CIDR ranges as a general recommendation. Because clients parse `NO_PROXY` differently and there is no universal standard, added a caveat to test CIDR, wildcard, and suffix behavior with the actual client tools in the container.
- The Node.js section said the `http` and `https` modules do not automatically use proxy environment variables and showed `fetch(..., { agent })`. Current Node.js has built-in proxy support when enabled with `NODE_USE_ENV_PROXY=1` or `--use-env-proxy`, and native `fetch` does not use the shown `agent` option. Updated the text and replaced the example with `https.get` using `https-proxy-agent`.
- The Java note only showed `http.proxyHost` and `http.proxyPort`. Java HTTPS connections use separate `https.proxyHost` and `https.proxyPort` properties, so the example now includes both HTTP and HTTPS properties.

## Review Notes
The post is technically relevant and remains valid after the corrections. Proxy environment variable handling is intentionally inconsistent across clients, so future updates should avoid implying uniform `NO_PROXY` matching behavior across all languages and tools.
