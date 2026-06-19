# Validation Summary: How to Handle Git Rebase vs Merge Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Git merge
- Git rebase
- Git pull and push workflows
- Git configuration
- Mermaid Git diagrams

## Sources Consulted
- Git merge documentation: https://git-scm.com/docs/git-merge
- Git rebase documentation: https://git-scm.com/docs/git-rebase
- Git config documentation: https://git-scm.com/docs/git-config
- Git pull documentation: https://git-scm.com/docs/git-pull
- Git push documentation: https://git-scm.com/docs/git-push
- Local Git CLI help from Git 2.43.0: `git merge -h`, `git rebase -h`, `git pull -h`, `git push -h`

## Issues Found
- The post said merge always creates a new commit. This is only true when a fast-forward is not possible or when a merge commit is forced, so the text and comparison table were updated to account for fast-forward merges.
- The team collaboration example said `git pull origin feature-branch` creates merge commits. It may fast-forward instead, so the wording was changed to "may create merge commits."
- The rebase-before-PR example said the pull request will have no merge conflicts. This is only true relative to the current `origin/main`; conflicts can reappear if the target branch advances, so the wording was narrowed.
- The merge strategy section called `recursive` the default strategy. Current Git documentation says `ort` is the default for a single branch and `recursive` is now a synonym for `ort`, so the section was corrected.
- The reflog recovery example implied a specific reflog index for the pre-rebase commit. Reflog positions vary, so the comment was changed to make the index clearly an example.

## Review Notes
The remaining commands and configuration examples are technically valid. The advice around force-pushing shared branches is correct, though teams may want stricter local guidance around `--force-with-lease` because Git documents caveats when background fetches update remote-tracking refs.
