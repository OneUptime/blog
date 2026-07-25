# Validation Summary: How to Inspect the Fully Resolved Devfile After Parent Inheritance

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Devfile 2.2.0 and 2.3.0
- Devfile parent inheritance, overrides, variables, and validation
- Devfile Go library v2
- Go and `sigs.k8s.io/yaml`
- odo v3
- YAML, JSON, `jq`, and `curl`
- Kubernetes and OpenShift resources

## Sources Consulted
- [Devfile 2.3.0: Referring to a parent devfile](https://devfile.io/docs/2.3.0/referring-to-a-parent-devfile)
- [Devfile 2.3.0: Library](https://devfile.io/docs/2.3.0/library)
- [Devfile 2.3.0 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3.0 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.2.0: Defining variables](https://devfile.io/docs/2.2.0/defining-variables)
- [Devfile Library v2.4.0 release](https://github.com/devfile/library/releases/tag/v2.4.0)
- [Devfile Library v2.4.0 `ParseDevfileAndValidate` source](https://github.com/devfile/library/blob/v2.4.0/pkg/devfile/parse.go)
- [Devfile Library v2.4.0 parser arguments and flattening source](https://github.com/devfile/library/blob/v2.4.0/pkg/devfile/parser/parse.go)
- [odo: `describe component`](https://odo.dev/docs/command-reference/describe-component/)
- [odo: JSON output](https://odo.dev/docs/command-reference/json-output/)
- [odo v3.16.1 effective Devfile parsing source](https://github.com/redhat-developer/odo/blob/v3.16.1/pkg/devfile/devfile.go)
- [Red Hat: odo deprecation and end-of-life dates](https://developers.redhat.com/articles/2025/10/23/odo-cli-deprecated-what-developers-need-know)

## Issues Found
- The post described odo's implementation as current even though odo was deprecated on October 23, 2025 and reached end of life on March 31, 2026. Added those dates, scoped the odo instructions to existing pinned v3.16.1 workflows, changed the implementation description from current to final, and noted that odo no longer receives maintenance or security updates.
- The Go setup pinned Devfile Library v2.3.0, while v2.4.0 is the current release. Updated the command to v2.4.0 and documented its Go 1.24 minimum.
- The parent-override discussion said a matching top-level component would add child content. A top-level component with the same identifier as an inherited parent component is rejected during flattening rather than applied as an override. Clarified that the override must be placed in the `parent` scope.
- The duplicate-default section suggested querying odo's resolved JSON after explaining that semantic validation fails. odo does not emit that JSON when validation fails. Clarified that the query requires an artifact from a resolver that exposes pre-validation data, and documented practical alternatives using the validation error or a temporary non-default command.
- The networking requirement was stated for all URI parents even though a URI can be a local relative path. Qualified the requirement as applying to remote registry and URI parents.

## Review Notes
- The Devfile YAML examples, special `${PROJECT_SOURCE}` variable syntax, top-level `{{RUNTIME_IMAGE}}` substitution syntax, excluded substitution fields, parent-scoped overrides, and single-default-per-command-group rule match the cited Devfile schemas and validation rules.
- The `odo describe component -o json` command and `.devfileData.devfile` JSON path match the final odo v3 documentation and implementation, but odo is no longer suitable as a new supported dependency.
- The `ParseDevfileAndValidate` example uses the current, non-deprecated API. `FlattenedDevfile` and `ConvertKubernetesContentInUri` remain valid parser arguments in Devfile Library v2.4.0.
- The `example.com` registry and image URLs are clearly illustrative rather than live dependencies.
