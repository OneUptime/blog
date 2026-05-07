# Validation Summary: How to Use Skopeo in CI/CD Pipelines with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Skopeo
- GitHub Actions
- GitLab CI/CD
- Trivy
- OCI image layouts
- Container registries

## Sources Consulted
- GitHub Actions runner image software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- GitHub-hosted runners customization docs: https://docs.github.com/en/actions/how-tos/using-github-hosted-runners/using-github-hosted-runners/customizing-github-hosted-runners
- Podman login documentation: https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman manifest create documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman manifest add documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Skopeo project documentation and authentication notes: https://github.com/containers/skopeo
- Skopeo copy command documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Official Podman container image definition: https://raw.githubusercontent.com/containers/image_build/main/podman/Containerfile
- Official Skopeo container image definition: https://raw.githubusercontent.com/containers/image_build/main/skopeo/Containerfile
- GitLab Runner Docker executor docs, including Podman usage and image entrypoint requirements: https://docs.gitlab.com/runner/executors/docker/
- GitLab CI script syntax docs: https://docs.gitlab.com/ci/yaml/script/
- Trivy image command reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/
- Trivy container image target docs, including OCI layout support: https://trivy.dev/docs/dev/guide/target/container_image/

## Issues Found
- The GitLab `build` job called `skopeo copy` from `quay.io/podman/stable`, but the official Podman image definition installs `podman` and related packages, not `skopeo`. I added `dnf -y install skopeo` before the copy step.
- The GitLab `promote-to-production` job used `podman login` inside `quay.io/skopeo/stable`. The official Skopeo image is built around the `skopeo` CLI and sets `ENTRYPOINT ["/usr/bin/skopeo"]`. I changed the job to clear the entrypoint and pass credentials with `skopeo copy --src-creds/--dest-creds`.
- The Trivy example exported the image with Skopeo’s `dir:` transport and then passed that directory to `trivy image --input`. Trivy’s documented `--input` targets include tar archives and OCI layouts, not Skopeo’s `dir:` transport. I changed the export to `oci:${SCAN_DIR}`.
- The opening summary described the workflow as rootless in absolute terms. I adjusted the wording to say the workflow can run rootlessly, which matches the documented capability without overstating it for every CI environment.
- The GitLab section did not mention that the runner must be configured to use Podman as the container runtime. I added that prerequisite so the example matches GitLab’s documented Podman setup.

## Review Notes
- The GitHub Actions example is currently valid because the official `ubuntu-latest` runner image includes both Podman and Skopeo, although the explicit `apt` install for Skopeo is redundant.
- The multi-architecture example uses `podman build --platform ...`; non-native builds require emulation support or native runners for those architectures, as documented by Podman.
- The standalone promotion script assumes registry authentication is already configured in the environment through `podman login`, `skopeo login`, or an auth file.
