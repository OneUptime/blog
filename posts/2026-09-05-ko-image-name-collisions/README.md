# Prevent ko Image-Name Collisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Container Image, Container Registry, Naming, OCI

Description: Choose ko's default or explicit repository naming modes without allowing same-named Go commands to overwrite one another.

---

Two Go commands can share the same final directory name:

```text
example.com/acme/orders/cmd/server
example.com/acme/billing/cmd/server
```

If both become `registry.example.com/apps/server:latest`, the last push moves the tag and makes the name ambiguous. `ko` avoids this by default: it appends an MD5 hash of the lowercased full import path to the lowercased base package name. Paths that differ only by case can still collide.

Given `KO_DOCKER_REPO=registry.example.com/apps`, the default canonical output resembles:

```text
registry.example.com/apps/server-<hash>@sha256:<digest>
```

`ko` also pushes the default `latest` tag, but version 0.19.1 omits that tag from the returned canonical reference. The suffix distinguishes the two `server` packages. It is a deterministic naming aid, not a content hash and not a security check. The final `sha256` digest is the content identity.

## Keep the Default When Possible

The safest general command is simply:

```bash
export KO_DOCKER_REPO=registry.example.com/apps
ko build ./orders/cmd/server ./billing/cmd/server
```

Capture the emitted references:

```bash
mkdir -p dist
ko build ./orders/cmd/server ./billing/cmd/server \
  --image-refs=dist/images.txt
```

This handles commands with equal base names without maintaining a separate naming table. The tradeoff is that people cannot derive the complete repository name from `server` alone.

## Preserve the Full Import Path

`--preserve-import-paths` or `-P` appends the entire Go import path, converted to lowercase:

```bash
ko build --preserve-import-paths ./orders/cmd/server
```

For a module named `example.com/acme/platform`, the result is shaped like:

```text
registry.example.com/apps/example.com/acme/platform/orders/cmd/server
```

This is deterministic and collision-resistant as long as import paths remain unique after lowercasing. It can also create deeply nested registry repositories. Confirm that the registry accepts the depth and characters involved, and understand how it applies permissions and retention to nested names.

This mode is useful when registry policy permits an import-path hierarchy and operators value traceability more than short names.

## Use Only the Base Import Path Carefully

`--base-import-paths` or `-B` drops the default hash:

```bash
ko build --base-import-paths ./orders/cmd/server
```

The destination becomes:

```text
registry.example.com/apps/server
```

That is readable, but it collides with every other command whose base directory is `server`. Use it only when one of these controls makes uniqueness explicit:

- every command has a unique final package directory after lowercasing;
- each build receives a distinct `KO_DOCKER_REPO` prefix;
- CI validates the complete planned destination set before pushing; or
- only one package is ever published to that repository.

Do not rely on build ordering. Parallel builds make last-writer behavior even less predictable.

## Understand `--bare`

`--bare` uses `KO_DOCKER_REPO` itself, without appending package context:

```bash
export KO_DOCKER_REPO=registry.example.com/apps/orders-api
ko build --bare ./orders/cmd/server
```

The image is published directly under `registry.example.com/apps/orders-api`. This gives complete control to the caller and works well for a pipeline dedicated to one command.

It is unsafe for several packages sharing the same `KO_DOCKER_REPO`. Every build targets the same repository and tag set. The current CLI also warns that `--bare` and `--base-import-paths` may not work properly with tags in every combination. Test the exact `ko` release and naming policy instead of combining switches casually.

## Treat the Modes as Alternatives

Choose one naming strategy per publishing contract:

| Strategy | Example suffix | Collision risk | Main tradeoff |
| --- | --- | --- | --- |
| Default | `server-<import-hash>` | Low | Less memorable |
| `--preserve-import-paths` | full module/import path | Low | Deep repository path |
| `--base-import-paths` | `server` | High when names repeat | Short and readable |
| `--bare` | no suffix | Certain if repo is shared | Caller owns all naming |

Although option precedence exists internally, combining naming flags makes intent unclear and may change how a later maintainer interprets the build. Configure exactly one.

## Detect Collisions Before a Push

Inventory main packages and their base names:

```bash
go list -f '{{if eq .Name "main"}}{{.ImportPath}}{{end}}' ./... |
  sed '/^$/d'
```

When considering `-B`, compare the lowercased last path component. A simple review can spot repeated `server`, `worker`, `controller`, or `main` directory names.

For a large repository, run release builds with a staging registry prefix first and record `--image-refs`. Assert that every expected package produced a unique repository before promoting by digest.

Do not attempt to precompute `ko`'s default hash as a public naming API. Capture the output from the actual pinned `ko` version.

## Separate Repository Names from Release Tags

Repository naming answers which application this is. Tags answer which human release label points at it. Digests answer exactly which bytes were produced. Keep these identities separate:

```text
registry.example.com/apps/server-<path-hash>:v3.1.0@sha256:<content-digest>
```

Even with a collision-free repository name, deploying only `:v3.1.0` depends on tag immutability. Preserve the digest returned by `ko` in manifests and release records.

If a registry enforces immutable tags, parallel attempts to publish different content under the same tag should fail rather than overwrite. That is a helpful last line of defense, but it does not make ambiguous naming understandable.

## Plan Renames as Migrations

Renaming a Go module or moving a command to a different import path changes its full import path. Unless the change is only in letter case, under the default mode that changes the appended hash; under preserve mode, it changes the visible hierarchy. Existing digest-pinned deployments keep working while the registry retains their manifests and all referenced blobs, but automation and retention policies may see a new repository.

Publish the new name, update deployments by digest, and retain the old repository until no environment references it. Do not delete it merely because the source moved.

## Conclusion

The default hashed name is the best collision defense for mixed repositories. Preserve import paths when a visible hierarchy is acceptable, use base paths only after proving all lowercased base names are unique, and reserve bare mode for a one-command repository chosen by the caller. Whatever name you choose, capture and deploy the content digest rather than depending on tag order.

## Official Documentation

- [ko: Image Naming Strategies](https://ko.build/configuration/#naming-images)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [Go: List Packages](https://pkg.go.dev/cmd/go#hdr-List_packages_or_modules)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
