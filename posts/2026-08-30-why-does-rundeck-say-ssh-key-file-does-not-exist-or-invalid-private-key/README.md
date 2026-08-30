# Why Does Rundeck Say "SSH Key File Does Not Exist" or "Invalid Private Key"?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, SSH, SSH Keys, Troubleshooting, Security

Description: Diagnose Rundeck SSH private-key failures by checking configuration precedence, storage paths, file ownership, key contents, passphrases, and executor compatibility.

---

These messages look similar, but they occur at different layers. **SSH key file does not exist** means Rundeck resolved a filesystem path and could not open it. **Invalid private key** means it obtained bytes but the selected SSH executor could not parse or use them. Start by proving which configuration value won; do not rotate keys blindly.

## Identify the Active SSH Settings

Rundeck chooses a filesystem key path in this precedence order:

1. Node attribute `ssh-keypath`
2. Project property `project.ssh-keypath`
3. Framework property `framework.ssh-keypath`

Key Storage has a parallel precedence chain:

1. Node attribute `ssh-key-storage-path`
2. Project property `project.ssh-key-storage-path`
3. Framework property `framework.ssh-key-storage-path`

Within each chain, a node value overrides a project value, which overrides a framework value. When a Key Storage path and another credential setting are both present, Rundeck's SSH documentation says the Key Storage path is generally used. A stale filesystem path becomes relevant when the intended storage setting is missing, misspelled, not resolved in the active execution context, or unsupported by the selected provider. Inspect the failing node, the project's raw configuration, and the active executor. If Key Storage is intended, remove confusing obsolete file settings and configure, for example:

```yaml
app01:
  hostname: app01.example.net
  username: deploy
  ssh-authentication: privateKey
  ssh-key-storage-path: /keys/project/Operations/ssh/deploy
```

Do not put a Key Storage URI in `ssh-keypath`; that attribute expects a local filesystem path. Conversely, `ssh-key-storage-path` must point to a stored key, not `/home/rundeck/.ssh/id_ed25519`.

## Fix "SSH Key File Does Not Exist"

For a real filesystem key, the path is evaluated on the machine running the executor. With the Automation Server that is normally the Rundeck server; with distributed execution it may be a Runner. A path mounted into one container is not automatically present in another.

Check the path as the service account:

```bash
sudo -u rundeck test -r /var/lib/rundeck/.ssh/deploy_key
sudo -u rundeck stat /var/lib/rundeck/.ssh/deploy_key
```

Use an absolute path. Relative paths depend on the service's working directory and are fragile. For containers, verify the volume mount inside the running container rather than on the Docker host. Tight permissions are appropriate, but the Rundeck process must still be able to traverse the parent directories and read the file:

```bash
chown rundeck:rundeck /var/lib/rundeck/.ssh/deploy_key
chmod 700 /var/lib/rundeck/.ssh
chmod 600 /var/lib/rundeck/.ssh/deploy_key
```

If you intended Key Storage, use its exact UI path. Current project-scoped layouts commonly look like `/keys/project/Operations/ssh/deploy`. A missing leading `/keys`, a renamed project segment, or a path to the public-key entry will fail.

## Fix "Invalid Private Key"

First establish that the entry is actually a private key. A public key starts with text such as `ssh-ed25519` or `ssh-rsa` on one line. It belongs in the remote user's `authorized_keys`, not in Rundeck's private-key credential field.

Validate a file without contacting the server:

```bash
ssh-keygen -y -f /var/lib/rundeck/.ssh/deploy_key >/dev/null
```

If this command rejects the file, obtain a clean copy or generate and deploy a new dedicated key pair. Typical corruption includes missing `BEGIN` or `END` lines, wrapped base64, Windows line-ending damage, leading spaces, and pasting a JSON-escaped secret instead of the original bytes.

If OpenSSH accepts the key but Rundeck does not, record the configured Node Executor provider and the Rundeck/plugin version. Rundeck offers multiple SSH implementations, and supported algorithms and encrypted-key formats can differ. Prefer a modern algorithm supported by both your installed executor and the target SSH server. Do not weaken the server by re-enabling obsolete algorithms just to preserve an old key; rotate to a supported key instead.

## Handle Encrypted Keys Deliberately

An encrypted private key needs its passphrase at execution time. A valid encrypted key presented without the expected passphrase can surface as a parse or authentication failure. Configure Rundeck's SSH private-key passphrase support, commonly through a Secure Remote Authentication option where the executor supports it.

A plain Secure option is available to commands and scripts; a Secure Remote Authentication option is reserved for the executor. Use the latter for SSH authentication. Never hard-code the passphrase into node YAML, project properties, or command text.

## Separate Parsing from Remote Authentication

Once Rundeck can load the key, the next error may be `Auth fail` or `Permission denied (publickey)`. That is progress: parsing succeeded, but the target did not accept the credential. Verify all of the following:

```bash
sudo -u rundeck ssh \
  -i /var/lib/rundeck/.ssh/deploy_key \
  -o BatchMode=yes \
  deploy@app01.example.net id
```

- The node's `username` is the owner of the matching `authorized_keys` entry.
- The public half matches the private key (`ssh-keygen -y -f key`).
- Remote `.ssh` and `authorized_keys` permissions satisfy sshd.
- The host and SSH port are correct.
- A bastion, Runner, or container is using the same network and credential context as the test.

For a Key Storage key, do not export it simply to run this test. Compare its trusted provenance and fingerprint, or test a securely held source copy.

## Use Logs Without Leaking Secrets

Reproduce against one node with the project's SSH executor debug logging only as long as needed. Capture the provider name, resolved non-secret paths, algorithm errors, and exception chain. Do not paste private-key contents, passphrases, authorization headers, or full environment dumps into tickets.

After fixing the setting, refresh node data so an old node attribute is not still cached. Then rerun a harmless `id` command. If multiple nodes share the setting, test one node before resuming fleet-wide execution.

## Conclusion

Treat missing-file errors as configuration-resolution or runtime-filesystem problems, and invalid-key errors as content, encryption, or executor-compatibility problems. The fastest route is to inspect node-over-project-over-framework precedence, verify the credential as the Rundeck execution identity, and separate local key parsing from remote SSH authorization.

## Official Documentation

- [SSH Node Execution and key precedence](https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html)
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [Job Options and Secure Remote Authentication](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Docker configuration for SSH keys](https://docs.rundeck.com/docs/administration/configuration/docker.html)
