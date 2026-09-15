# Validation Summary: How to Pull Private Build Images in Drone with `image_pull_secrets`

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Drone Docker pipelines
- Drone CLI repository secrets
- Docker registry authentication and `config.json`
- Python 3 standard library
- POSIX-compatible shell commands

## Sources Consulted

- [Drone: Images](https://docs.drone.io/pipeline/docker/syntax/images/)
- [Drone: Docker Pipeline YAML](https://docs.drone.io/yaml/docker/)
- [Drone CLI: `drone secret add`](https://docs.drone.io/cli/secret/drone-secret-add/)
- [Docker CLI: `docker login`](https://docs.docker.com/reference/cli/docker/login/)
- [Docker CLI configuration file](https://docs.docker.com/reference/cli/docker/)
- [Python: `base64`](https://docs.python.org/3/library/base64.html)
- [Python: `getpass`](https://docs.python.org/3/library/getpass.html)
- [Python: `os.open`](https://docs.python.org/3/library/os.html#os.open)

## Issues Found

- The text required removal of the temporary credential directory even if secret upload failed, but the example had no cleanup handler for interruption or early shell exit. Added an `EXIT` trap immediately after directory creation and disabled it after explicit cleanup.

## Review Notes

- The `image_pull_secrets` field, Docker configuration JSON shape, `drone secret add --data @file` usage, credential-helper warning, and shared Docker image-cache warning agree with the official documentation.
- `pull: always` is appropriate for avoiding a normal cache-only success during credential verification, although registry and daemon behavior ultimately determine pull details.
