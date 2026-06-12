# Validation Summary: How to Automate Releases with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Releases and release assets
- GitLab CLI (`glab`)
- semantic-release
- conventional-changelog
- Node.js
- npm publishing
- Docker image publishing
- Go cross-compilation
- Git tags
- Slack and SendGrid webhook notifications

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab Release CI/CD examples: https://docs.gitlab.com/user/project/releases/release_cicd_examples/
- GitLab Release CLI deprecation and migration guidance: https://docs.gitlab.com/user/project/releases/release_cli/
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab job rules reference: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab job artifacts documentation and API: https://docs.gitlab.com/ci/jobs/job_artifacts/ and https://docs.gitlab.com/api/job_artifacts/
- GitLab release fields documentation: https://docs.gitlab.com/user/project/releases/release_fields/
- semantic-release configuration documentation: https://semantic-release.gitbook.io/semantic-release/usage/configuration
- @semantic-release/gitlab plugin documentation: https://github.com/semantic-release/gitlab
- Node.js official release schedule: https://nodejs.org/en/about/previous-releases
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- npm publishing and CI authentication documentation: https://docs.npmjs.com/cli/v10/commands/npm-publish and https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow/
- Go command documentation for `GOOS` and `GOARCH`: https://pkg.go.dev/cmd/go
- Git tag documentation: https://git-scm.com/docs/git-tag

## Issues Found
- The examples used `registry.gitlab.com/gitlab-org/release-cli:latest`, but GitLab deprecated `release-cli` in GitLab 18.0 and now recommends the `glab` CLI image. Updated release jobs to use `registry.gitlab.com/gitlab-org/cli:latest`.
- Several examples used `node:20`, which is EOL as of 2026-06-12. Updated Node-based jobs to `node:24`, the current LTS line.
- The semantic-release example installed only `semantic-release` and `@semantic-release/gitlab` while the configuration also used commit analyzer, release notes, and changelog plugins. Updated the install commands to include all configured plugins.
- The semantic-release job tried to use a dotenv variable in `rules`, but GitLab evaluates rules before upstream dotenv artifacts are available. Moved the skip check into the job script and kept `needs` with artifacts enabled.
- The changelog snippet used a custom `prepare` stage without defining it. Added a minimal `stages` block so the snippet is valid.
- Release asset examples referenced undefined variables such as `BUILD_JOB_ID` and `PACKAGE_JOB_ID`, and used incorrect artifact URL paths. Replaced them with documented GitLab artifacts API URLs using `CI_API_V4_URL`, `CI_PROJECT_ID`, `CI_COMMIT_TAG`, and `job=...`.
- The multi-platform Go example did not specify a Go image and used Bash-only `[[ ... ]]` syntax in an Alpine job. Added a Go image for builds, added required Alpine packaging tools, and changed the archive loop to POSIX-compatible `case` syntax.
- The package publishing example used `docker login -p`, which Docker documents as less secure than `--password-stdin`. Updated it to pass the password through standard input.
- One YAML code fence contained nested triple-backtick Markdown blocks, causing the Markdown fence to terminate early. Changed the outer fence to four backticks and fixed the inner closing fences.
- The release branch example used `CI_COMMIT_BRANCH` together with `CI_COMMIT_TAG`, but `CI_COMMIT_BRANCH` is not available in tag pipelines. Reworked the rules to use tag naming patterns instead.
- The pre-release example implied GitLab has a release-level pre-release flag and wrote `PRERELEASE` to a file that was never consumed. Reworded the section to use pre-release tag names and updated the rules accordingly.
- The final tag validation script used Bash-specific regex syntax. Replaced it with a POSIX-compatible `grep -E` check.

## Review Notes
- The post is now accurate for current GitLab release jobs using `glab`. GitLab still documents fallback behavior for old release jobs, but new examples should use the GitLab CLI image.
- The examples remain illustrative and still assume the reader has project-specific credentials, package metadata, runner capabilities, and artifact retention configured appropriately.
