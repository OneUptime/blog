# Validation Summary: Fix Docker Pull x509 Errors on Photon OS Behind Zscaler or a Corporate Proxy

## Status
validated

## Post Type
Troubleshooting guide with shell commands and a systemd configuration example.

## Technologies Covered
- Photon OS 5.0 and RPM CA-certificate packages
- Docker Engine, image pulls, and registry certificate configuration
- X.509 certificates, PEM encoding, and OpenSSL
- Zscaler and corporate TLS-inspecting proxies
- systemd service drop-ins and journal diagnostics
- HTTP_PROXY, HTTPS_PROXY, and NO_PROXY

## Sources Consulted
- [Photon 5.0 CA package specification](https://github.com/vmware/photon/blob/5.0/SPECS/ca-certificates/ca-certificates.spec): bundle path, subpackage ownership, installed utilities, and package-managed files.
- [Docker CA certificate guidance](https://docs.docker.com/engine/network/ca-certs/): separate host and container trust and runtime-specific requirements.
- [Docker daemon reference](https://docs.docker.com/reference/cli/dockerd/#running-a-docker-daemon-behind-an-https_proxy): proxy CA bundle repair, insecure registry behavior, and the Docker Engine 23.0 minimum for direct proxy configuration.
- [Docker daemon proxy configuration](https://docs.docker.com/engine/daemon/proxy/): service environment variables, drop-in syntax, configuration precedence, bypass rules, and restart commands.
- [Docker registry certificates](https://docs.docker.com/engine/security/certificates/): registry directory names, port handling, PEM CA certificates, and extension rules.
- [Docker image pull reference](https://docs.docker.com/reference/cli/docker/image/pull/): command alias, image reference syntax, and daemon proxy use.
- [Distribution token authentication specification](https://distribution.github.io/distribution/spec/auth/token/): separate authorization service requests during pulls.
- [Distribution HTTP API V2 specification](https://distribution.github.io/distribution/spec/api/): redirects to separate layer-download services.
- [RPM command manual](https://rpm.org/docs/4.20.x/man/rpm.8): package query and file-list options.
- [OpenSSL x509 manual](https://docs.openssl.org/3.0/man1/openssl-x509/): certificate input, subject, issuer, output suppression, and SHA-256 fingerprint options.
- [systemd journalctl manual source](https://github.com/systemd/systemd/blob/main/man/journalctl.xml): unit filters, relative time selection, and pager behavior. The rendered freedesktop manual could not be fetched, so upstream source was consulted.
- [GNU Coreutils manual source](https://github.com/coreutils/coreutils/blob/master/doc/coreutils.texi): file copying, concatenation, listing, and UTC date output. The rendered GNU manual could not be fetched, so upstream source was consulted.

## Issues Found
1. **Incomplete Photon package inspection.** The cited Photon 5.0 specification assigns the bundle to `ca-certificates-pki`, while the original commands queried only `ca-certificates`. Updated both RPM commands to include the subpackage and identified its ownership in the text. The bundle path itself was correct.
2. **Unstated administrative context.** The examples write to root-owned system paths and restart a system service without stating the required execution context. Added a brief instruction to run host administration commands in a root shell on the Photon Docker host, and clarified that the procedure assumes a system service.
3. **Missing Docker version boundary.** The proxy precedence explanation did not identify when daemon JSON proxy settings became available. Qualified it for Docker Engine 23.0 and later, as documented by Docker. The systemd environment-variable approach remains appropriate for older installations.

## Review Notes
- Reviewed every shell block and the systemd snippet against the relevant command or configuration documentation. All Bash blocks also passed `bash -n` syntax checks.
- The host/container trust distinction, HTTP proxy URL used for HTTPS destinations, separate routing and trust checks, and multiple pull destinations are technically sound.
- Directly appending the approved CA is documented by Docker. The post correctly limits this to a controlled repair and warns about duplicate entries, newline separation, package updates, and maintaining trust through configuration management.
- Registry-specific certificates are not a guarantee of trust coverage for every separately contacted service. The post appropriately recommends checking authentication and download endpoints as well.
- The Photon package evidence is specifically for the 5.0 branch; inspecting installed packages remains necessary for other releases or customized images. Rootless Docker uses different service configuration paths and is outside the stated system-service procedure.
- All five technical links in the post resolved to the intended official resources. No deprecated commands or options were identified in the examples.
- Validation was documentation-based with shell syntax checks. No corporate certificate was installed, no Docker service was restarted, and no pull through a live Photon/Zscaler environment was performed. The example registry and proxy addresses remain intentional placeholders.
