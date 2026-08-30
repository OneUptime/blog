# How to Add Linux Nodes to Rundeck with SSH Keys Stored in Key Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, SSH, SSH Keys, Security, Automation

Description: Add Linux nodes to a Rundeck project, keep their SSH private key in project-scoped Key Storage, and verify remote execution without putting secrets in node files.

---

Rundeck needs three separate pieces to run a command on a Linux node: a node definition, an SSH executor, and a credential. Keeping those concerns separate makes the setup easier to audit. The inventory describes where and as whom to connect; Key Storage holds the private key; the remote account's `authorized_keys` file trusts the corresponding public key.

## Prepare the Remote Account

Create or choose a narrowly privileged account such as `rundeck` or `deploy`. Generate a dedicated key pair on a trusted administration machine rather than reusing a person's key:

```bash
ssh-keygen -t ed25519 -f ./rundeck-prod -C "rundeck-prod" -N ''
```

Install only `rundeck-prod.pub` on the target:

```bash
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy rundeck-prod.pub \
  /home/deploy/.ssh/authorized_keys
```

If `authorized_keys` already exists, append the public-key line instead of overwriting it. Give this account only the commands it needs. If a job needs privilege escalation, prefer tightly scoped `sudoers` rules over passwordless access to every command.

Before involving Rundeck, test that the network route, account, and key work from the same host or execution environment that will run the job:

```bash
ssh -i ./rundeck-prod -o BatchMode=yes deploy@app01.example.net id
```

For an Enterprise Runner, test from the Runner's network context, not merely from the Automation Server.

## Store the Private Key

Open the project, then go to **Project Settings > Key Storage**. Create a key of type **Private Key**, paste or upload `rundeck-prod`, and place it under a project-specific path. A useful logical path is:

```text
keys/project/Operations/ssh/rundeck-prod
```

The SSH node attribute uses the storage URI form, including the leading `/keys`:

```text
/keys/project/Operations/ssh/rundeck-prod
```

The exact path shown by the Key Storage UI is authoritative. Do not upload the `.pub` file as the private key. A private key begins with a marker such as `-----BEGIN OPENSSH PRIVATE KEY-----`; the public half is the short, single-line value installed on the node.

The official documentation recommends organizing keys under a project-specific hierarchy rather than a shared system-wide path. Access to stored material is controlled separately by storage ACL rules, so a user being allowed to run a job does not automatically mean they can browse or download its key.

## Define the Nodes

Under **Project Settings > Edit Nodes**, add a File node source and point it at a Resource YAML file readable by the Rundeck service. A minimal inventory is:

```yaml
app01:
  hostname: app01.example.net
  username: deploy
  osFamily: unix
  tags: 'linux,production,app'
  ssh-authentication: privateKey
  ssh-key-storage-path: /keys/project/Operations/ssh/rundeck-prod

app02:
  hostname: app02.example.net
  username: deploy
  osFamily: unix
  tags: 'linux,production,app'
  ssh-authentication: privateKey
  ssh-key-storage-path: /keys/project/Operations/ssh/rundeck-prod
```

The top-level map key is the unique Rundeck node name. `hostname` is what the executor contacts, and `username` is the remote login. Tags are not required for SSH, but they give jobs a stable targeting interface such as `tags: app+production`.

Instead of repeating the storage path on every node, set it as the project default in **Edit Configuration > Default Node Executor**. The corresponding raw property is:

```properties
project.ssh-key-storage-path=/keys/project/Operations/ssh/rundeck-prod
```

Rundeck resolves SSH key storage settings in this order: node, project, then framework. A node-level value therefore overrides the project default. Use per-node attributes only when a host genuinely needs a different credential.

## Configure Execution and File Copy

Select an SSH node executor and an SSH/SCP-compatible file copier for the project. The SSH executor and file copier share relevant SSH settings, including credentials, unless a more specific node attribute overrides them. Confirm the selected executor supports the key algorithm and format used by your deployment.

If the private key is encrypted, configure the documented SSH private-key passphrase mechanism, typically a Secure Remote Authentication job option or a supported storage-backed setting. Do not place a passphrase in Resource YAML or a plain job option.

## Test in Small Steps

Refresh the Nodes page and inspect `app01`. Confirm the resolved hostname, username, executor, and `ssh-key-storage-path`. Then run harmless commands against one node:

```bash
id
uname -a
```

After that succeeds, create a job with the fixed node filter:

```text
name: app01
```

Only then expand it to the production tag filter. This sequence distinguishes inventory problems from authentication failures and avoids testing an unproven job across the fleet.

Common failures have distinct meanings:

- `No matched nodes` is an inventory or filter problem, before SSH starts.
- `Connection refused` or timeout points to DNS, routing, firewall, port, or sshd.
- `Auth fail` points to the username, trusted public key, selected private key, or passphrase.
- `SSH key file does not exist` means the executor resolved a filesystem `ssh-keypath`; confirm the intended storage-path setting is present and recognized.

## Conclusion

Use a dedicated remote identity, keep its private key in project-scoped Key Storage, and reference that key with `ssh-key-storage-path`. A small Resource YAML definition plus a project default gives you reusable credentials without leaking secret material into inventory. Validate one node and one harmless command before widening the filter.

## Official Documentation

- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [SSH Node Execution](https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html)
- [Resource YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/resource-yaml-v13.html)
- [Project settings and file copiers](https://docs.rundeck.com/docs/manual/project-settings.html)
