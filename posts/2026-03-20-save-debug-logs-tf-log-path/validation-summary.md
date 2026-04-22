# Validation Summary: How to Save Debug Logs to a File with TF_LOG_PATH in OpenTofu

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu logging environment variables (`TF_LOG`, `TF_LOG_PATH`, `TF_LOG_CORE`, `TF_LOG_PROVIDER`)
- Bash shell scripting
- GNU grep and awk log analysis commands
- logrotate configuration
- GitHub Actions workflow artifacts
- GnuPG encryption and GNU coreutils `shred`

## Sources Consulted
- OpenTofu documentation: Debugging OpenTofu - https://opentofu.org/docs/internals/debugging/
- OpenTofu documentation: Environment Variables - https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu documentation: `tofu plan` command - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu source: logging implementation - https://github.com/opentofu/opentofu/blob/main/internal/logging/logging.go
- GNU grep manual: regular expressions and `-E`/`-P` behavior - https://www.gnu.org/software/grep/manual/grep.html
- logrotate manual page - https://man7.org/linux/man-pages/man8/logrotate.8.html
- GitHub Docs: Store and share data with workflow artifacts - https://docs.github.com/en/actions/tutorials/store-and-share-data
- GNU coreutils manual: `shred` invocation - https://www.gnu.org/software/coreutils/manual/html_node/shred-invocation.html

## Issues Found
- `TF_LOG_PATH` appends to an existing file rather than overwriting it. Changed the timestamped-log wording from avoiding overwrites to keeping each run in its own file.
- The core/provider logging section implied `TF_LOG_CORE`, `TF_LOG_PROVIDER`, and one `TF_LOG_PATH` create separate files in a single run. Updated the comments to clarify that one run writes to one log path, and separate files require separate command runs with different filters.
- The split-log example ran two `tofu plan` commands concurrently, which can contend for state locking and does not split a single run. Removed background execution and made the example sequential.
- The timeline grep used `grep -E` with `\d`, which is not an ERE digit shorthand. Replaced it with a portable `[0-9]` expression.
- The logrotate example said it rotated by size, but the configuration used `daily`. Updated the comment to say daily rotation.
- The `shred` comment implied secure deletion universally. Added "On suitable filesystems" to reflect the coreutils caveat that `shred` depends on overwrite-in-place behavior.

## Review Notes
OpenTofu was not installed in the local environment, so CLI examples were validated against official documentation and OpenTofu source rather than by executing `tofu`. The GitHub Actions artifact example uses `actions/upload-artifact@v4`, which remains valid in GitHub's official examples.
