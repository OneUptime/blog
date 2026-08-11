# Validation Summary: Why Can Woodpecker Clone the Repository but Not Its Private Git Submodules?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Woodpecker CI workflow cloning, server settings, secrets, and trusted clone plugins
- `woodpeckerci/plugin-git` 2.9.2
- Git submodules, relative and overridden URLs, gitlinks, and shallow cloning
- Git HTTP credentials, netrc, HTTPS, TLS, DNS, and proxies
- Git LFS
- YAML workflow configuration and Alpine container images

## Sources Consulted
- Woodpecker workflow syntax and Git submodules: https://woodpecker-ci.org/docs/usage/workflow-syntax#git-submodules
- Woodpecker Git Clone plugin settings: https://woodpecker-ci.org/plugins/git-clone
- Woodpecker public-repository authentication and trusted-clone server settings: https://woodpecker-ci.org/docs/administration/configuration/server#authenticate_public_repos and https://woodpecker-ci.org/docs/administration/configuration/server#plugins_trusted_clone
- Woodpecker custom trusted clone plugins: https://woodpecker-ci.org/docs/usage/project-settings#custom-trusted-clone-plugins
- Woodpecker Docker backend volumes: https://woodpecker-ci.org/docs/administration/configuration/backends/docker#backend_docker_volumes
- Woodpecker secrets and pull-request event filtering: https://woodpecker-ci.org/docs/usage/secrets#events-filter
- Woodpecker clone troubleshooting: https://woodpecker-ci.org/docs/usage/troubleshooting#how-to-debug-clone-issues
- Woodpecker v3.17.0 bundled clone-plugin version: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/shared/constant/constant.go
- Git Clone plugin 2.9.2 implementation: https://github.com/woodpecker-ci/plugin-git/blob/2.9.2/plugin.go
- Git Clone plugin 2.9.3 release: https://github.com/woodpecker-ci/plugin-git/releases/tag/2.9.3
- Git submodule and `.gitmodules` documentation: https://git-scm.com/docs/git-submodule and https://git-scm.com/docs/gitmodules
- Git clone, config, remote, credentials, ls-tree, and ls-remote documentation: https://git-scm.com/docs/git-clone, https://git-scm.com/docs/git-config, https://git-scm.com/docs/git-remote, https://git-scm.com/docs/gitcredentials, https://git-scm.com/docs/git-ls-tree, and https://git-scm.com/docs/git-ls-remote
- curl netrc and redirect behavior: https://curl.se/docs/manpage.html
- Git LFS fetch documentation: https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-fetch.adoc
- OpenSSL `s_client` documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- Official image tags: https://hub.docker.com/v2/repositories/woodpeckerci/plugin-git/tags/2.9.2, https://hub.docker.com/v2/repositories/library/alpine/tags/3.22, and https://hub.docker.com/v2/repositories/alpine/git/tags/2.49.1
- Alpine release support schedule: https://www.alpinelinux.org/releases/

## Issues Found
1. The post implied that every successful parent clone receives forge credentials. Public repositories are cloned anonymously by default because `WOODPECKER_AUTHENTICATE_PUBLIC_REPOS` defaults to `false`. The opening, HTTPS guidance, diagnostic sequence, and conclusion now make authentication conditional and explain the public-parent case.
2. The post called plugin tag 2.9.2 a “current” tag even though standalone plugin-git 2.9.3 was released on 2026-08-05. The examples retain 2.9.2 because it is valid, non-deprecated, and Woodpecker 3.17.0's bundled default; the text now recommends a reviewed tag compatible with the installed Woodpecker release.
3. The post described `submodule_partial` as Git partial cloning. Plugin-git actually implements that setting with `git submodule update --depth=1 --recommend-shallow`. The explanation now identifies it as depth-one shallow cloning, distinguishes it from `--filter` partial clones, and notes that `.gitmodules` can still recommend shallow cloning when the plugin stops forcing depth one.
4. The trusted-clone explanation omitted the exception for repositories marked Trusted and could be read as saying that changing the server default clone image loses credentials. It now scopes the allowlist-only rule to repositories that are not Trusted and refers specifically to a workflow-level clone-image override.
5. The network diagnostic implied that `openssl` was available in the default clone image and that a direct `openssl s_client` connection tested proxy routing. The post now calls for a diagnostic image with the required tools, identifies the command as a direct-connect test, and requires Git or curl with the same proxy environment for proxy testing.
6. The private-CA advice incorrectly suggested installing the CA in the agent image, although Docker workflow steps run in separate containers. It now recommends the plugin's `custom_ssl_path` or `custom_ssl_url` setting, or a Docker backend CA-bundle mount through `WOODPECKER_BACKEND_DOCKER_VOLUMES`.
7. The nested-submodule commands were introduced as printing URLs “without credentials,” but `git remote -v` prints configured URLs verbatim. The warning now requires safe execution and redaction. The deprecated `git config --get-regexp` mode was also replaced with the current `git config get --all --show-names --regexp` syntax.
8. The LFS paragraph implied that the clone plugin's default LFS operation covers submodule repositories. Plugin-git runs its LFS fetch and checkout in the parent repository only. The post now requires an explicit authenticated LFS operation inside each submodule that uses LFS.

## Review Notes
- `woodpeckerci/plugin-git:2.9.2`, `alpine:3.22`, and `alpine/git:2.49.1` all exist. The latter two are valid reproducible pins; Alpine 3.22 remains supported through 2027-05-01.
- Plugin-git 2.9.3 and newer Alpine Git tags were available on the validation date, but that does not make the pinned versions invalid. Review image pins periodically for bug and security updates.
- The Woodpecker YAML clone mappings, snake_case setting names, `from_secret` syntax, recursive/update defaults, submodule override key semantics, Git commands, and external links were otherwise verified as correct.
