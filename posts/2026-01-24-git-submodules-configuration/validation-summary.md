# Validation Summary: How to Configure Git Submodules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git
- Git submodules
- `.gitmodules` configuration
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline Git checkout

## Sources Consulted
- Git `git-submodule` documentation: https://git-scm.com/docs/git-submodule
- Git `gitmodules` documentation: https://git-scm.com/docs/gitmodules
- Git `gitsubmodules` documentation: https://git-scm.com/docs/gitsubmodules
- Git `git-rm` documentation: https://git-scm.com/docs/git-rm
- Git `git-clone` documentation: https://git-scm.com/docs/git-clone
- GitHub Actions `actions/checkout` README: https://github.com/actions/checkout
- GitLab CI/CD submodules documentation: https://docs.gitlab.com/ci/runners/git_submodules/
- Jenkins Git plugin Pipeline step documentation: https://www.jenkins.io/doc/pipeline/steps/params/git/

## Issues Found
- The branch-tracking section said submodules "track no branch" by default. Git's default `submodule update` behavior is to check out the recorded commit in detached HEAD state, while `git submodule update --remote` uses the remote HEAD unless `submodule.<name>.branch` is configured. Updated the wording to distinguish those behaviors.
- The working-inside-submodules diagram labeled the submodule internals as a `.git directory`. Modern submodules normally use a `.git` file with Git data stored under the superproject's `.git/modules` directory, so the diagram label was changed to "Git metadata."
- The removal steps described `rm -rf .git/modules/libs/shared-lib` as removing an entry from `.git/config`. `git submodule deinit` handles `.git/config`; the `rm -rf` command removes the submodule's local Git data under the superproject. Updated the comment.
- The `git submodule foreach` example used `$path`, which current Git documentation marks as a deprecated synonym for `$sm_path`. Updated the example and explanation to use `$sm_path`.

## Review Notes
The remaining Git commands, `.gitmodules` keys (`path`, `url`, `branch`, `shallow`, `ignore`), recursive clone/update examples, shallow submodule examples, and CI submodule checkout snippets align with the consulted documentation. The examples use placeholder repository URLs, which are appropriate for illustrative commands.
