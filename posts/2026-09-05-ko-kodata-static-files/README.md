# How to Bundle Templates and Static Files with ko's `kodata` and `KO_DATA_PATH`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Static Files, File System, Container Image, HTTP

Description: Package command-specific templates and web files in a ko image, locate them safely at runtime, and test the same paths locally.

---

`ko` normally adds the compiled Go executable to a base image. When a command also needs templates, HTML, migrations, or other read-only files, place them in a directory named `kodata` beside that command's source. `ko` adds the directory contents to the image and sets `KO_DATA_PATH` to their runtime location.

The application should never hard-code the implementation path. Read `KO_DATA_PATH`, join paths with Go's filesystem functions, and fail clearly when a required asset is absent.

## Use the Command-Local Convention

For a command at `cmd/web`, use this layout:

```text
cmd/web/
├── main.go
└── kodata/
    ├── templates/
    │   ├── base.html
    │   └── status.html
    └── static/
        ├── app.css
        └── favicon.ico
```

Build the command:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/web
ko build ./cmd/web
```

Inside a normal Linux image, current `ko` uses `/var/run/ko` as the data root and sets `KO_DATA_PATH=/var/run/ko`. Treat that location as an implementation detail exposed through the environment variable, because Windows images use a different path and future tooling can evolve.

Each built command gets the `kodata` associated with its import path. A sibling command's assets are not included automatically.

## Resolve Paths Defensively in Go

Create one helper that checks that `KO_DATA_PATH` is set and joins application-owned path components:

```go
package assets

import (
	"fmt"
	"os"
	"path/filepath"
)

func Path(parts ...string) (string, error) {
	root := os.Getenv("KO_DATA_PATH")
	if root == "" {
		return "", fmt.Errorf("KO_DATA_PATH is not set")
	}
	all := append([]string{root}, parts...)
	return filepath.Join(all...), nil
}
```

Only pass application-owned relative components. `filepath.Join` is not a security boundary for untrusted user input; reject traversal and avoid mapping arbitrary request paths directly to the filesystem.

Parse required templates explicitly with `html/template` during startup so missing files or parse errors fail before receiving traffic:

```go
root := os.Getenv("KO_DATA_PATH")
if root == "" {
	log.Fatal("KO_DATA_PATH is not set")
}

templates, err := template.ParseFiles(
	filepath.Join(root, "templates", "base.html"),
	filepath.Join(root, "templates", "status.html"),
)
if err != nil {
	log.Fatalf("load templates: %v", err)
}
```

A glob only requires at least one matching file; naming each required file ensures a missing template is detected at startup.

## Serve Static Content with a Narrow Prefix

Go's HTTP file server can serve the static subtree:

```go
root := os.Getenv("KO_DATA_PATH")
if root == "" {
	log.Fatal("KO_DATA_PATH is not set")
}
staticDir := filepath.Join(root, "static")
static := http.FileServer(http.Dir(staticDir))
http.Handle("/static/", http.StripPrefix("/static/", static))
```

Review whether directory listings, dotfiles, source maps, or internal files should be reachable. Keep public content in a dedicated subtree rather than serving all of `KO_DATA_PATH`.

`ko` uses reproducible timestamps for bundled data by default. As its static-assets documentation notes, `http.FileServer` may therefore not emit useful `Last-Modified` behavior. Set an explicit immutable cache policy with content-hashed filenames, or choose a deterministic data timestamp.

## Reproduce the Runtime Locally

`go run` does not set `KO_DATA_PATH` automatically. Supply it:

```bash
KO_DATA_PATH=cmd/web/kodata go run ./cmd/web
```

Use an absolute path when tests change their working directory:

```bash
KO_DATA_PATH="$(pwd)/cmd/web/kodata" go test ./cmd/web/...
```

Do not make production code fall back silently to a source-tree-relative path. That fallback can make local tests pass while the image lacks its data. Let the development command or test fixture set the environment explicitly.

## Control File Timestamps Reproducibly

`KO_DATA_DATE_EPOCH` sets the modification time used for bundled data. A stable choice is the last Git commit time:

```bash
export KO_DATA_DATE_EPOCH=$(git log -1 --format='%ct')
ko build ./cmd/web
```

Using the wall clock changes image content for identical source. Use it only if freshness semantics truly require build time. Prefer fingerprinted static filenames and HTTP cache headers over timestamps as a release identifier.

## Treat Symlinks as Included Content

On Linux targets, `ko` follows symlinks in `kodata` and includes their targets. Version 0.19.1 requires the resolved target to remain inside the canonical `kodata` root and fails the build when a link escapes it; Windows-target builds skip symlinks. This is stricter than older examples that link to files elsewhere in a repository. Pin the tool version and keep the link policy explicit.

Before release, inventory links:

```bash
find cmd/web/kodata -type l -print -exec readlink {} \;
```

Allow only intentional in-root targets, reject broken links, and inspect the final image. Do not weaken or work around the escape check. Never place private keys, registry tokens, `.env` files, or customer data in `kodata`. Image layers remain recoverable even after a file is hidden by a later layer.

## Decide Between `kodata` and Go `embed`

Both can ship files:

- `kodata` keeps files as an image layer and exposes normal filesystem paths.
- Go's `embed` package compiles files into the executable and exposes an `fs.FS`.

Use `kodata` for code that expects paths, for assets you want visible as a distinct layer, or for established `ko` conventions. Use `embed` when a single binary and compile-time inclusion are more important. Neither makes runtime mutation persistent.

Large, frequently changing media files can make every image build expensive. Consider an object store or separate content image when assets have an independent release lifecycle.

## Verify the Built Image

Capture and inspect the digest:

```bash
image_ref=$(ko build ./cmd/web)
cid=$(docker create "$image_ref")
docker cp "$cid:/var/run/ko" /tmp/web-kodata
docker rm "$cid"
find /tmp/web-kodata -type f -print
```

This uses the documented current Linux location for inspection only; application code should still read the variable. Then start the image and test known files, missing files, caching headers, and nonroot permissions.

## Conclusion

Place assets in the command's `kodata` directory, locate them through `KO_DATA_PATH`, validate required files at startup, and set the variable explicitly for local runs. Keep public files in a narrow subtree, audit followed symlinks, and use deterministic timestamps or content-hashed names so assets remain reproducible and cacheable.

## Official Documentation

- [ko: Static Assets](https://ko.build/features/static-assets/)
- [ko v0.19.1: `kodata` Symlink Boundary](https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go)
- [ko: Frequently Asked Questions About Timestamps](https://ko.build/advanced/faq/)
- [Go: `embed` Package](https://pkg.go.dev/embed)
- [Go: `filepath` Package](https://pkg.go.dev/path/filepath)
- [Go: `http.FileServer`](https://pkg.go.dev/net/http#FileServer)
