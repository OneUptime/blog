# Validation Summary: How to Copy a User-Uploaded File to Remote Nodes Before Running a Rundeck Command

## Status

validated

## Post Type

Technical tutorial / operations guide

## Technologies Covered

- Rundeck and PagerDuty Runbook Automation job options
- Rundeck File options and upload lifecycle
- Rundeck Copy File node step and File Copier plugins
- SSH and SCP node execution
- Rundeck Enterprise Runners
- Rundeck REST API
- Bash
- GNU tar, awk, stat, sha256sum, and rm
- sudo and secure archive staging

## Sources Consulted

- Rundeck Job Options, including File option values and option escaping: https://docs.rundeck.com/docs/manual/jobs/job-options.html
- Rundeck Job Variables Reference: https://docs.rundeck.com/docs/manual/jobs/job-variables.html
- Rundeck Built-in Node Steps, including Copy File and Local Command: https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html
- Rundeck Job Step Plugins and node-step execution scope: https://docs.rundeck.com/docs/manual/jobs/job-plugins/
- Rundeck Project Settings, including Default File Copier configuration: https://docs.rundeck.com/docs/manual/project-settings.html
- Rundeck SSH Node Execution: https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html
- Rundeck Job Workflows and Error Handlers: https://docs.rundeck.com/docs/manual/jobs/job-workflows.html
- Rundeck API, Upload a File for a Job Option and List Files Uploaded for a Job: https://docs.rundeck.com/docs/api/#upload-a-file-for-a-job-option
- Rundeck Configuration File Reference, Job File Option Uploads: https://docs.rundeck.com/docs/administration/configuration/config-file-reference.html#job-file-option-uploads
- Rundeck File Upload Plugins lifecycle: https://docs.rundeck.com/docs/developer/file-upload-plugins.html#behavior
- Rundeck Enterprise Runner FAQ: https://docs.rundeck.com/docs/administration/runner/runner-faq.html
- Rundeck security advisory, Command Injection via Job Options: https://docs.rundeck.com/docs/history/cves/2025-07-option-escaping.html
- GNU Bash Reference Manual, Pipelines and `pipefail`: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- GNU grep manual, quiet-mode behavior and exit status: https://www.gnu.org/software/grep/manual/grep.html
- GNU tar manual, absolute names and security considerations: https://www.gnu.org/software/tar/manual/html_node/absolute.html and https://www.gnu.org/software/tar/manual/html_section/Security.html
- GNU Coreutils manual, `stat`, SHA-2 utilities, and `rm`: https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html, https://www.gnu.org/software/coreutils/manual/html_node/sha2-utilities.html, and https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

## Issues Found

- The post called File an input type, but Rundeck's UI and documentation call it an option type. Changed the terminology to **option type File**.
- The archive-path check piped GNU tar into `grep -q` while `pipefail` was enabled. When grep found an early match, it could close the pipe, cause tar to exit on SIGPIPE, make the pipeline nonzero, and incorrectly accept the unsafe archive. Replaced it with a full-stream awk scan whose command substitution fails if tar fails, and used `--absolute-names` for listing only so leading slashes remain visible to the check.
- The local validator accepted symbolic links and used a size check whose behavior differed for symlinks. Added an explicit symlink rejection and made the GNU `stat` invocation unambiguous.
- The name scan was presented without explaining that member names alone do not make an archive safe to extract. Added the required caveat about link targets, special-file entries, member-count and expanded-size limits, and extraction into a fresh protected directory.
- The operation example referenced `change_id` without defining it and embedded it directly into inline script source. Added the missing required Text option guidance, required a ticket-format restriction, and changed the script to read the quoted `$RD_OPTION_CHANGE_ID` environment variable. This also avoids the inline-option injection path documented for Rundeck 3.4.1 through 5.19.0.
- The privileged installer guidance could lead to a check/use race because the unprivileged execution account can replace the staged path after validation. Changed the guidance so the privileged installer first acquires a non-symlink regular file into root-owned storage and then validates and consumes only that private copy.
- The cleanup guidance did not account for Rundeck Error Handler result semantics or multi-node strategy behavior. Specified the default Node First strategy, attached cleanup handlers to every post-transfer failure point, and made failure-path handlers return nonzero so cleanup does not recover or mask the failed step.
- The periodic cleanup pattern was `rundeck-*`, but the staged filenames are `${job.execid}-bundle.tar.gz`. Changed the policy to target sufficiently old regular `*-bundle.tar.gz` files in the dedicated staging directory.

## Review Notes

- The four File-option values (`option.NAME`, `file.NAME`, `file.NAME.filename`, and `file.NAME.sha`) and their meanings match current Rundeck documentation.
- The `${...}` syntax in command and plugin fields and the `@...@` syntax for constrained values inside inline scripts are correct. Rundeck exports option values as `RD_OPTION_*` environment variables, which is used for the user-controlled change ID.
- Copy File source and destination semantics, per-node dispatch, File Copier delegation, SSH/SCP property sharing, and the Script-step prerequisite are current and correct.
- The remote SHA-256 comparison correctly verifies that the copied bytes match Rundeck's recorded upload digest; it does not establish artifact authenticity, and the post correctly recommends an independently trusted digest or signature for that purpose.
- The Enterprise Runner limitation and Local Runner guidance are current. The API upload-then-run flow, unused-upload expiration, and file lifecycle description are also correct.
- The validator intentionally uses GNU/Linux command forms. The post already tells readers to adjust `stat` syntax for a different Automation Server operating system.
- Rundeck's official advisory identifies versions 3.4.1 through 5.19.0 as vulnerable to job-option command injection and 5.20.0 as the fixed release. Deployments should use 5.20.0 or later.
