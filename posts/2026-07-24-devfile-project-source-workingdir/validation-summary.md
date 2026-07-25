# Validation Summary: PROJECT_SOURCE, sourceMapping, and workingDir: Devfile Source Paths

## Status

validated

## Post Type

Technical guide and configuration reference

## Technologies Covered

- Devfile 2.2.2
- odo 3.16.1
- Kubernetes development containers
- Project source synchronization
- YAML
- Docker Official Images for Node.js, Go, Python, and PostgreSQL

## Sources Consulted

- [Devfile 2.2.2 JSON Schema](https://devfile.io/devfile-schemas/2.2.2.json)
- [Devfile 2.2.2 schema reference](https://devfile.io/docs/2.2.2/devfile-schema)
- [Devfile 2.2.2: Creating Devfiles](https://devfile.io/docs/2.2.2/create-devfiles)
- [Devfile 2.2.2: Adding a container component](https://devfile.io/docs/2.2.2/adding-a-container-component)
- [Devfile 2.2.2: Adding projects](https://devfile.io/docs/2.2.2/adding-projects)
- [odo Devfile reference and special variables](https://odo.dev/docs/development/devfile/)
- [odo architecture: project source synchronization](https://odo.dev/docs/development/architecture/how-odo-works/)
- [odo: Pushing source files](https://odo.dev/docs/user-guides/advanced/pushing-specific-files/)
- [odo run command reference](https://odo.dev/docs/command-reference/run/)
- [odo JSON output and `describe component`](https://odo.dev/docs/command-reference/json-output/)
- [odo 3.16.1 installation and checksum instructions](https://odo.dev/docs/overview/installation/)
- [odo 3.16.1 release announcement](https://odo.dev/blog/odo-v3.16.1/)
- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement/)
- [odo 3.16.1 source synchronization integration tests](https://github.com/redhat-developer/odo/blob/v3.16.1/tests/integration/cmd_dev_test.go)
- [Go release history and support policy](https://go.dev/doc/devel/release)
- [Go Docker Official Image](https://hub.docker.com/_/golang)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Node.js Docker Official Image tags](https://hub.docker.com/_/node/tags?name=22)
- [Python 3.13 release schedule](https://peps.python.org/pep-0719/)
- [Python Docker Official Image tags](https://hub.docker.com/_/python/tags?name=3.13)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)

## Issues Found

- The main example declared `schemaVersion: 2.3.0`, but the final odo release rejects that version and reports support only through Devfile 2.2.2. The example and matching documentation links now use 2.2.2, and the text states the odo compatibility limit.
- The post described current odo behavior without noting that odo is deprecated. The behavior is now explicitly scoped to odo 3.16.1, and the post links to the official deprecation announcement.
- The source-mapping example used `golang:1.24`. Go 1.24 is no longer supported under Go's two-newer-major-releases policy, so the image was updated to the maintained `golang:1.26` tag.
- The PostgreSQL sidecar omitted the required `POSTGRES_PASSWORD` setting and would exit during first-time initialization. A clearly development-only password value was added so the configuration illustrates a runnable sidecar.
- The multiple-project example could be read as an odo workflow that clones every declared Git remote. The text now identifies it as a specification-level pattern for consumers that materialize all projects and explains that odo 3.16.1 instead synchronizes the current local directory into the first project's `clonePath` or name. The wording was also corrected to show that `clonePath` belongs to the project entry, not the nested Git definition.
- The diagnostic instructions invoked `odo run` without stating its runtime prerequisite. They now specify that an `odo dev` session must already be running and that `odo run` should be issued from another terminal.

## Review Notes

- The official odo 3.16.1 Apple Silicon binary was downloaded from the documented Red Hat mirror and matched its published SHA-256 checksum. `odo describe component -o json` rejected the original 2.3.0 example and successfully parsed the corrected 2.2.2 example.
- All ten YAML snippets parse successfully, and both Bash command blocks pass `bash -n`.
- Node.js 22 remains an LTS release, Python 3.13 remains in its supported security-fix period, and PostgreSQL 17 remains supported. Their referenced Docker Official Image tags are available as of the validation date.
- The remaining explanations of `PROJECTS_ROOT`, `PROJECT_SOURCE`, `mountSources`, `sourceMapping`, `workingDir`, ignore-file behavior, monorepository paths, image build contexts, and `odo describe component` match the consulted schema, documentation, and odo 3.16.1 behavior.
