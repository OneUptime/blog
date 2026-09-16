# Validation Summary: How to Build Change-Aware Drone Pipelines for Large Monorepos Without Running Every Service

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone Docker pipelines
- Monorepo CI/CD
- Git diff and object validation
- Python
- YAML
- Docker images

## Sources Consulted
- [Drone Docker pipeline schema](https://docs.drone.io/yaml/docker/)
- [Drone pipeline triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/)
- [Drone Docker pipeline workspace](https://docs.drone.io/pipeline/docker/syntax/workspace/)
- [Drone configuration extension](https://docs.drone.io/extensions/configuration/)
- [Drone `DRONE_COMMIT_BEFORE` reference](https://docs.drone.io/pipeline/environment/reference/drone-commit-before/)
- [Drone `DRONE_COMMIT_AFTER` reference](https://docs.drone.io/pipeline/environment/reference/drone-commit-after/)
- [Git `git-diff` documentation](https://git-scm.com/docs/git-diff)
- [Git `git-cat-file` documentation](https://git-scm.com/docs/git-cat-file)
- [Python `subprocess` documentation](https://docs.python.org/3/library/subprocess.html)
- [Python `pathlib` documentation](https://docs.python.org/3/library/pathlib.html)
- [Docker Official Image for Alpine Linux](https://hub.docker.com/_/alpine)
- [Docker Official Image for Node.js](https://hub.docker.com/_/node)

## Issues Found
No technical issues found.

## Review Notes
The selective execution example deliberately saves CI work inside already scheduled steps; avoiding step or pipeline scheduling requires configuration generation, as the post explains. The floating minor image tags (`alpine:3.22` and `node:24`) are valid as of validation but may resolve to newer patch releases over time. The conservative full-run behavior for pull requests, unavailable Git objects, shared code, and unknown paths is appropriate.
