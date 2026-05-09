# Validation Summary: How to Build an Image from a Git Repository with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Buildah
- Containerfile/Dockerfile image builds
- Git repository build contexts
- GitHub and GitLab authentication
- Container image build caching

## Sources Consulted
- Podman `podman-build` manual: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Buildah `buildah-build` manual: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab OAuth token documentation: https://docs.gitlab.com/api/oauth2/
- GitLab repository clone documentation: https://docs.gitlab.com/topics/git/clone/

## Issues Found
- The private repository example used `https://oauth2:${GITHUB_TOKEN}@github.com/...`, which is not the documented GitHub personal access token form and also missed the token-as-password separator. Changed it to a GitLab OAuth token example using `https://oauth2:${GITLAB_TOKEN}@gitlab.com/...`.
- The SSH private repository example used scp-style Git syntax. Changed it to an explicit `ssh://` Git URL so it fits Podman's documented URL-based build context handling.
- The caching section described `--cache-from` as using a previously built image. In Buildah/Podman, `--cache-from` is for repositories containing cache images, typically populated with `--cache-to`, and the option is tied to layered builds. Updated the text and example to use a remote cache repository with `--layers`, `--cache-to`, and `--cache-from`.
- The caching explanation said Git-based builds do not benefit from local build context caching. Refined this to the narrower, accurate point that the repository checkout still happens each time.

## Review Notes
Podman was not installed in the local workspace, so local CLI execution was not possible. The review used the current official Podman manual and the upstream Buildah manual because Podman build uses Buildah code for image builds. The branch, commit, and subdirectory URL fragment syntax is documented by Buildah as `myrepo.git#mybranch:subdir`, `myrepo.git#mycommit:subdir`, and `myrepo.git#:subdir`.
