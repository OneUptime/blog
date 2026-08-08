# Validation Summary: Configure Gel TLS in Docker With Mounted Certificate Files

## Status
validated

## Post Type
Technical guide / deployment and security tutorial

## Technologies Covered
- Gel server and Gel CLI
- EdgeDB-to-Gel v6 naming compatibility
- TLS and X.509 certificates
- Docker and Docker Compose
- Docker Compose secrets, volumes, networks, and service aliases
- OpenSSL and curl
- YAML and JSON configuration

## Sources Consulted
- Gel server configuration: https://docs.geldata.com/reference/running/configuration
- Gel Docker deployment: https://docs.geldata.com/reference/running/deployment/docker
- Gel connection parameters and credentials-file format: https://docs.geldata.com/reference/using/connection
- Gel CLI connection flags: https://docs.geldata.com/reference/using/cli/gel_connopts
- `gel query` reference: https://docs.geldata.com/reference/using/cli/gel_query
- Gel `sys::get_version_as_str()` reference: https://docs.geldata.com/reference/stdlib/sys
- Gel HTTP readiness and aliveness endpoints: https://docs.geldata.com/reference/running/http
- Gel v5-to-v6 upgrade guide: https://docs.geldata.com/resources/upgrading
- Official Gel Docker entrypoint, including the Docker-specific HTTP endpoint default: https://github.com/geldata/gel-docker/blob/aef3bf482051242a1b8a05b4f360ac3924c3fdd2/docker-entrypoint-funcs.sh#L544-L546
- Official Gel server TLS argument implementation: https://github.com/geldata/gel/blob/85191063b4db8b87caf26499de40f8a9d90c8146/edb/server/args.py#L899-L940
- Docker Compose secrets guide: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker Compose service secrets and network aliases reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose trust model: https://docs.docker.com/compose/trust-model/
- Docker Compose startup-order reference: https://docs.docker.com/compose/how-tos/startup-order/
- OpenSSL `x509` reference: https://docs.openssl.org/master/man1/openssl-x509/
- OpenSSL `s_client` reference: https://docs.openssl.org/master/man1/openssl-s_client/
- curl TLS certificate verification: https://curl.se/docs/sslcerts.html
- curl command-line reference: https://curl.se/docs/manpage.html

## Issues Found
1. **Incorrect HTTP endpoint default for the official Docker image.** The post said that Gel's binary and HTTP endpoints both default to TLS. Although the generic server configuration defaults both endpoints to `tls`, the official Docker entrypoint changes an unset HTTP endpoint setting to `optional`, which permits plaintext HTTP as well as TLS. Updated the post to state the Docker-specific default and to explain that explicitly setting both endpoint-security variables to `tls` enforces the intended behavior.
2. **Server and client version naming were conflated.** The post tied `GEL_`/`EDGEDB_` variables and the `gel`/`edgedb` command too broadly to the server version. Server releases before 6.0 use the `EDGEDB_` configuration prefix, but client variables and executable names depend on the installed client or CLI generation, which can differ from the target server version. Updated the section to distinguish those version boundaries and note that `gel` was already available as an alias in several pre-v6 CLI releases.

## Review Notes
- The Compose YAML was accepted by Docker Compose v5.1.4 using `docker compose config --no-interpolate`. Its secret grants, mount paths, named volume, default network, and `gel.internal` alias are valid.
- Short-form `depends_on` establishes startup order but does not wait for Gel to become ready. The post does not claim otherwise; production applications should retain connection retry behavior or use a healthcheck-based dependency when startup gating is required.
- The `openssl x509` command inspects selected metadata from the first certificate in the PEM input; it does not by itself validate the full chain or prove the key match. The post describes it as metadata inspection and separately directs readers to perform the other checks, so no correction was needed.
- The Gel credentials JSON, TLS environment variables, CLI flags, EdgeQL query, health-check paths, OpenSSL handshake command, and curl command are current and correctly used.
- The unpinned `geldata/gel` image is intentionally version-neutral in the example, and the post already instructs production deployments to pin a tested tag or digest.
- No live Gel deployment was attempted because the example intentionally uses placeholder images, credentials, hostnames, and certificate files.
