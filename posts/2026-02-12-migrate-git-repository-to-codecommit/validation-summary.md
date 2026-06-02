# Validation Summary: How to Migrate a Git Repository to CodeCommit

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- AWS CodeCommit
- AWS CLI
- Git
- Git LFS
- git-filter-repo
- Git submodules
- GitHub
- GitLab
- Bitbucket

## Sources Consulted
- AWS CodeCommit User Guide: Migrate a Git repository to AWS CodeCommit - https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-migrate-repository-existing.html
- AWS CodeCommit User Guide: Quotas in AWS CodeCommit - https://docs.aws.amazon.com/codecommit/latest/userguide/limits.html
- AWS CodeCommit User Guide: HTTPS credential helper setup - https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-https-unixes.html
- AWS CodeCommit User Guide: SSH setup - https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-ssh-unixes.html
- AWS CodeCommit FAQ - https://aws.amazon.com/codecommit/faqs/
- AWS CLI Command Reference: codecommit create-repository - https://docs.aws.amazon.com/cli/latest/reference/codecommit/create-repository.html
- AWS CLI Command Reference: codecommit list-branches - https://docs.aws.amazon.com/cli/latest/reference/codecommit/list-branches.html
- AWS DevOps Blog: The Future of AWS CodeCommit - https://aws.amazon.com/blogs/devops/aws-codecommit-returns-to-general-availability/
- Git documentation: git-clone - https://git-scm.com/docs/git-clone
- Git documentation: git-push - https://git-scm.com/docs/git-push
- Git LFS documentation: git-lfs-migrate - https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-migrate.adoc
- git-filter-repo man page - https://manpages.debian.org/testing/git-filter-repo/git-filter-repo.1.en.html

## Issues Found
- The Git LFS conversion example used a placeholder `git filter-repo --blob-callback` that did not convert LFS pointers into real file contents. Replaced it with `git lfs migrate export --everything --include="*"`, which is the documented Git LFS command for converting LFS pointers back into regular Git blobs.
- The original LFS example ran working-tree commands such as `git add` and `git commit` after changing into a mirror clone, which is a bare repository. Updated the workflow to use a normal clone for LFS conversion, then push rewritten branches and tags to CodeCommit.
- The large-file limits were inaccurate. The post said repositories could hit limits for files over 6 MB or total repository size over 2 GB. Updated this to match AWS CodeCommit quotas: 2 GB is the single Git blob limit, while the 6 MB file limit applies to console/API/AWS CLI file operations rather than normal Git pushes.
- The submodule check used `cat .gitmodules`, which fails when the repository has no submodule configuration file. Changed it to `test -f .gitmodules && cat .gitmodules`.
- The Git LFS support statement was made conditional because AWS has announced Git LFS support on the CodeCommit roadmap; the migration workaround is still relevant when native support is unavailable for the target account or Region.

## Review Notes
Most Git and AWS CLI commands in the migration flow match official AWS and Git documentation. `git push --mirror` is powerful and mirrors all refs, including deletes and force updates, so teams should use it only against the intended empty destination repository.
