# Validation Summary: How to Deploy Drone CI via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Drone CI (server v2, docker runner v1)
- Portainer (Stacks)
- Docker / Docker Compose
- Gitea (OAuth2 integration)
- Drone CLI
- Drone Docker plugin (`plugins/docker`)

## Sources Consulted
- Drone server with Gitea documentation: https://docs.drone.io/server/provider/gitea/
- Drone Docker runner installation: https://docs.drone.io/runner/docker/installation/linux/
- Drone CLI installation: https://docs.drone.io/cli/install/
- Drone variable substitution: https://docs.drone.io/pipeline/environment/substitution/
- Drone user admin docs: https://docs.drone.io/server/user/admin/
- Drone CLI source repository: https://github.com/harness/drone-cli (module path `github.com/drone/drone-cli` per `go.mod`)

## Issues Found
- **`go install` path was incorrect.** The blog instructed `go install github.com/harness/drone-cli/drone@latest`. While the GitHub repository is hosted at `github.com/harness/drone-cli`, the Go module path declared in the repo's `go.mod` is `github.com/drone/drone-cli`, and internal imports also reference `github.com/drone/drone-cli/...`. Installing from the harness path fails because the module path does not match. Changed the command to `go install github.com/drone/drone-cli/drone@latest`, which matches the actual module declaration.

## Review Notes
- The `version: "3.8"` declaration in the Compose file is technically obsolete in modern Docker Compose (the `version` key is ignored), but it is still accepted and does not cause errors. Left as-is.
- The official Drone CLI installation method is via prebuilt binary download (curl/brew/scoop). The `go install` path used in the post is not officially documented but works given the repo's package layout (`drone/main.go` exists).
- The `DRONE_USER_CREATE=username:admin,admin:true` syntax is valid: it provisions an admin-flagged user whose username happens to be `admin`.
- The `${DRONE_COMMIT_SHA:0:8}` substring substitution syntax is valid Drone substitution syntax.
- Drone server v2 has not received feature updates from Harness in some time; users evaluating CI/CD platforms today should be aware that Drone is in maintenance mode and Harness pushes Harness CI as the active successor product. This is informational, not a correctness issue.
