# Validation Summary: How to Set Up Azure Repos Git LFS for Managing Large Binary Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Repos
- Azure DevOps Services
- Azure Pipelines YAML checkout
- Git LFS
- Git attributes
- Git history migration

## Sources Consulted
- Microsoft Learn: Work with large files in your Git repo - Azure Repos, https://learn.microsoft.com/en-us/azure/devops/repos/git/manage-large-files?view=azure-devops
- Microsoft Learn: Git limits - Azure Repos, https://learn.microsoft.com/en-us/azure/devops/repos/git/limits?view=azure-devops
- Microsoft Learn: Build Azure Repos Git repositories - Azure Pipelines checkout options, https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: steps.checkout definition, https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines
- Git LFS official repository documentation and command examples, https://github.com/git-lfs/git-lfs
- Git LFS migrate manual, https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-migrate.adoc
- Git LFS track manual, https://manpages.debian.org/trixie/git-lfs/git-lfs-track.1.en.html
- Git LFS lock manual, https://manpages.debian.org/trixie/git-lfs/git-lfs-lock.1.en.html

## Issues Found
- The post said Azure DevOps provides 1 GB of free LFS storage per organization. Current Microsoft documentation describes Git LFS as supported and free in Azure DevOps Services, and Azure Repos limits documentation says LFS objects do not count toward the normal Git push size limit. I replaced the storage-limit wording with accurate repository and LFS limit guidance.
- The authentication section said SSH keys work with Azure Repos Git LFS. Microsoft documentation states Azure Repos currently does not support SSH in repositories with Git LFS tracked files. I changed the guidance to use HTTPS credentials for LFS repositories.
- The explanation said clones only download pointer files initially. By default, Git LFS downloads file content needed for the current checkout, although downloads can be skipped or deferred. I clarified the clone/download behavior.
- The migration example used `git push --force` after `git lfs migrate import --everything`, which only force-pushes the current branch. I changed it to force-push all branches and tags with `git push --force --all` and `git push --force --tags`.
- The useful commands section described `git lfs env` as storage usage information. Git LFS documents this command as environment/configuration output useful for debugging, so I corrected the description.
- The useful commands section described `git lfs fetch --all` as general pre-fetching. Git LFS documents `--all` primarily for fetching all referenced LFS objects, which is most appropriate for backup or migration and can be large, so I corrected the description.
- The CI/CD best practice implied `fetchDepth: 1` avoids downloading LFS content for every commit. `fetchDepth` limits Git history; LFS download behavior is controlled by the checkout `lfs` setting. I adjusted the wording.

## Review Notes
The remaining Git LFS commands, `.gitattributes` syntax, pointer-file format, Azure Pipelines `checkout` YAML fields, and file-locking commands are consistent with the official documentation reviewed.
