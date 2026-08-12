# Validation Summary: How to Run Only the Changed Service in a Woodpecker Monorepo

## Status
validated

## Post Type
Technical guide / CI configuration tutorial

## Technologies Covered
- Woodpecker CI 3.15 and newer
- Woodpecker workflow-level and step-level `when` conditions
- Monorepo path filtering and dependency impact maps
- YAML workflow configuration
- doublestar glob patterns
- Optional workflow dependencies
- Docker Buildx plugin and container registries
- Go 1.26 container builds
- Alpine Linux containers

## Sources Consulted
- Woodpecker workflow syntax, path conditions, global conditions, `directory`, workspaces, and optional `depends_on`: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker multiple workflows, dependency names, optional dependencies, and workspace isolation: https://woodpecker-ci.org/docs/usage/workflows
- Woodpecker project pipeline-path resolution: https://woodpecker-ci.org/docs/usage/project-settings
- Woodpecker changed-files environment documentation: https://woodpecker-ci.org/docs/usage/environment
- Woodpecker secret event filters: https://woodpecker-ci.org/docs/usage/secrets
- Woodpecker Docker Buildx plugin settings: https://woodpecker-ci.org/plugins/docker-buildx
- Woodpecker server `WOODPECKER_PLUGINS_PRIVILEGED` configuration: https://woodpecker-ci.org/docs/administration/configuration/server#plugins_privileged
- Woodpecker migration notes for privileged plugins: https://woodpecker-ci.org/migrations
- Woodpecker 3.15.0 release notes, which introduced optional `depends_on` entries: https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.15.0
- Woodpecker 3.17.0 release notes: https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0
- Woodpecker 3.17.0 path-condition implementation: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/constraint/path.go
- doublestar v4 pattern documentation: https://github.com/bmatcuk/doublestar/tree/v4.10.0
- Go release history: https://go.dev/doc/devel/release
- Official Go container image: https://hub.docker.com/_/golang
- Official Alpine container image and release branches: https://hub.docker.com/_/alpine and https://alpinelinux.org/releases/

## Issues Found
- **The stated Woodpecker version range was too broad.** Optional object dependencies were introduced in Woodpecker 3.15.0, so the guide did not apply to every 3.x release. The introduction now targets Woodpecker 3.15 or newer, and the optional-dependency section identifies 3.15 as the minimum version.
- **The publishing workflow's impact set omitted relevant files.** Its filter did not include `go.work`, `go.work.sum`, or its own `.woodpecker/billing.yaml`, even though changes to those files can affect the workflow. Those paths were added to the example.
- **Custom-registry authentication was incomplete.** The Docker Buildx plugin defaults its `registry` setting to Docker Hub, so credentials in the example would not authenticate `registry.example.com` merely because that host appeared in `repo`. The example now sets `registry: registry.example.com` explicitly.
- **The Docker Buildx example omitted its privilege requirement and used an unpinned plugin image.** The plugin starts Docker-in-Docker and does not work on a default Woodpecker 3.x installation unless the administrator grants it privileged execution. The image is now pinned to `6.1.1`, and the post documents allowlisting that exact image with `WOODPECKER_PLUGINS_PRIVILEGED`.
- **Required dependency behavior was imprecise.** A required dependency that is filtered out does not merely leave the downstream workflow blocked; Woodpecker excludes the downstream workflow from the pipeline. The explanation now states that exact behavior.
- **Workspace sharing was described too broadly.** Steps share only the workflow workspace, not every file produced anywhere in their containers, and external artifact storage does not make separate workspaces shared. The relevant wording now limits visibility to outputs written into the shared workspace and describes external storage as an explicit cross-workflow transfer mechanism.

## Review Notes
- All four complete workflow examples were checked with the Woodpecker 3.17.0 CLI linter in strict mode and passed. The current Woodpecker path-constraint test package also passed.
- The documented pull-request changed-file scope, `on_empty` default, `ignore_message` bypass, include/exclude behavior, global workflow filtering, workflow discovery, custom pipeline-directory trailing slash, dependency naming, and separate-workspace behavior match Woodpecker 3.17.0.
- The doublestar examples match v4.10.0 semantics, including recursive `**`, single-component `*`, forward-slash path matching, and the need to quote YAML scalars beginning with `*`.
- Go 1.26 and the `golang:1.26` image are valid as of the validation date. Alpine 3.22 remains supported, although it is not the newest Alpine branch.
- Docker Buildx plugin `6.1.1` is intentionally pinned and should be reviewed when the plugin is upgraded.
