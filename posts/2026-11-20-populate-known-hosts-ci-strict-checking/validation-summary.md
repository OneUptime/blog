# Validation Summary: How to Populate `known_hosts` in CI Without Setting `StrictHostKeyChecking=no`

## Status
validated

## Post Type
Tutorial / security configuration guide.

## Technologies Covered
- SSH and OpenSSH client/server host-key authentication.
- Ed25519 public host keys and SHA256 fingerprints.
- `known_hosts`, `ssh`, `ssh-keygen`, and `ssh-keyscan`.
- Bash, AWK, and Unix file permissions and temporary directories.
- GitLab CI/CD file variables and protected deployment configuration.

## Sources Consulted
- OpenSSH client configuration reference: https://man.openbsd.org/ssh_config
- OpenSSH command-line reference: https://man.openbsd.org/ssh
- OpenSSH key management and fingerprint/lookup options: https://man.openbsd.org/ssh-keygen
- OpenSSH host-key scanning options and security guidance: https://man.openbsd.org/ssh-keyscan
- OpenSSH known-hosts format and file permissions: https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT and https://man.openbsd.org/sshd#FILES
- OpenSSH server host-key configuration: https://man.openbsd.org/sshd_config#HostKey
- GitLab SSH host verification: https://docs.gitlab.com/ci/jobs/ssh_keys/#verifying-the-ssh-host-keys
- GitLab variable types, masking, environment scopes, and protection: https://docs.gitlab.com/ci/variables/
- GitHub's published SSH fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- Installed Bash built-in documentation: `help trap`, `help local`, and `help set`.
- Local OpenSSH 10.3p1 command execution and effective configuration output (`ssh -G`).

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The article correctly separates independent host-key verification from key collection and user authentication.
- Checked strict checking and first-contact behavior, endpoint tokens for nonstandard ports, hashed hostname lookup, plain public-key formatting, scanner options, and the need to verify the actual daemon's active key.
- Confirmed GitLab file variables supply a path, known-hosts content does not satisfy masking requirements, and protected refs and environment scope require deliberate configuration. The referenced documentation also supports reviewing merge-request access separately.
- All five Bash code blocks passed `bash -n`. Executed the trust-file construction with a generated Ed25519 key; a valid key with a comment succeeded. Empty input, multiple key lines, the wrong key type, and invalid key encoding failed as intended. Hashed hostname lookup also succeeded.
- Ran the installation script with its final SSH invocation changed to `ssh -G` for offline configuration inspection. Confirmed strict checking, batch mode, isolated trust files, disabled automatic key updates, disabled agent use, and disabled stdin and terminal allocation. The temporary trust directory was removed afterward.
- Exercised the cleanup function with successful and failed prior operations and simulated removal failures. It preserved a prior failure status and changed a successful status to failure when cleanup failed.
- The linked technical documentation resolved to the intended official resources. The GNU Bash web manual timed out; shell semantics were checked using the installed built-in help and execution instead.
- No live deployment server or GitLab pipeline was used. Network host-key rejection and successful remote authentication were reviewed against OpenSSH documentation, not tested end to end. The article appropriately calls for these checks against a test endpoint before deployment.
- No version-specific or deprecated feature correction was needed for the described Bash/OpenSSH workflow. Deployment credentials must be usable without an agent or interactive passphrase, consistent with the script's stated assumptions.
