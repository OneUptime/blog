# How to Embed ko's `pkg/build` and `pkg/publish` APIs in a Go Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, API, Libraries, Container Image, Automation

Description: Compose ko's Go builder and registry publisher in an internal tool with explicit bases, platforms, authentication, and digest handling.

---

`ko` exposes the core image build and publication behavior as Go packages. An internal release controller can call `github.com/google/ko/pkg/build` to turn a Go main package into an image result and `github.com/google/ko/pkg/publish` to publish that result.

Embedding is appropriate when a tool needs custom orchestration or policy around the image object. If invoking `ko build` as a subprocess is sufficient, the CLI offers a smaller compatibility surface. The module remains below version 1, so pin it and expect API evolution.

## Pin the Module Version

Although the repository now lives under the `ko-build` GitHub organization, the current Go import path remains `github.com/google/ko`:

```bash
go get github.com/google/ko@v0.19.1
go mod tidy
```

Version 0.19.1 declares Go 1.26.3 in its module file, so the embedding tool needs that toolchain or a compatible newer one. The CLI binary can be consumed without inheriting this library build requirement. Review release notes before updating, commit `go.mod` and `go.sum`, and run integration tests against a disposable registry.

## Build and Publish One Command

This example follows the official package composition while making platforms, base retrieval, authentication, and tags explicit:

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/google/ko/pkg/build"
	"github.com/google/ko/pkg/publish"
)

const (
	baseImage  = "cgr.dev/chainguard/static:latest"
	targetRepo = "registry.example.com/acme/services"
	importPath = "example.com/acme/releaser/cmd/api"
)

func main() {
	ctx := context.Background()

	b, err := build.NewGo(ctx, ".",
		build.WithPlatforms("linux/amd64", "linux/arm64"),
		build.WithBaseImages(func(ctx context.Context, _ string) (
			name.Reference, build.Result, error,
		) {
			ref, err := name.ParseReference(baseImage)
			if err != nil {
				return nil, nil, err
			}
			idx, err := remote.Index(ref,
				remote.WithContext(ctx),
				remote.WithAuthFromKeychain(authn.DefaultKeychain),
			)
			return ref, idx, err
		}),
		build.WithLabel("org.opencontainers.image.source",
			"https://github.com/acme/releaser"),
	)
	if err != nil {
		log.Fatalf("create builder: %v", err)
	}

	result, err := b.Build(ctx, importPath)
	if err != nil {
		log.Fatalf("build %s: %v", importPath, err)
	}

	p, err := publish.NewDefault(targetRepo,
		publish.WithTags([]string{"v1.4.0"}),
		publish.WithAuthFromKeychain(authn.DefaultKeychain),
	)
	if err != nil {
		log.Fatalf("create publisher: %v", err)
	}
	defer func() {
		if err := p.Close(); err != nil {
			log.Printf("close publisher: %v", err)
		}
	}()

	ref, err := p.Publish(ctx, result, importPath)
	if err != nil {
		log.Fatalf("publish: %v", err)
	}

	fmt.Println(ref.String())
}
```

For a production release, pin `baseImage` to an index digest containing both requested platforms. The floating tag keeps the sample readable but makes repeated builds less reproducible.

## Understand the Interfaces

`build.Interface` provides three operations:

- `QualifyImport` converts a relative or full path into a supported `ko://` reference.
- `IsSupportedReference` validates whether a reference can be handled.
- `Build` returns a `build.Result`, which represents an image or image index.

For user-supplied local paths, qualify and validate them before building:

```go
qualified, err := b.QualifyImport("./cmd/api")
if err != nil {
	return err
}
if err := b.IsSupportedReference(qualified); err != nil {
	return err
}
result, err := b.Build(ctx, qualified)
```

`publish.Interface.Publish` accepts a build result and source string, then returns a `name.Reference`. `Close` exists because some publisher implementations need to finish an aggregate output. Always call it and surface errors in code that uses tarball-like publishers.

## Do Not Reimplement Authentication

`publish.WithAuthFromKeychain(authn.DefaultKeychain)` reads standard registry credentials. An application running in a cloud environment may need a cloud-specific or composite keychain, as the `ko` CLI itself uses more than the default Docker keychain.

Accept an `authn.Keychain` through dependency injection:

```go
func newPublisher(repo string, kc authn.Keychain) (publish.Interface, error) {
	return publish.NewDefault(repo,
		publish.WithAuthFromKeychain(kc),
		publish.WithTags([]string{"candidate"}),
	)
}
```

Do not accept plaintext passwords in command arguments or logs. Let the runtime identity, credential helper, or secret provider implement the keychain.

## Handle Base Manifests and Indexes

The example calls `remote.Index`, so the configured base reference must resolve to an image index. A base pinned to a single-platform image manifest needs `remote.Image` instead. A general tool should call `remote.Get`, examine the descriptor media type, and return either its image or index.

This distinction matters for multi-platform builds. `build.WithPlatforms("linux/amd64", "linux/arm64")` needs corresponding variants in the base index. The library does not synthesize a missing base platform.

Apply timeouts and cancellation to every registry operation:

```go
ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
defer cancel()
```

Pass that context through base pulls, builds, and publication.

## Compose Caching, Limits, and Destinations

The packages expose useful wrappers:

- `build.NewCaching` shares an in-process build result for repeated identical requests.
- `build.NewLimiter` bounds concurrent builds.
- `publish.NewCaching` avoids duplicate publication work within the process.
- `publish.MultiPublisher` sends a result to several publishers, with the last publisher's reference returned.
- `publish.NewDaemon`, `NewKindPublisher`, and `NewLayout` target local or offline stores.

Composition order is observable. A multi-publisher can partially succeed: the first destination may contain an image even if the second fails. Make retry and cleanup behavior idempotent, and record every successful destination digest.

Do not assume the return value from `MultiPublisher` represents all destinations. Its documented behavior is last publisher wins.

## Apply Policy Around the Result

Before publishing, inspect the `build.Result` digest and media type. After publication, retain the returned digest-bearing reference and attach metadata through reviewed APIs. Enforce:

- permitted target registry prefixes;
- pinned base-image policy;
- allowed platforms and maximum concurrency;
- required OCI labels;
- SBOM generation and retention;
- nonroot image configuration; and
- an exact release-tag syntax.

Never allow an untrusted import path or repository string to redirect credentials to an arbitrary registry. Parse with `name.ParseReference`, enforce an allowlist, and avoid `name.Insecure` outside isolated tests.

## Test Without Publishing Production Images

Unit-test orchestration with fake implementations of the small interfaces. Use `publish.NewLayout` for integration tests that need real OCI content without registry writes. Run a separate end-to-end test against a disposable authenticated registry to exercise upload and naming behavior.

Pin a representative Go command in testdata and assert:

1. the result contains expected platforms;
2. labels and entrypoint are correct;
3. cancellation stops long work;
4. authentication errors remain redacted;
5. the returned reference contains a digest; and
6. partial multi-publisher failure is reported.

## Conclusion

Embedding `pkg/build` and `pkg/publish` gives a Go tool direct access to `ko`'s image pipeline, but it also makes API, authentication, concurrency, and partial-failure handling your responsibility. Pin the pre-v1 module, inject keychains, pin base indexes, propagate context, close publishers, and make the returned digest the release artifact. Prefer the CLI when that extra control is not needed.

## Official Documentation

- [ko: Go Packages](https://ko.build/advanced/go-packages/)
- [Go Package: `github.com/google/ko/pkg/build`](https://pkg.go.dev/github.com/google/ko/pkg/build)
- [Go Package: `github.com/google/ko/pkg/publish`](https://pkg.go.dev/github.com/google/ko/pkg/publish)
- [go-containerregistry: Authentication](https://pkg.go.dev/github.com/google/go-containerregistry/pkg/authn)
- [go-containerregistry: Remote Operations](https://pkg.go.dev/github.com/google/go-containerregistry/pkg/v1/remote)
- [OCI Image Specification](https://github.com/opencontainers/image-spec)
