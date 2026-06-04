# Validation Summary: How to Run Kali Linux Tools in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Kali Linux Docker images
- Kali Linux metapackages and APT packages
- Nmap
- sqlmap
- ffuf
- Nuclei
- Hydra
- John the Ripper
- Metasploit Framework

## Sources Consulted
- Kali Linux official Docker image documentation: https://www.kali.org/docs/containers/official-kalilinux-docker-images/
- Kali Linux metapackages documentation: https://www.kali.org/docs/general-use/metapackages/
- Kali package availability checked in the current `kalilinux/kali-rolling` image with `apt-cache show`
- Docker `run` CLI documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Nmap reference guide: https://nmap.org/book/man.html
- sqlmap usage documentation: https://github.com/sqlmapproject/sqlmap/wiki/Usage
- ffuf CLI help from the Kali package
- Hydra CLI help from the Kali package
- John the Ripper documentation: https://www.openwall.com/john/doc/
- ProjectDiscovery Nuclei Docker image documentation: https://hub.docker.com/r/projectdiscovery/nuclei
- Metasploit Framework Docker image listing: https://hub.docker.com/r/metasploitframework/metasploit-framework/

## Issues Found
- The Docker Compose example included a service named `burp-collaborator` using the bare `kalilinux/kali-rolling` image and publishing port `8080`, but it did not install or run Burp Collaborator or any service listening on that port. Changed the service to a generic `kali-shell` container and removed the misleading port mapping.

## Review Notes
- The current `kalilinux/kali-rolling` image confirms that the listed Kali metapackages and package names exist, including `kali-tools-top10`, `kali-tools-web`, `httpx-toolkit`, and `nuclei`.
- Docker Hub rate limiting prevented local pulls of `projectdiscovery/nuclei` and `metasploitframework/metasploit-framework` during validation, so those image checks were validated against their published Docker Hub documentation instead.
- The top-level `version: "3.8"` field in the Compose example is accepted by legacy Compose files, but the current Compose Specification is the recommended format for new files.
