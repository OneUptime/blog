# Validation Summary: Parent Devfile or Self-Contained Devfile? Choosing the Right Reuse Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Devfile 2.3.0 schema and Devfile parent inheritance
- Devfile registries, URI parents, and Kubernetes `DevWorkspaceTemplate` parents
- YAML configuration
- Devfile library parsing, merging, variable substitution, and validation
- odo v3 and JSON output
- jq
- Go build, run, and test commands
- OCI container image references and digests

## Sources Consulted
- [Referring to a parent Devfile](https://devfile.io/docs/2.3.0/referring-to-a-parent-devfile)
- [Devfile 2.3.0 schema documentation](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3.0 JSON Schema](https://devfile.io/devfile-schemas/2.3.0.json)
- [Devfile library documentation](https://devfile.io/docs/2.3.0/library)
- [Devfile validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Adding a Devfile command group](https://devfile.io/docs/2.3.0/adding-a-command-group)
- [Adding a Devfile exec command](https://devfile.io/docs/2.3.0/adding-an-exec-command)
- [Official Devfile registry v2 index](https://registry.devfile.io/v2index/all)
- [Official `go:2.6.0` registry Devfile](https://registry.devfile.io/devfiles/go/2.6.0)
- [odo `describe component` documentation](https://odo.dev/docs/command-reference/describe-component/)
- [odo JSON output documentation](https://odo.dev/docs/command-reference/json-output/)
- [odo effective-Devfile parsing source](https://github.com/redhat-developer/odo/blob/5645314ac512b08df3781372763fb8d43ef392d4/pkg/devfile/devfile.go)
- [odo component-description source](https://github.com/redhat-developer/odo/blob/5645314ac512b08df3781372763fb8d43ef392d4/pkg/component/describe/describe.go)
- [Go command documentation](https://go.dev/cmd/go/)
- [jq manual](https://jqlang.org/manual/dev/)
- [Docker image digest documentation](https://docs.docker.com/dhi/explore/security-concepts/digests/)

## Issues Found
- The public registry example pinned deprecated `go:1.2.0`. Updated it to the registry's current, non-deprecated default `go:2.6.0` and changed the child schema from 2.2.0 to 2.3.0 so it is not older than the parent's 2.2.2 schema.
- The Kubernetes parent description referred to a generic Kubernetes resource. Clarified that this parent form specifically references a `DevWorkspaceTemplate` custom resource.
- The override explanation did not state where overrides belong. Clarified that overrides are declared within the `parent` object and matched by component `name` or command `id`, while new child elements remain in the top-level lists.
- The parsing description implied that all parses necessarily return flattened content. Reworded it to describe the operations used to produce an effective Devfile.
- The list of centrally managed content presented security-context defaults as a standard Devfile field. Qualified this as consumer-specific security defaults expressed through supported attributes.
- The self-contained comparison said the repository was sufficient for source availability and implied offline startup had no other dependencies. Corrected the table and checklist to state that images and other remote content must still be pinned and available or mirrored.
- The self-contained example description said review exposes the image itself. Corrected this to “image reference,” which is what the YAML contains.

## Review Notes
- All seven YAML snippets parse successfully. The Devfile field names, command groups, component references, resource quantity, and special `${PROJECT_SOURCE}` usage match the 2.3.0 schema and odo examples.
- The Go commands are valid, but `go run ./cmd/server` assumes that the example application has a main package at that path.
- `registry.example.com`, `platform.example.com`, and `REPLACE_WITH_DIGEST` are intentional placeholders and must be replaced with real, reachable values.
- The `odo describe component -o json` path `.devfileData.devfile` is documented, and current odo source obtains the effective Devfile with parent content flattened and Kubernetes URI content inlined. As the post notes, behavior should still be checked against the deployed odo version.
- The official `go:2.6.0` parent currently contains tag-based image references, so pinning that parent version alone does not make the environment fully reproducible. The post correctly requires images and other remote references to be pinned as well.
