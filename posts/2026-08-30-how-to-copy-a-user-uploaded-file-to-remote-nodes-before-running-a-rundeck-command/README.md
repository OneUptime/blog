# Copy User-Uploaded Files to Remote Nodes in Rundeck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, File Upload, File Transfer, SSH, Automation

Description: Accept a Rundeck File job option, validate it on the Automation Server, copy it to remote nodes, run a command, and clean it up safely.

---

Rundeck File options solve the first half of an upload workflow: they receive a file and make a managed local copy available to the execution. They do not automatically transfer that file to every target. A reliable job validates the server-local upload, uses a configured File Copier to send it to a fixed remote path, verifies the transfer, performs the operation, and removes temporary data.

## Understand the File References

Create a job option named `bundle` with option type **File** and mark it required. Rundeck exposes four useful values:

```text
${option.bundle}          unique uploaded-file identifier
${file.bundle}            local path on the Automation Server
${file.bundle.filename}   original filename, when provided
${file.bundle.sha}        SHA-256 digest
```

The option value is an identifier, not a filesystem path. Use `${file.bundle}` when a step needs to read or copy the uploaded bytes.

Treat `${file.bundle.filename}` as untrusted metadata. A client can supply a misleading name or path-like characters, so do not use it directly as the destination. Choose a path controlled by the job:

```text
/var/lib/rundeck-staging/${job.execid}-bundle.tar.gz
```

The execution ID makes concurrent runs use different files. Provision `/var/lib/rundeck-staging` ahead of time, owned by the remote execution account with mode `0700`; avoid a predictable name in a world-writable directory.

## Configure the File Copier

Under **Project Settings > Edit Configuration > Default File Copier**, select the copier that matches the node executor. For ordinary Linux nodes this is commonly an SSH/SCP copier. Rundeck's SSH node executor and SCP file copier share relevant SSH properties unless a node supplies a more specific override.

Confirm the remote login can write to the staging directory. Do not copy directly over the final application configuration: stage, validate, and then perform an atomic or privileged install as a separate step.

Test the copier with a harmless Script step first. Rundeck already uses the File Copier to send temporary scripts to nodes, so a working remote Script step is a useful prerequisite.

## Build the Workflow

### Step 1: Validate Locally

Install a reviewed validator on the Automation Server and call it from a **Local Command** with `${file.bundle}` as its single argument. For example, `/usr/local/libexec/rundeck-validate-bundle` can contain:

```bash
#!/usr/bin/env bash
set -euo pipefail

upload=$1

test -f "$upload"
test ! -L "$upload"
test "$(/usr/bin/stat -c %s -- "$upload")" -le 52428800

# Preserve leading slashes while listing. Do not use --absolute-names when extracting.
unsafe=$(
  /usr/bin/tar --absolute-names -tzf "$upload" |
    /usr/bin/awk '/(^\/|(^|\/)\.\.(\/|$))/ { found=1 } END { print found + 0 }'
)

if [ "$unsafe" -eq 1 ]; then
  echo "unsafe archive path" >&2
  exit 2
fi
```

Configure the Local Command as:

```text
/usr/local/libexec/rundeck-validate-bundle ${file.bundle}
```

Rundeck's Command/plugin configuration fields use `${file.bundle}`. Adjust `stat` syntax for the Automation Server's operating system.

This is only a preliminary member-name check. Before extraction, the reviewed installer must also reject unsafe symbolic- and hard-link targets and special-file entries, bound the member count and total expanded size, and extract into a new protected directory.

File type, extension, and MIME detection are hints, not proof. For deployment artifacts, verify a detached signature or compare `${file.bundle.sha}` with an independently trusted digest.

### Step 2: Copy to Each Node

Add the built-in **Copy File** node step:

```text
Source Path:      ${file.bundle}
Destination Path: /var/lib/rundeck-staging/${job.execid}-bundle.tar.gz
Recursive copy:  No
```

The step runs for each node selected by the job and delegates transfer to that node's File Copier. Use a fixed suffix when the downstream tool expects a specific format; do not trust the client filename to determine how a privileged tool handles the content.

### Step 3: Verify Remotely

Add an inline node script:

```bash
#!/usr/bin/env bash
set -euo pipefail

path='/var/lib/rundeck-staging/@job.execid@-bundle.tar.gz'
expected='@file.bundle.sha@'
actual=$(/usr/bin/sha256sum "$path" | /usr/bin/awk '{print $1}')

if [ "$actual" != "$expected" ]; then
  echo "uploaded file digest mismatch" >&2
  exit 3
fi

/usr/bin/tar -tzf "$path" >/dev/null
```

This catches a partial or altered transfer. Keep the remote file owned by the unprivileged execution user and inaccessible to other users where its contents are sensitive.

### Step 4: Perform the Operation

If you use the change-control argument below, also create a required Text option named `change_id` and restrict it to your ticket format. Pass the fixed path as a quoted argument to a reviewed script:

```bash
/usr/local/sbin/install-release \
  --archive "/var/lib/rundeck-staging/@job.execid@-bundle.tar.gz" \
  --change "$RD_OPTION_CHANGE_ID"
```

If privilege escalation is required, grant `sudo` only for `install-release`. Make that script acquire the staged non-symlink regular file into a root-owned directory without a check/use gap, then validate and consume only that private copy. Call `sudo -n` so the job fails instead of waiting for a TTY password prompt.

### Step 5: Clean Up on Success and Failure

Remove the staged file after the command:

```bash
/usr/bin/rm -f -- "/var/lib/rundeck-staging/@job.execid@-bundle.tar.gz"
```

Keep the default **Node First** workflow strategy for this layout. Attach an inline cleanup node step as the Error Handler for the Copy File, remote-verification, and install steps so each failed node attempts cleanup:

```bash
#!/usr/bin/env bash
/usr/bin/rm -f -- "/var/lib/rundeck-staging/@job.execid@-bundle.tar.gz"
exit 1
```

The nonzero exit preserves the original failure; omit it only when the handler is intentionally recovering the step. A periodic cleanup policy for sufficiently old regular `*-bundle.tar.gz` files in this dedicated staging directory protects against process crashes or connection failures that bypass workflow cleanup.

## Important Runner Limitation

Rundeck's current File option documentation states that File options are not supported with Enterprise Runners. Uploaded files are not transferred to the Runner host, so `file.NAME` does not resolve there, and there is currently no pre-execution warning.

Run upload-dependent jobs on the Local Runner/Automation Server. For distributed execution, put artifacts in a repository/object store, pass an immutable artifact identifier and digest as ordinary options, and let the Runner retrieve the artifact using its own managed credential.

## API Uploads Need Two Calls

API clients first upload the bytes to the job's file-input endpoint and receive a file key. They then call the job run endpoint with that key as the File option value. The upload record can expire if it remains unused, and a used temporary file transitions through its documented lifecycle. Do not send a client filesystem path in the run request; Rundeck cannot read a path on the caller's machine.

## Conclusion

Use `${file.NAME}` for the server-local upload, validate before transfer, copy to a server-chosen per-execution path, compare the SHA-256 digest remotely, and always clean up. Keep File-option jobs on the Automation Server, or replace upload transport with an artifact repository when Runners are involved.

## Official Documentation

- [Rundeck Job Options: File options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Built-in Node Steps: Copy File](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html)
- [Project Settings: File Copier configuration](https://docs.rundeck.com/docs/manual/project-settings.html)
- [Rundeck API: Upload a File for a Job Option](https://docs.rundeck.com/docs/api/#upload-a-file-for-a-job-option)
