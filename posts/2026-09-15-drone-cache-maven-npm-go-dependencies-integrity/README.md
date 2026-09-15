# How to Cache Maven, npm, and Go Dependencies in Drone Without Reusing Corrupt State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Caching, Maven, Go

Description: Design Drone dependency caching around tool-managed integrity checks, isolated cache directories, explicit cache keys, and verified snapshots.

A dependency cache should reduce downloads without deciding whether a build is correct. A missing or rejected cache should lead to a normal dependency resolution, while a failed test or integrity check should remain visible.

Drone's Docker workspace is ephemeral and shared only within a pipeline. Cross-build caching needs an external repository proxy, object store, or another deliberately managed persistence mechanism. A workspace directory alone is not a persistent cache. [Drone workspace behavior](https://docs.drone.io/pipeline/docker/syntax/workspace/)

## Cache the dependency store, not arbitrary build output

Different tools have different storage contracts:

| Tool | Useful caching boundary | Avoid treating as interchangeable |
|---|---|---|
| npm | Download cache used by `npm ci` | A copied `node_modules` tree from another platform |
| Go | Module download cache and, separately, build cache | Generated binaries from another toolchain or architecture |
| Maven | Repository-manager proxy and a tool-managed local repository | A shared live directory modified by unrelated builds |

Keep credentials outside saved cache paths. In particular, do not archive whole home directories containing `.npmrc`, Maven settings, cloud credentials, or SSH keys.

## Use npm's integrity handling with a clean installation

In a Node image, these commands make the download cache explicit:

```bash
mkdir -p .ci-cache/npm
npm cache verify --cache .ci-cache/npm
npm ci --cache .ci-cache/npm --prefer-offline
npm test
```

The project needs a committed lockfile and a test script. `npm ci` removes an existing `node_modules` directory, checks lockfile consistency, and does not rewrite the lockfile. Caching downloads therefore preserves a clean dependency installation. [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

npm documents its cache as integrity-checked and self-healing. Prefer `npm cache verify` and a fresh download over routinely deleting the entire cache. Do not suppress an installation error with `|| true`; it may reflect an invalid lockfile, authentication failure, or package script failure rather than cache corruption. [npm cache behavior](https://docs.npmjs.com/cli/v11/commands/npm-cache/)

For a corrupt external cache snapshot, quarantine that snapshot and rerun with a newly created cache directory. If the cold build still fails, investigate dependencies or the project rather than repeatedly changing cache keys.

## Keep Go module and build caches separate

For a module-based Go project, put each cache in its own directory:

```bash
export GOMODCACHE="$PWD/.ci-cache/go-mod"
export GOCACHE="$PWD/.ci-cache/go-build"

go mod download
go mod verify
go test -mod=readonly -count=1 ./...
git diff --exit-code -- go.mod go.sum
```

The explicit test count avoids reusing a prior successful test result when you want tests to execute again. The build cache can still accelerate compilation. Native C dependencies deserve additional attention because Go documents limitations in detecting changes to C libraries used through cgo. [Go build and test caching](https://pkg.go.dev/cmd/go#hdr-Build_and_test_caching)

`go mod verify` checks whether downloaded module archives and extracted files have changed relative to their recorded cache hashes. Download authentication and `go.sum` checking provide related but distinct checks. `verify` alone does not authenticate a cache supplied by an arbitrary writer who can replace its metadata too. [Go module-cache verification](https://go.dev/ref/mod#go-mod-verify)

On an integrity failure, retain the failure details and use a fresh job-owned module cache for a controlled cold run. Avoid modifying a shared live cache while another job is reading it.

## Prefer a repository proxy for shared Maven downloads

Maven's local repository contains both downloaded dependencies and locally installed artifacts. Maven warns that manually manipulating its layout can bypass locking and synchronization and may not work with different repository implementations. That makes a writable host-mounted `.m2` shared by many independent jobs a poor default. [Maven local repositories](https://maven.apache.org/repositories/local.html)

An internal repository manager can cache upstream downloads while each pipeline uses a separate local repository. A settings file can redirect Maven Central to that proxy:

```xml
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <mirrors>
    <mirror>
      <id>central-cache</id>
      <mirrorOf>central</mirrorOf>
      <url>https://packages.example.com/maven-central/</url>
    </mirror>
  </mirrors>
</settings>
```

The URL represents an already-provisioned repository proxy. Authentication, if needed, belongs in a separately supplied settings secret. Use `mirrorOf` deliberately: `central` redirects Central, while `*` requires the proxy to serve every needed repository. [Maven mirror configuration](https://maven.apache.org/guides/mini/guide-mirror-settings.html)

Then use the project's Maven wrapper:

```bash
./mvnw -B \
  -s ci/settings.xml \
  -Dmaven.repo.local="$PWD/.ci-cache/maven" \
  verify
```

The proxy retains downloaded artifacts across builds; the pipeline's local repository remains isolated. This also avoids spreading artifacts produced by a local `install` from one branch into unrelated builds.

## Make external snapshots complete and attributable

For npm or Go snapshots, use a cache key containing a schema version, repository, trust scope, toolchain, platform, and dependency-input hash. Include all relevant workspace lockfiles, not only the root manifest. Keep the module cache and build cache in distinct key namespaces.

An illustrative npm key is:

```text
v3/acme/api/trusted/npm/node24/linux-amd64/<lockfile-sha256>/cache.tar.gz
```

Restore a completed snapshot into a fresh job-owned directory before any tool uses it. Publish only after dependency resolution, integrity checks, and the required build work succeed. Do not archive a cache while parallel steps are still modifying it.

For example, after a successful npm run and with AWS CLI available, create one completed archive and upload it:

```bash
tar -czf npm-cache.tar.gz -C .ci-cache/npm _cacache
aws s3 cp npm-cache.tar.gz \
  s3://ci-cache-example/v3/acme/api/trusted/npm/node24/linux-amd64/LOCK_HASH/cache.tar.gz
```

Replace the bucket and `LOCK_HASH` with the actual controlled destination and computed hash. Only npm's download-cache content is included, rather than its logs or the whole workspace. The transfer tool copies an already-completed object. [AWS CLI copy](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html)

Authenticate snapshot writers, validate archive paths before extraction, and enforce size and file-count limits. For Python-based restore tooling, use supported tar extraction filters and inspect the archive's members; Python explicitly warns that extraction filters do not eliminate every archive risk. [Python tar extraction guidance](https://docs.python.org/3/library/tarfile.html#extraction-filters)

## Verify the cache as an optimization

Test a cold run, a warm run, a changed lockfile, an invalid snapshot, and two concurrent builds. Confirm the same dependency inputs produce equivalent results and that a pull request cannot overwrite the trusted release cache.

Measure restore and upload time as well as dependency resolution time. A huge low-hit cache can cost more than it saves. Keep a documented key-version bump for invalidation, retain enough diagnostic metadata to identify bad snapshots, and let the package manager remain responsible for resolving and checking dependencies.
