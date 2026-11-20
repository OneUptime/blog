# How to Populate `known_hosts` in CI Without Setting `StrictHostKeyChecking=no`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, CI/CD, Security

Description: Build a verified SSH known_hosts file, deliver it to ephemeral CI jobs, and reject unknown or changed server keys with strict checking enabled.

A fresh runner needs an initial trust record. Prepare that record through an authenticated channel, deliver it with the job's configuration, and require SSH to use it. The runner can disappear after every job without losing the trust decision.

`StrictHostKeyChecking=yes` rejects unknown and changed host keys. `accept-new` automatically trusts previously unknown keys; with an empty file on every run, every run makes another first-contact decision. It does not establish the server's identity independently. [OpenSSH strict checking](https://man.openbsd.org/ssh_config#StrictHostKeyChecking)

This example uses Bash and OpenSSH to reach `deploy.example.com` on port `2222`, with a plain Ed25519 host key. Substitute your endpoint and supported key type deliberately.

## Build the trust record outside CI

Ask the server administrator or provisioning system for the active server's **public host key** through an authenticated management channel. Record the endpoint, environment, key type, fingerprint, and verification date alongside the reviewed configuration. Never copy the server's private host key into CI.

For a self-managed server, an administrator can run this through its trusted console:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
```

The file must correspond to the key actually used by the target service. Custom `HostKey` paths and multiple SSH daemons can make the default path misleading. [Server host-key configuration](https://man.openbsd.org/sshd_config#HostKey)

Transfer the corresponding public-key file through that channel as `verified-host.pub`, then fingerprint the received copy:

```bash
ssh-keygen -lf ./verified-host.pub -E sha256
```

Compare the entire SHA256 fingerprint and algorithm with the authenticated record before proceeding. For a hosted service, use its official published fingerprints, such as [GitHub's SSH fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints). A fingerprint from the failing connection itself is not independent evidence.

An ordinary `known_hosts` record contains the hostname token, key type, and encoded public key. For this nonstandard port, use `[deploy.example.com]:2222`; for port 22, use `deploy.example.com`. A literal IP destination needs its corresponding address token. [Known-hosts format](https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT)

Create the file only after verification. This command accepts exactly one plain Ed25519 public-key line, strips its optional comment, and checks that OpenSSH can parse the resulting key:

```bash
(
set -e
key=$(awk '
NR != 1 || NF < 2 || $1 != "ssh-ed25519" {bad = 1}
{print $1, $2}
END {exit (bad || NR != 1)}
' ./verified-host.pub)
printf '%s\n' "$key" | ssh-keygen -lf /dev/stdin -E sha256
printf '%s %s\n' '[deploy.example.com]:2222' "$key" > ./deploy_known_hosts
ssh-keygen -F '[deploy.example.com]:2222' -f ./deploy_known_hosts
)
```

Parsing proves file usability; the earlier comparison establishes trust. `ssh-keygen -F` also finds hashed hostname records. Keep a separate reviewed record for each required endpoint; do not copy an entire workstation's trust history. [Fingerprint and lookup options](https://man.openbsd.org/ssh-keygen)

## Use scanning only to collect candidates

When you have an independently trusted fingerprint but need the public key, collect a candidate outside the deployment job:

```bash
ssh-keyscan -T 5 -p 2222 -t ed25519 deploy.example.com > candidate_known_hosts
ssh-keygen -lf candidate_known_hosts -E sha256
```

Compare every candidate record with the trusted fingerprint for that endpoint before promoting it. Empty output, unexpected extra keys, or a mismatch means investigation, not automatic acceptance. `ssh-keyscan` cannot authenticate its results; an intercepted connection can return an attacker's key. Its `-H` option hashes hostnames, which does not verify the keys. [ssh-keyscan security and options](https://man.openbsd.org/ssh-keyscan)

## Deliver the file as controlled CI configuration

The public host key is not a login credential, but changing it changes which server the job trusts. Protect edits to this file and to the job that consumes it. A reviewed repository file is suitable when the deployment uses trusted, reviewed revisions; a protected CI configuration store is another option. Avoid restoring this file from caches populated by untrusted jobs.

In GitLab, create a project CI/CD variable named `SSH_KNOWN_HOSTS`, select type **File**, and paste the complete verified `deploy_known_hosts` contents. Preserve its line breaks and final newline. GitLab specifically documents delivering host keys this way and warns against running `ssh-keyscan` inside the job. [GitLab SSH host verification](https://docs.gitlab.com/ci/jobs/ssh_keys/#verifying-the-ssh-host-keys)

Select **Visible** because known-hosts records contain spaces that do not meet masking requirements. Restrict deployment variables to the intended protected refs and environment; review merge-request pipeline access separately. File variables expose a **filename** to the shell, so copy from `"$SSH_KNOWN_HOSTS"`; printing that variable into a file would write the path. [GitLab variable types and protection](https://docs.gitlab.com/ci/variables/)

## Install the file and require a fresh check

Run the following as a Bash job script. It assumes `DEPLOY_KEY_FILE` is an absolute path to an appropriately permissioned deployment private key already provisioned for noninteractive use. User authentication is separate from server trust.

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${SSH_KNOWN_HOSTS:?Supply the verified trust-file path}"
: "${DEPLOY_KEY_FILE:?Supply the deployment-key path}"
[[ $SSH_KNOWN_HOSTS == /* && $DEPLOY_KEY_FILE == /* ]] || exit 2
test -s "$SSH_KNOWN_HOSTS"
test -r "$DEPLOY_KEY_FILE"

trust_dir=$(mktemp -d /tmp/ci-host-trust.XXXXXXXX)
cleanup() {
  local status=$?
  trap - EXIT
  if ! rm -rf -- "$trust_dir"; then
    printf 'Trust-file cleanup failed\n' >&2 || :
    if (( status == 0 )); then status=1; fi
  fi
  exit "$status"
}
trap cleanup EXIT
cp -- "$SSH_KNOWN_HOSTS" "$trust_dir/known_hosts"
chmod 600 "$trust_dir/known_hosts"
ssh-keygen -F '[deploy.example.com]:2222' \
  -f "$trust_dir/known_hosts" >/dev/null

ssh -F /dev/null -nT \
  -o BatchMode=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$trust_dir/known_hosts" \
  -o GlobalKnownHostsFile=/dev/null -o UpdateHostKeys=no \
  -o CheckHostIP=no -o ControlPath=none \
  -o IdentitiesOnly=yes -o IdentityAgent=none \
  -i "$DEPLOY_KEY_FILE" -p 2222 deploy@deploy.example.com id
```

This recipe uses only the supplied trust file, prevents automatic trust-file updates and connection reuse, and disables interactive prompts. Its `600` mode is a conservative local choice, not a secrecy requirement for public keys. [Client settings](https://man.openbsd.org/ssh_config), [known-hosts permissions](https://man.openbsd.org/sshd#FILES)

The exit trap preserves an existing failure status and reports cleanup failures. Runner teardown must still handle abrupt termination.

`-F /dev/null` skips user and system SSH configuration; `-nT` disables stdin consumption and remote terminal allocation. For environments with bastions or centrally managed trust and revocation policy, integrate the verified file into that approved configuration instead of replacing it with this isolated example. [SSH command options](https://man.openbsd.org/ssh)

## Verify failures and maintain the source

Before deployment, exercise the job against a test endpoint using the correct key, a file without its entry, and a file containing a different key for that endpoint. Only the correct-key case should reach user authentication. Use `-v` to distinguish a host-key rejection from `Permission denied (publickey)`. A successful hostname lookup alone does not prove the connection will authenticate.

For a planned host-key rotation, verify and distribute the replacement through the same controlled process. If an overlap is necessary, approve both keys temporarily, then remove the retired key after all endpoints transition. Unexpected changes should fail the job and trigger investigation. Update the maintained source of trust; editing one disposable runner cannot repair the next run.
