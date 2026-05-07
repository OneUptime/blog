# Validation Summary: How to Use Alpine-Based Images for Smaller Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Dockerfile
- Docker Compose / Compose Specification
- Alpine Linux
- Go

## Sources Consulted
- Alpine release branches: https://www.alpinelinux.org/releases/
- Alpine Linux main page: https://wiki.alpinelinux.org/wiki/Main_Page
- Working with the Alpine Package Keeper (`apk`): https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html
- Alpine Package Keeper reference: https://wiki.alpinelinux.org/wiki/Package_management
- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer pull an image: https://docs.portainer.io/user/docker/images/pull
- Portainer add a new container: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Docker Official Image tags for Alpine: https://hub.docker.com/_/alpine/tags
- Docker Official Image tags for Ubuntu: https://hub.docker.com/_/ubuntu/tags
- Docker Official Image tags for Debian: https://hub.docker.com/_/debian/tags
- Docker Official Image docs for Go: https://hub.docker.com/_/golang/

## Issues Found
- The post recommended `alpine:3.19`, which is outside the current Alpine support window. I updated all Alpine references to the supported `3.23` branch and aligned the Go builder example to `golang:1.26-alpine3.23`.
- The image-size table used stale and ambiguous values. I changed it to current approximate compressed `linux/amd64` sizes from the official Docker Hub tags pages and softened the introductory size-reduction claim so it stays accurate.
- The Compose example used `version: "3.8"`. Docker now documents the top-level `version` field as obsolete, so I removed it.
- The Alpine command example used `apk info --installed`, which does not list installed packages on current Alpine `apk`; it is an installed-status check for named packages. I changed it to `apk info`.
- The package search example assumed a populated local package index. I changed it to `apk update && apk search python3` so it works reliably in a fresh Alpine container.
- The single-stage Dockerfile implied that any copied binary would run on Alpine. I clarified that the binary should be statically linked or `musl`-compatible, because Alpine uses `musl libc`.

## Review Notes
- The Portainer navigation steps for pulling images, adding containers, and deploying stacks matched current Portainer documentation.
- The corrected Compose snippet validated successfully with `docker compose config`.
- The corrected Alpine package commands were checked in a real `alpine:3.23` container with `docker run`.
- The corrected multi-stage Dockerfile pattern was validated with a live `docker build`.
- Docker Hub notes that `golang:<version>-alpine` images are Alpine-based and therefore use `musl`; they are fine for this example, but cgo-heavy workloads should be tested carefully.
