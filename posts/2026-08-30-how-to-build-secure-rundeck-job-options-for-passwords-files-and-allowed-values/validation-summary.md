# Validation Summary: How to Build Secure Rundeck Job Options for Passwords, Files, and Allowed Values

## Status

validated

## Post Type

Security-focused technical guide

## Technologies Covered

- Rundeck / PagerDuty Runbook Automation job options
- Plain, Secure, Secure Remote Authentication, and File option types
- Rundeck Key Storage
- SSH, SSH private-key passphrase, and sudo authentication
- Job Reference option mapping
- Rundeck Copy File steps and File Copier plugins
- Enterprise Runners and the Local Runner / Automation Server
- Remote and cascading allowed-value providers
- Rundeck Mask Passwords log filter
- Bash

## Sources Consulted

- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html) - verified option restrictions, default shell escaping, `unquotedoption` injection risk, secure-option exposure, Job Reference type constraints, Key Storage defaults, File option variables, remote option authentication and timeouts, cascading syntax, URL encoding, cycles, and request-failure behavior.
- [Rundeck Job Options: Getting Started](https://docs.rundeck.com/docs/learning/getting-started/jobs/job-options.html) - verified the option-type descriptions, Key Storage password-only limitation, environment-variable syntax, and the Enterprise Runner limitation for File options.
- [Rundeck ExecutionService source at current repository HEAD](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/services/rundeck/services/ExecutionService.groovy#L3227-L3366) - verified that enforcement of remote allowed values depends on the values resolving successfully and that an errored or empty remote list does not itself constrain submitted values.
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/) - verified Key Storage types, paths, access controls, and Node Executor use.
- [Rundeck Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html) - verified command, inline-script, and environment-variable syntax and the `${job.execid}` context variable.
- [Rundeck SSH Node Execution](https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html) - verified Secure Remote Authentication use for SSH passwords, SSH private-key passphrases, and sudo passwords.
- [Rundeck Built-in Node Steps](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html) - verified Job Reference argument handling and Copy File source/destination semantics.
- [Rundeck Project Settings](https://docs.rundeck.com/docs/manual/project-settings.html#default-file-copier-configuration) and [File Copier Plugins](https://docs.rundeck.com/docs/developer/file-copier-plugins.html) - verified that remote transfer behavior is delegated to the configured File Copier.
- [Rundeck File Upload Plugins](https://docs.rundeck.com/docs/developer/file-upload-plugins.html) - verified uploaded-file reference IDs, local retrieval, checksum verification, execution attachment, and retention/deletion lifecycle.
- [Rundeck Mask Passwords](https://docs.rundeck.com/docs/manual/log-filters/mask-passwords.html) - verified that the filter masks values of Secure and Secure Remote Authentication options in job output.
- [SEI CERT FIO21-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/input-output-fio/fio21-c/) - checked the risks of predictable temporary filenames in shared directories such as `/var/tmp`.
- [GNU Bash manual: The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) - verified the shell options used by the Bash example; the complete snippet also passed `bash -n` syntax validation.

## Issues Found

1. **Remote allowed values were presented as a sufficient security boundary** - Rundeck's documentation says that a failed remote-values request exposes a text field, and its current execution code only checks an enforced remote list when values resolved successfully. Updated the guidance to say that **Enforced from values** should still be enabled, but the job or target system must independently validate and authorize the submitted value and fail closed.
2. **Cross-type Job Reference behavior was overstated** - The post said Rundeck “refuses” cross-type mappings, which could imply configuration-time rejection. Current behavior is that option values are not passed across types; incorrectly mapped Secure or Secure Remote Authentication targets remain unset, while Plain targets can retain uninterpreted references. Reworded the claim without changing the recommended same-type mappings.
3. **File validation locality was ambiguous** - `${file.bundle}` resolves to a path on the Automation Server, not an ordinary remote node. Clarified that a validation step using this path must be server-local before it is used as the source of a Copy File step.
4. **The remote staging example used a predictable filename directly in shared `/var/tmp`** - On a multi-user target, another account could pre-create the path or a symlink, causing denial of service or an unintended overwrite depending on the File Copier and execution account. Replaced it with a job-defined path under a pre-created staging directory owned by and restricted to the remote execution account, and corrected the description from “server-chosen” to “job-defined.”

## Review Notes

- The post does not target a specific Rundeck release. It was checked against the current official documentation and Rundeck repository HEAD available on 2026-08-30.
- The Plain, Secure, Secure Remote Authentication, and File option descriptions now align with the documented storage and exposure rules.
- The `${option.bundle}`, `${file.bundle}`, `${file.bundle.filename}`, and `${file.bundle.sha}` references are correct; `.sha` is the SHA-256 digest.
- The Enterprise Runner limitation, including the absence of a pre-execution warning and the requirement to use the Local Runner / Automation Server for File options, remains current.
- The command-context escaping guidance, `$RD_OPTION_ENVIRONMENT` name, regular expression, and Bash script are valid. The script quotes the option as a single argument.
- Uploaded-file backing storage and post-execution retention can vary by File Upload plugin; the decision table correctly avoids promising unconditional persistence or deletion for File options.
- All four official documentation links in the post resolve to the intended current pages.
