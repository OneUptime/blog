# Validation Summary: How to Fix Docker 'Exec Format Error' on Multi-Platform Images

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Buildx and BuildKit
- Multi-platform container images and OCI image indexes
- QEMU user-mode emulation and binfmt_misc
- Dockerfile automatic platform build arguments
- GitHub Actions Docker build workflows

## Sources Consulted
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Build exporters - https://docs.docker.com/build/exporters/
- Docker Docs: Dockerfile reference, automatic platform ARGs - https://docs.docker.com/reference/builder
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: docker manifest CLI reference - https://docs.docker.com/reference/cli/docker/manifest/
- Docker Docs: containerd image store - https://docs.docker.com/desktop/features/containerd/
- Docker Docs: Multi-platform image with GitHub Actions - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker GitHub Action: build-push-action - https://github.com/docker/build-push-action
- Docker GitHub Action: setup-buildx-action - https://github.com/docker/setup-buildx-action
- Docker GitHub Action: login-action - https://github.com/docker/login-action
- Local Docker CLI help for `docker buildx build`, `docker buildx create`, `docker manifest inspect`, and `docker pull`

## Issues Found
- The post said Docker sometimes "gets it wrong" when pulling multi-platform images. Docker documentation says Docker selects the matching platform from a manifest list based on the host architecture, so the wording was changed to cover the real cases: missing platform support or an intentional non-native variant.
- The `docker buildx inspect --bootstrap` comment said it downloads QEMU emulators. Docker documentation treats QEMU/binfmt setup as a separate installation step, so the comment was corrected to simply say it bootstraps the builder.
- The post said `--push` is required because Docker cannot store multi-platform images locally. This is outdated for Docker setups using the containerd image store, so the text now explains that pushing is the most portable output and that local multi-platform storage depends on the image store.
- The local-load example said it built for the current platform while hardcoding `linux/arm64`. The comment now says it builds one platform and loads it locally.
- The QEMU setup command used `multiarch/qemu-user-static`. Docker's current documentation recommends `tonistiigi/binfmt --install all`, so the command was updated.
- The QEMU performance claim gave a fixed "5-10x slower" estimate. Docker documentation only states that emulation can be much slower, especially for CPU-heavy work, so the wording was generalized.
- The QEMU examples used architecture-prefixed Alpine image names and said images from any architecture could run. The examples now use the standard multi-platform `alpine` image with `--platform`, and the wording now says supported non-native Linux images.
- The GitHub Actions example used older Docker action majors. The workflow was updated to current Docker documentation examples: `docker/setup-qemu-action@v4`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, and `docker/build-push-action@v7`.

## Review Notes
The remaining commands and Dockerfile snippets are technically valid for a BuildKit/Buildx workflow. The example Dockerfile assumes a Go project with `./cmd/server`; that is appropriate as illustrative code but would need path adjustment for a different project layout.
