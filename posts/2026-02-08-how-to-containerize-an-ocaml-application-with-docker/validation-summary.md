# Validation Summary: How to Containerize an OCaml Application with Docker

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and Dockerfiles
- Docker Compose
- OCaml 5
- opam
- Dune
- Dream web framework
- Yojson
- Alpine Linux and Ubuntu container images

## Sources Consulted
- OCaml Docker Images documentation: https://ocaml.org/docs/ocaml-docker
- Dream package documentation: https://ocaml.org/p/dream/latest/doc/dream/Dream/index.html
- Dream opam package metadata: https://opam.ocaml.org/packages/dream/
- Dune executable stanza documentation: https://dune.readthedocs.io/en/latest/reference/dune/executable.html
- Dune command-line usage documentation: https://dune.readthedocs.io/en/stable/usage.html
- opam lock manpage: https://opam.ocaml.org/doc/man/opam-lock.html
- opam install manpage: https://opam.ocaml.org/doc/man/opam-install.html
- Dockerfile HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Compose version element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- OCaml 5.1 Domain module documentation: https://ocaml.org/manual/5.1/api/type_Domain.html

## Issues Found
- The Dream dependency examples used `1.0.0~alpha5`, while the current Dream package release is `1.0.0~alpha8`. Updated the minimum and pinned examples to `1.0.0~alpha8`.
- The Dockerfiles installed opam dependencies without refreshing the image's bundled opam-repository snapshot. Added `opam update` before `opam install` commands, matching the official OCaml Docker image guidance.
- The production `HEALTHCHECK` used `curl`, but the runtime image did not install it. Added `curl` to the Ubuntu runtime packages.
- The Alpine section described the build as static linking. The example still installs Alpine runtime libraries, so it is a musl/Alpine runtime build rather than a fully static binary. Updated the heading and wording.
- The Alpine images used `3.19`, which is outdated for a 2026 post. Updated the examples to Alpine `3.22`; the `ocaml/opam:alpine-3.22-ocaml-5.1` manifest was verified.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The multicore section implied Dream automatically uses the configured core count. Dream uses Lwt for asynchronous I/O; OCaml domains must be spawned explicitly or through a domain-based pool for CPU-bound parallelism. Updated the explanation and code snippet accordingly.

## Review Notes
The sample Dream routes, Dune executable stanza, Dune output path, opam lock commands, Docker healthcheck syntax, and Docker CPU limit syntax are otherwise technically valid. The post still uses OCaml 5.1 and Ubuntu 22.04 intentionally; those examples are valid, though future maintenance could move them to newer OCaml and Ubuntu base images.
