# Control BuildKit Local Cache Growth with Reset Exports and Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Build Cache, Caching, DevOps

Description: Control BuildKit local cache growth with version-aware reset exports or fresh-directory rotation while protecting active readers and retained cache manifests.

---

A BuildKit local cache directory can grow after every export even when its current cache manifest represents only one build. The directory stores content-addressed blobs, and older blobs are not necessarily removed when the current manifest changes.

The title describes the default retention behavior, not an unavoidable limitation. Current Docker documentation provides `reset=true` for local exports with Buildx 0.35.0 and later. Older installations can export into a fresh directory and rotate it into place. [Local cache backend](https://docs.docker.com/build/cache/backends/local/).

## Understand What the Directory Contains

A local external cache uses an OCI image layout. Its index points at cache manifests, while blob files contain the manifests and cached data. Updating the current tag changes the reference; it does not, by default, reclaim everything that an earlier manifest referenced.

This is different from the builder's internal cache. Running `docker buildx prune` targets the selected builder's cache records. It is not a garbage collector for an arbitrary directory previously written by `--cache-to type=local`. [Buildx prune](https://docs.docker.com/reference/cli/docker/buildx/prune/).

Before using the examples, add `.ci-build-cache/` to `.dockerignore`. These paths are beneath the build context; a broad `COPY . .` must not copy restored cache blobs into the image or include them in its own cache inputs. Keeping the cache root outside the context is another option.

Measure both stores separately:

```bash
du -sh .ci-build-cache/api-linux-amd64
docker buildx du
```

Make sure the first path is your external export directory. A large Docker data directory may have several unrelated contributors, including images and active build snapshots.

## Use Reset When Your Versions Support It

Check the client and selected builder:

```bash
docker buildx version
docker buildx inspect --bootstrap
```

For a compatible setup, a local export can reclaim blobs no tag references:

```bash
docker buildx build \
  --cache-from type=local,src=.ci-build-cache/api-linux-amd64 \
  --cache-to type=local,dest=.ci-build-cache/api-linux-amd64,mode=max,reset=true \
  --load --tag api:ci .
```

On the first build, omit `--cache-from` if no export exists. Treat an unsupported option as a version/configuration problem rather than silently assuming cleanup happened.

Reset preserves blobs referenced by other tags in the layout. It removes untagged historical manifests, so consumers can no longer import those removed manifests by digest. Keep a tag for any manifest whose data you deliberately retain. [Cache versioning and reset](https://docs.docker.com/build/cache/backends/local/#cache-versioning).

Reset is a retention decision. If another process expects an older untagged digest to remain available, coordinate that consumer before pruning it.

## Rotate a Fresh Export on Older Installations

A broadly applicable alternative is to import the previous directory and export into a new empty one. BuildKit writes the records needed by the current export rather than accumulating files in the old destination.

The following Bash fragment assumes one dedicated cache directory and that the CI scheduler has excluded other readers and writers for the entire operation:

```bash
set -euo pipefail
cache_root="$PWD/.ci-build-cache/api-linux-amd64"
mkdir -p "$cache_root"
next_cache=$(mktemp -d "$cache_root/next.XXXXXX")
build_flags=(--load --tag api:ci)
if [ -f "$cache_root/current/index.json" ]; then
  build_flags+=(--cache-from "type=local,src=$cache_root/current")
fi

docker buildx build \
  "${build_flags[@]}" \
  --cache-to "type=local,dest=$next_cache,mode=max" \
  .

test -s "$next_cache/index.json"
# Keep the previous directory until the new export is promoted.
previous_cache=$(mktemp -d "$cache_root/previous.XXXXXX")
rmdir "$previous_cache"
if [ -d "$cache_root/current" ]; then
  mv "$cache_root/current" "$previous_cache"
fi
mv "$next_cache" "$cache_root/current"
if [ -d "$previous_cache" ]; then
  rm -rf -- "$previous_cache"
fi
```

The generated paths stay beneath the dedicated cache root. A failed build exits before replacing `current`, leaving the previous cache available and an incomplete `next.*` directory for later cleanup.

Promotion uses two renames. A process or host failure between them can leave `current` absent and the old export under `previous.*`; recover that directory before resuming jobs. If uninterrupted readers are required, use versioned directories plus an atomic pointer and a reader-aware retention mechanism instead of this maintenance-window fragment.

## Coordinate All Consumers

A lock used only by the cleanup job is insufficient if normal builds ignore it. Every job that imports, exports, or rotates this directory must participate in the same exclusion policy.

Prefer one cache location per image and platform. A global lock around all repository builds can make CI slower than the cache saves. Independent cache roots permit independent maintenance and reduce accidental cross-project deletion.

A shared network filesystem adds its own locking and consistency requirements. For many ephemeral runners, a registry cache with explicit references and registry retention is easier to operate than hand-maintained shared directories.

## Verify Retention and Recovery

Populate a cache, change a real build input, and export again. Compare directory size after several generations. Then use a fresh builder to import only the retained export and verify that the expensive unchanged operations reuse cache.

Test failure before promotion and recovery from a retained `previous.*` directory. Also verify that intentionally tagged historical manifests survive reset when that is your chosen strategy.

Do not delete individual blob files based only on age or size. A small current manifest can reference old large blobs. Let a format-aware reset or a complete fresh export determine reachability, and measure the resulting cache size and build performance together.

## References

- [Docker local cache backend](https://docs.docker.com/build/cache/backends/local/)
- [Buildx prune scope](https://docs.docker.com/reference/cli/docker/buildx/prune/)
- [External cache backends](https://docs.docker.com/build/cache/backends/)
- [Docker GitHub Actions local-cache example](https://docs.docker.com/build/ci/github-actions/cache/)
