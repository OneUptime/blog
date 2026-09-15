# Validation Summary: Drone Runner Cannot Connect to Server: Debug RPC Host, Protocol, Secret, and TLS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Drone Docker runner
- Docker Engine and Docker networking
- Docker Compose
- TLS and X.509 certificate validation
- OpenSSL
- curl
- DNS
- Reverse proxies

## Sources Consulted
- [Drone Docker runner installation](https://docs.drone.io/runner/docker/installation/linux/)
- [Drone `DRONE_RPC_SKIP_VERIFY` reference](https://docs.drone.io/runner/docker/configuration/reference/drone-rpc-skip-verify/)
- [Docker networking overview](https://docs.docker.com/engine/network/)
- [Docker `container run` reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker `container logs` reference](https://docs.docker.com/reference/cli/docker/container/logs/)
- [Docker Compose `up` reference](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Docker Compose `restart` reference](https://docs.docker.com/reference/cli/docker/compose/restart/)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found
- The deployment-update guidance allowed “restart” without clearly distinguishing process restarts from `docker compose restart`. Docker documents that Compose configuration and environment-variable changes are not applied by `docker compose restart`. The post now instructs Compose users to recreate the affected service with `docker compose up -d` and explicitly warns that `docker compose restart` does not apply configuration changes.

## Review Notes
- The diagnostic `curl --head` request establishes DNS, TCP, TLS, and basic HTTP reachability but can produce a method-specific result because some servers handle HEAD differently from GET. The post correctly limits the claim to basic HTTPS reachability and does not treat it as an RPC authentication test.
- The OpenSSL command uses options documented by current OpenSSL releases. Older OpenSSL installations may not support `-verify_hostname`; the post does not claim compatibility with a particular legacy version.
