# Validation Summary: How to Set Up OpenTofu with Jenkins Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI v1.7.0)
- Jenkins (declarative pipelines, Jenkinsfile)
- Jenkins Credentials Binding plugin (`withCredentials`)
- Jenkins Slack Notification plugin (`slackSend`)
- Jenkins jobcacher plugin (`cache`, `arbitraryFileCache`)
- AWS (used as the example provider for credential injection)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu releases on GitHub: https://github.com/opentofu/opentofu/releases
- OpenTofu `-chdir` global flag: https://opentofu.org/docs/cli/commands/#switching-working-directory-with-chdir
- OpenTofu `apply` with saved plan: https://opentofu.org/docs/cli/commands/apply/
- Jenkins declarative pipeline syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins `withCredentials` (Credentials Binding plugin): https://plugins.jenkins.io/credentials-binding/
- Jenkins `archiveArtifacts` step: https://www.jenkins.io/doc/pipeline/steps/core/
- Jenkins Slack Notification plugin: https://plugins.jenkins.io/slack/
- Jenkins jobcacher plugin (cache / arbitraryFileCache): https://plugins.jenkins.io/jobcacher/

## Issues Found
No technical issues found.

## Review Notes
- OpenTofu 1.7.0 (released April 2024) is real and the download URL pattern (`https://github.com/opentofu/opentofu/releases/download/v<ver>/tofu_<ver>_linux_amd64.zip`) is correct. By the time this post is read, newer OpenTofu releases (1.8.x, 1.9.x, 1.10.x) are available — readers should consider pinning a more recent version, but the pinned 1.7.0 example still works.
- `tofu apply -input=false -auto-approve tfplan`: `-auto-approve` is technically redundant when applying a saved plan file (OpenTofu/Terraform do not prompt for confirmation when a plan file is supplied), but it is not an error and is silently accepted.
- The interactive `input` message reads "Apply the Terraform plan?" inside an OpenTofu post — minor branding inconsistency only, not a technical inaccuracy, so left as-is per the "no stylistic changes" rule.
- The shell heredoc (`sh """..."""`) in the Plan stage uses Groovy `\<newline>` line continuations. Groovy collapses these into a single line before passing to bash, which still produces a valid one-line `tofu plan` invocation.
- `${TF_VERSION}` and `${TF_DIR}` are correctly resolved from the declarative `environment` block (Jenkins exposes these as both env vars for `sh` steps and Groovy variables for string interpolation).
- The `cache` snippet's `maxCacheSize: 500` is in MB per the jobcacher plugin convention, and `cacheValidityDecidingFile: '.terraform.lock.hcl'` is the right file to invalidate the cache when provider versions change.
