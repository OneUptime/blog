# Validation Summary: How to Configure Hot Reloading for Applications on Rancher - Reload

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Docker
- Node.js
- Nodemon
- Python
- Uvicorn
- Go
- Air
- Java
- Spring Boot DevTools
- kubectl
- Skaffold

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Uvicorn settings reference: https://www.uvicorn.org/settings/
- Nodemon official repository documentation: https://github.com/remy/nodemon
- Air official repository documentation: https://github.com/air-verse/air
- Spring Boot DevTools reference: https://docs.spring.io/spring-boot/reference/using/devtools.html
- Skaffold file sync documentation: https://skaffold.dev/docs/filesync/
- Skaffold configuration reference: https://skaffold.dev/docs/design/config/
- Node.js release schedule: https://github.com/nodejs/Release
- Node Docker Official Image documentation: https://hub.docker.com/_/node/
- Golang Docker Official Image documentation: https://hub.docker.com/_/golang/

## Issues Found
- The Kubernetes `Deployment` examples were invalid for `apps/v1` because they omitted `spec.selector` and matching pod template labels. I added the required selector and label fields so the manifests are valid.
- The Node.js deployment mounted an `emptyDir` over `/app/src`, which would hide the application source copied into the image and prevent `src/index.js` from existing on startup. I removed that mount because the later `kubectl cp` workflow already syncs directly into the container filesystem.
- The Node.js example used `node:18-alpine`, but Node.js 18 reached end of life on April 30, 2025. I updated it to `node:24-alpine`, which is a current supported LTS line as of the review date.
- The Go/Air example used the old `github.com/cosmtrek/air` install path and a Go 1.21 base image. Current Air documentation uses `github.com/air-verse/air@latest`, and current installation guidance requires Go 1.25 or newer. I updated both.
- The `.air.toml` example used outdated configuration patterns, including deprecated `build.bin`, misplaced `poll` settings, and values that do not match current documented configuration. I replaced it with a current working configuration based on the official Air reference.
- The Spring Boot section implied that copying a packaged JAR into a container and running `java -jar` was sufficient for hot reload. Spring Boot DevTools only restarts when classpath resources change, and packaged applications disable devtools by default unless explicitly re-enabled. I corrected the wording, removed the misleading flag usage, added the remote devtools secret configuration, and clarified that remote updates require the `RemoteSpringApplication` client and devtools included in the repackaged archive.
- The `kubectl cp` example copied `./src/` directly, which is easy to misread and can produce directory nesting problems. I changed it to `./src/.` and simplified the macOS watch loop to a working shell form.
- The Skaffold example used `skaffold/v4beta11`, while the current documented API version is `skaffold/v4beta13`. I updated the API version.
- The Skaffold manual sync destination was incorrect for the given glob patterns because Skaffold preserves matched directory hierarchy by default. I changed the destination from `/app/src` to `/app` so `src/...` files land under `/app/src/...` as intended.
- The introduction overstated how hot reload works by implying no restart occurs. I corrected it to reflect that the container/pod is not rebuilt or restarted, but the application process commonly is.

## Review Notes
- Spring Boot remote devtools should only be enabled on a trusted development network and never on production deployments.
- `kubectl cp` is workable for ad hoc development, but synced changes are ephemeral and disappear when the pod is recreated.
- The post is technically valid after the fixes above, but it remains mostly Kubernetes-generic rather than Rancher-specific.
