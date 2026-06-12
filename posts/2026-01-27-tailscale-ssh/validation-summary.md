# Validation Summary: Tailscale SSH: Set Up Secure Remote Access Without Managing Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tailscale (tailnet, ACL policy file)
- Tailscale SSH
- Tailscale SSH session recording (tsrecorder)
- OpenSSH client and `~/.ssh/config`
- Visual Studio Code Remote - SSH extension
- systemd (for stopping OpenSSH `sshd`)

## Sources Consulted
- Tailscale SSH overview: https://tailscale.com/kb/1193/tailscale-ssh
- Tailscale SSH session recording: https://tailscale.com/kb/1246/tailscale-ssh-session-recording
- Tailscale ACLs documentation: https://tailscale.com/kb/1018/acls
- Tailnet policy file syntax: https://tailscale.com/kb/1337/policy-syntax
- `tailscale up` CLI reference: https://tailscale.com/docs/reference/tailscale-cli/up
- Tailscale CLI source (`cmd/tailscale/cli/ssh.go`) on github.com/tailscale/tailscale
- Tailscale GitHub issue #5295 (VS Code Remote SSH compatibility)
- Tailscale GitHub PR #4755 (introduction of the `lose-ssh` accept-risk value)

## Issues Found

1. **Incorrect `recorder` field semantics.** The original post described `recorder` as a list of email addresses of users who "receive recordings". Per the Tailscale session-recording docs, `recorder` is a list of **tags attached to nodes running `tsrecorder`** (for example `["tag:recorder"]`); sessions are streamed to those nodes, not emailed to users. Fixed in both the SSH rules example and the dedicated Session Recording section, and added a corresponding `tag:recorder` entry to `tagOwners`. Also added `enforceRecorder` (the real field that denies sessions when no recorder is reachable) in place of the inaccurate "require recording on every rule" guidance.

2. **`check` action mischaracterised.** The original post framed `check` as a way to "test SSH access without actually granting it" — describing it as audit/dry-run mode and even giving an "auditors only get check mode, they cannot connect" example. In reality `check` **does** grant access; it just requires the user to complete a fresh IdP authentication first, after which the session is allowed for the configured `checkPeriod`. Rewrote the "Check mode" section, fixed the introductory bullet ("Test SSH access without actually granting it"), fixed the best-practices bullet ("Use check mode for auditing"), and updated the auditor example in the SSH rules block to a realistic SRE-root-with-step-up example.

3. **`checkPeriod` was missing.** Tailscale requires `checkPeriod` whenever `action: "check"` is used (1m–168h, or `"always"`). The original examples omitted it, which is an invalid policy. Added `checkPeriod` to every `check` example and documented it in the key-fields list.

4. **Fabricated `tailscale ssh --check` command.** The post showed `tailscale ssh --check user@hostname` and described it as a CLI dry-run. No such flag exists — the `tailscale ssh` command in the Tailscale source is a thin wrapper around the system `ssh` client and does not define a `--check` flag. Removed the command and replaced the surrounding narrative with the correct re-auth flow.

5. **Incorrect `--accept-risks=lose-ssh` flag in `ProxyCommand`.** The post used `tailscale ssh --accept-risks=lose-ssh %h` as an OpenSSH `ProxyCommand`. Two problems: (a) the flag is `--accept-risk` (singular) and is documented for `tailscale up`, not `tailscale ssh` — `tailscale ssh` does not define it; (b) `tailscale ssh` is not a transparent TCP proxy and shouldn't be used inside `ProxyCommand`. Tailscale SSH simply claims port 22 on the tailnet interface, so the standard `ssh` client (and VS Code Remote - SSH) connects natively. Rewrote the VS Code section to use direct SSH to the MagicDNS name, kept the optional per-host `~/.ssh/config` aliases (with `ProxyCommand` lines removed), and mentioned the official Tailscale VS Code extension as an alternative.

## Review Notes

- `tailscale up --ssh`, `tailscale set --ssh`, `tailscale status`, and `tailscale ssh user@host` are all correct as written.
- The network ACL example uses `"tag:server:*"` / `"tag:staging:*"`, which is the correct `<host>:<ports>` syntax for the `acls` block (the `:*` means "all ports"). The SSH rules correctly omit the port suffix in `dst`, since SSH rules only ever target port 22.
- `autogroup:nonroot` in `users` matches any local account other than `root` — the wording in the SSH rules example was tightened to reflect this rather than implying "their own username".
- `autogroup:member` in the migration step is valid and refers to any member of the tailnet.
- The `tailscale ssh user@host` form is a thin wrapper around the system `ssh` client. It works, but the canonical recommendation in Tailscale's docs is simply to run `ssh user@host` — both are accurate and the post's usage was left intact.
- No version numbers are referenced in the post, so no version-specific staleness applies. Tailscale's policy file format is evolving (HuJSON is now the default in the admin console), but JSON-with-comments examples remain valid because the admin console accepts both.
