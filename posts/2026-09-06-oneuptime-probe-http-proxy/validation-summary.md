# Validation Summary: How to Run a OneUptime Probe Through an HTTP Proxy

## Status
validated

## Post Type
Guide / configuration and troubleshooting tutorial.

## Technologies Covered
- OneUptime custom probes, version 12.0.33
- Docker Compose and container networking
- HTTP and HTTPS proxies, CONNECT, and proxy authentication
- NO_PROXY bypass matching
- Node.js TLS certificate trust
- curl diagnostics and protocol-specific monitoring

## Sources Consulted
- [OneUptime custom probes](https://oneuptime.com/docs/en/probe/custom-probe): registration UI, image example, environment variables, authentication, and documented monitor support.
- [OneUptime 12.0.33 configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/config.example.env): bundled probe proxy variables. Read from the local repository's version tag because web retrieval failed.
- [Probe environment configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Config.ts), [proxy implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Utils/ProxyConfig.ts), and [control-plane HTTP client](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Utils/ProbeAPIRequest.ts): inspected at the local 12.0.33 tag.
- [Monitor implementations](https://github.com/OneUptime/oneuptime/tree/12.0.33/Probe/Utils/Monitors/MonitorTypes): Website, API, SSL, Synthetic, Ping, Port, DNS, and SNMP transport handling, inspected at the local version tag.
- [Probe authentication service](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/ProbeService.ts): authentication against the probe's single stored key.
- [Logger](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Logger.ts) and [log redaction](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/LogRedaction.ts): checked URL credential redaction before assessing credential exposure.
- [Private network access documentation source](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/self-hosted/private-network-access.md): read from the local tag after the public documentation URL failed to load.
- [Docker Compose service reference](https://docs.docker.com/reference/compose-file/services/): environment mapping, image, restart policy, and networking.
- [Docker Compose up](https://docs.docker.com/reference/cli/docker/compose/up/) and [logs](https://docs.docker.com/reference/cli/docker/compose/logs/): command flags and recreation behavior.
- [Docker container run](https://docs.docker.com/reference/cli/docker/container/run/): sharing an existing container's network namespace.
- [curl manual](https://curl.se/docs/manpage.html) and [official curl container repository](https://github.com/curl/curl-container): proxy, authentication prompt, bypass, CA, verbose output, and diagnostic image.
- [Node.js NODE_EXTRA_CA_CERTS](https://nodejs.org/api/cli.html#node_extra_ca_certsfile): PEM CA bundle loading at process startup.
- [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html): CONNECT semantics and 407 Proxy Authentication Required.

## Issues Found
1. The diagnostic text promised the probe's network namespace, but the command ran curl on the host. Replaced it with a temporary curl container using Docker's container network mode and the Compose service container ID. Added interactive proxy authentication and explicit proxy use, plus the necessary image availability and separate CA/environment caveats. Clarified that fetching the site does not validate probe API authentication or result ingestion.
2. Installing a CA into an unspecified image trust store does not reliably configure Node.js trust. Specified a mounted PEM bundle and NODE_EXTRA_CA_CERTS set before process startup.
3. Credential rotation assumed that old and new probe keys could overlap and that a restart would apply changed environment values. Distinguished proxy-account overlap from the single stored OneUptime probe key, required coordinated probe-key deployment, and specified container recreation for changed proxy environment values.
4. The protocol caveat could imply that HTTP CONNECT cannot carry raw TCP. Clarified that TCP requires client tunneling support and proxy permission, while ICMP and UDP are not automatically handled by ordinary CONNECT or these proxy variables.
5. The Compose example did not identify where to save the configuration or supply its interpolated credentials. Added compose.yaml and shell/.env prerequisites so the following commands are actionable.

## Review Notes
- Validated the extracted Compose YAML with docker compose -f - config --quiet using dummy probe credentials; it passed. Both Bash blocks passed bash -n. No containers were started and no live monitoring or proxy authentication tests were performed.
- The release image tag is mutable and is not a guarantee of version 12.0.33. The existing advice to pin the tested digest is correct; this review verifies the named source version rather than a deployed image digest.
- Version 12.0.33's HTTP proxy matcher supports exact hosts, optional ports, leading-dot or wildcard domain suffixes, and a global wildcard. It does not implement CIDR subnet matching. Synthetic browser bypass uses a separate implementation, so retaining the advice to test critical patterns is appropriate.
- The Compose service uses default bridge networking. Internal destinations must be reachable and resolvable from that container; localhost refers to the container, not the Docker host. Host networking in the official example is not mandatory for ordinary reachable HTTP targets.
- The documentation broadly advertises all-monitor proxy support, but the versioned code uses protocol-specific transports. The post appropriately requires separate validation of assigned monitor types.
- The logger applies URL password redaction; seeing proxy URLs passed into logger.info alone would not establish plaintext password exposure. Existing advice about environment inspection, secret handling, and redacting diagnostic output remains appropriate.
- The private-network documentation URL is plausible and has a matching versioned source file, but its live availability could not be confirmed by the web tool. The author profile and example domains were not treated as deployment endpoints.
