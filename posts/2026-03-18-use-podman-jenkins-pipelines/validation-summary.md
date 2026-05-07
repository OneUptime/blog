# Validation Summary: How to Use Podman in Jenkins Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Jenkins Pipeline
- Jenkins Credentials Binding
- Bash
- PostgreSQL container image
- Rootless Linux containers

## Sources Consulted
- Podman documentation overview: https://docs.podman.io/en/latest/
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- `podman-login(1)`: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- `podman-pod-create(1)`: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- `podman-pull(1)`: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- `podman-image-prune(1)`: https://docs.podman.io/en/stable/markdown/podman-image-prune.1.html
- Jenkins Pipeline Syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Credentials Binding reference: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins `sh` step reference: https://www.jenkins.io/doc/pipeline/steps/workflow-durable-task-step/
- GNU Bash Startup Files reference: https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html

## Issues Found
1. **The introduction and summary overstated the scope of the post**: the article said it covered both declarative and scripted pipelines, but all examples were declarative. Updated those sentences to describe declarative/Jenkins pipelines accurately.

2. **The installation snippet referenced `fuse-overlayfs` without installing it and omitted rootless prerequisites**: Podman rootless mode requires subordinate UID/GID mappings, and current Podman rootless networking requires a helper such as `passt`. Updated the installation guidance to mention those prerequisites and added `fuse-overlayfs` and `passt` to the Ubuntu install command.

3. **The registry login example exposed the password on the command line**: `podman login -p ...` is valid, but it places the secret in process arguments. Replaced it with `printf ... | podman login --password-stdin` and disabled shell tracing around the login command.

4. **The cleanup step did not remove the tagged images built by the pipeline**: `podman image prune -f` only removes dangling images. Changed it to `podman image prune -af` so the post-build cleanup matches the stated goal of reclaiming agent disk space.

5. **The integration-test example used an unqualified Postgres image name**: Podman short-name resolution can be ambiguous or interactive in CI environments. Replaced `postgres:16` with `docker.io/library/postgres:16`.

6. **The database readiness check was too brittle**: a fixed `sleep 5` followed by a single `pg_isready` call is not reliable on slower agents. Replaced it with a retry loop that waits for PostgreSQL to become ready.

7. **The integration-test pod unnecessarily published port 5432 to the host**: the test container and database share the pod network namespace, so host port publishing is not needed and can fail if the agent already has that port in use. Removed the host port mapping.

8. **The Docker alias section was too absolute for Jenkins**: a `~jenkins/.bashrc` alias does not apply to Jenkins `sh` steps, because Jenkins runs the system shell non-interactively. Clarified that the `.bashrc` alias is for interactive Bash sessions only and softened the compatibility claim to “many commands” / “minimal changes.”

9. **The branch condition needed Jenkins-specific context**: `when { branch 'main' }` is valid for multibranch pipelines. Added a note in the example so readers do not assume it works the same way in every pipeline job type.

## Review Notes
- `podman login` stores credentials in `${XDG_RUNTIME_DIR}/containers/auth.json` by default on Linux, which does not persist across reboot. The example is still correct because it logs in immediately before pushing, but persistent credentials would require `--authfile ~/.config/containers/auth.json`.
- The post’s rootless examples assume the agent filesystem and kernel support rootless Podman appropriately. The added `fuse-overlayfs` configuration is valid for a user-owned `storage.conf`, but some modern kernels can also use native rootless overlay without an explicit user config file.
- No remaining technical inaccuracies were found after the edits.
