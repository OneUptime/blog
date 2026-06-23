# Validation Summary: 10 Docker Superpowers Developers Forget to Use

## Status
validated

## Post Type
Guide / Tips listicle (practical Docker techniques)

## Technologies Covered
- Docker (multi-stage builds, `docker run`, `docker events`, `docker scout`)
- BuildKit (cache mounts, `--mount=type=secret`)
- Docker Buildx / `buildx bake` (multi-arch builds, HCL)
- Docker Compose (profiles, `depends_on` conditions, healthchecks)
- Google distroless base images (`gcr.io/distroless/nodejs22`)
- Linux container security (capabilities, `--init`/tini, read-only rootfs, tmpfs)
- `nicolaka/netshoot` debugging container / network namespace sharing
- `jq` for event filtering

## Sources Consulted
- Docker build secrets & cache mounts: https://docs.docker.com/build/building/secrets/ and https://docs.docker.com/build/cache/optimize/
- Docker Compose profiles: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose `depends_on` / `service_healthy`: https://docs.docker.com/reference/compose-file/services/#depends_on
- `docker buildx bake` (HCL targets, platforms): https://docs.docker.com/build/bake/
- Docker Scout CVEs & SBOM: https://docs.docker.com/scout/ and `docker buildx imagetools inspect`
- HEALTHCHECK / Dockerfile reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- `docker run` security flags (`--init`, `--cap-drop`, `--read-only`, `--tmpfs`): https://docs.docker.com/reference/cli/docker/container/run/
- `docker events`: https://docs.docker.com/reference/cli/docker/system/events/
- Google distroless nodejs README & example Dockerfile: https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- `nicolaka/netshoot` tool list / Dockerfile: https://github.com/nicolaka/netshoot

## Issues Found
1. **Section 9 — `redis-cli` is not included in `nicolaka/netshoot`.** The original command `docker run -it --network container:$TARGET nicolaka/netshoot redis-cli -h 127.0.0.1` would fail because the netshoot image does not ship `redis-cli` (its toolset includes `nc`/netcat-openbsd, `curl`, `nmap`, `tcpdump`, etc., but not redis-cli). Changed the command to `nc -zv 127.0.0.1 6379`, which uses a tool netshoot actually provides while preserving the point of the section (probing a port via the target's shared network namespace). Updated the trailing comment accordingly.
2. **Section 1 — `CMD ["server.js"]` would not resolve.** With `gcr.io/distroless/nodejs22` the entrypoint is `node`, and the build output is copied to `/app`, but no `WORKDIR` is set in the runtime stage, so `node server.js` runs from `/` and fails to find the file. Changed to the absolute path `CMD ["/app/server.js"]` so the example actually starts.

## Review Notes
- `gcr.io/distroless/nodejs22` (bare tag, no `-debian` suffix) is valid and currently resolves to the `-debian13` variant; Google recommends pinning the suffix (e.g. `nodejs22-debian13`) to avoid surprises when the default Debian base advances. Left as-is since it works today. gcr.io continues to redirect to Artifact Registry, so the distroless paths still pull.
- Section 2: the tip to "invalidate them [cache mounts] with `--build-arg CACHE_BUST=$(date +%s)`" is slightly imprecise — a build-arg busts the *layer* cache (re-running the `RUN`), but a BuildKit `type=cache` mount's contents persist across builds regardless and are not cleared this way. To genuinely clear a cache mount you would use `docker builder prune` or change the mount `id`. The advice still produces a fresh dependency install, so this is a nuance rather than a breaking error; left unchanged to avoid restructuring prose.
- Section 8: the multi-line `docker run` block uses inline `# ...` comments after `\` line-continuations. This is a common annotation style for documentation but is not directly copy-pasteable in bash (the comment terminates the line). Left unchanged because removing the inline annotations would be a structural/stylistic change beyond the scope of a technical fix.
- All other commands, flags, and config snippets (BuildKit secrets, Compose profiles, `buildx bake` HCL, HEALTHCHECK, `depends_on: condition: service_healthy`, `docker scout cves`, SBOM inspect, security flags, `docker events | jq`) were verified against current Docker documentation and are correct.
