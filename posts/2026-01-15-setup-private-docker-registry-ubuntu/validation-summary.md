# Validation Summary: How to Set Up a Private Docker Registry on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker Compose
- CNCF Distribution Registry / Docker Registry
- TLS certificates and Certbot
- htpasswd basic authentication
- Docker Registry HTTP API V2
- Joxit Docker Registry UI
- Redis
- Prometheus metrics

## Sources Consulted
- CNCF Distribution Registry deployment documentation: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution Registry configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution Registry HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/
- CNCF Distribution Registry garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/
- Docker Engine certificate documentation: https://docs.docker.com/engine/security/certificates/
- Docker Compose file reference and obsolete version field documentation: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Certbot user guide for standalone certificates: https://eff-certbot.readthedocs.io/en/stable/using.html
- Joxit Docker Registry UI documentation: https://github.com/joxit/docker-registry-ui

## Issues Found
- The Let's Encrypt certificate copy commands saved `fullchain.pem` and `privkey.pem` with their original names, but the registry Compose configuration expected `/certs/domain.crt` and `/certs/domain.key`. Updated the copy commands to write the filenames used by the registry configuration.
- The self-signed certificate command used only a Common Name and wrote under the root-owned `/opt/registry` tree. Added `sudo` and a `subjectAltName` extension so modern TLS clients can validate `registry.example.com`.
- The htpasswd and editor commands wrote into `/opt/registry`, a root-owned directory created with `sudo mkdir`. Added `sudo` to those commands, including the troubleshooting regeneration command.
- The Docker Compose snippets used the obsolete top-level `version: '3.8'` field. Removed it so the examples follow the current Compose Specification.
- The optional Registry UI snippet used `https://registry:5000`, which would not match a certificate issued for `registry.example.com` and is not normally browser-reachable. Changed it to `https://registry.example.com:5000` and added a note that cross-origin UI deployments require CORS or the UI's proxy option.
- The Prometheus metrics text said to access the debug endpoint over HTTPS, but the registry debug server is configured separately from the main TLS listener and is not exposed unless the port is published. Updated the note to use HTTP and state that the debug port must be published and kept private.

## Review Notes
- The post uses `registry:2`, which remains common for Docker Registry tutorials, while the current CNCF Distribution docs now show `registry:3` and the v3 default config path `/etc/distribution/config.yml`. A future update could migrate the tutorial to v3, but the reviewed v2-specific configuration path is internally consistent.
