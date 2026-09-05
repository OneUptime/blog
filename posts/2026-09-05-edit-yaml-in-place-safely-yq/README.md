# How to Edit YAML In Place with yq Without Truncating the File on Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Edit YAML safely with Mike Farah yq v4 using its in-place mode or a validated same-directory temporary file and atomic replacement workflow.

---

Never redirect yq output back to the file it is reading:

```bash
yq '.deployment.replicas = 4' config.yml > config.yml
```

The shell opens `config.yml` for output and truncates it **before** yq starts. yq then reads an empty file. The safe basic operation in Mike Farah yq v4 is its `--inplace` or `-i` flag:

```bash
yq -i '.deployment.replicas = 4' config.yml
```

For critical configuration, go one step further: render to a temporary file in the same directory, validate the result, and rename it over the original only after every check succeeds.

## Why Redirection Truncates the Input

Redirections are performed by Bash while setting up the command. The program does not get a chance to read first. These variants are all unsafe:

```bash
yq '.' config.yml >config.yml
yq '.a = 1' <config.yml >config.yml
cat config.yml | yq '.a = 1' >config.yml
```

The pipeline does not help. Bash creates the output file as part of preparing the pipeline, and the writer or reader may observe an already truncated file.

This is a shell issue, not a YAML issue. The same rule applies to formatters, JSON processors, and text filters.

## Use Native In-place Mode for Ordinary Edits

Given:

```yaml
deployment:
  image: registry.example.com/api:v1
  replicas: 2
```

Run:

```bash
IMAGE='registry.example.com/api:v2' REPLICAS=4 \
yq -i '
  .deployment.image = strenv(IMAGE) |
  .deployment.replicas = env(REPLICAS)
' config.yml
```

Result:

```yaml
deployment:
  image: registry.example.com/api:v2
  replicas: 4
```

In Mike Farah yq v4.53.3, `-i` writes evaluated output to a file under the process temporary directory. It gives that file the original mode, changes ownership where supported, and begins replacement only after evaluation and printing succeed. A parser, evaluation, or `-e` failure leaves the original in place. The current error path can leave the unused temporary file behind, however, so rely on the operating system or job workspace's temporary-file cleanup rather than assuming yq removed it.

That protects the original from a parse or expression failure:

```bash
if ! yq -i '.deployment.replicas = (' config.yml; then
  printf '%s\n' 'invalid expression; original file retained' >&2
fi
```

Do not use a deliberately invalid command against an important file merely as a test. The example illustrates the behavior documented by the implementation; test your workflow on a fixture.

## Understand the Limits of `-i`

Temporary output is much safer than self-redirection, but not every storage path has identical replacement semantics.

In v4.53.3, the implementation skips rename for a symbolic-link target and otherwise first attempts a rename. If the target is a symbolic link, or if rename fails-for example across a filesystem boundary or on some mounted volumes-it falls back to copying temporary contents into the target. A copy fallback can preserve a symlink target, but it is not crash-atomic: interruption during the copy can leave partial contents.

Before editing operational configuration, determine whether the path is a symlink and what filesystem hosts it:

```bash
test -L config.yml && printf '%s\n' 'config.yml is a symlink'
df -P config.yml
```

Also consider:

- another process can modify the file between your read and replacement;
- replacement may affect extended attributes, ACLs, hard links, or watchers;
- network filesystems may not provide the same guarantees as a local filesystem;
- a successful rename is atomic visibility, not necessarily durable storage after sudden power loss.

Use application-specific locking and durability procedures when those properties matter.

## Preview Before Mutation

Use the exact production expression without `-i` first:

```bash
IMAGE='registry.example.com/api:v2' REPLICAS=4 \
yq '
  .deployment.image = strenv(IMAGE) |
  .deployment.replicas = env(REPLICAS)
' config.yml
```

Inspect a diff without changing the source. Bash process substitution is convenient for an interactive check:

```bash
diff -u config.yml <(
  IMAGE='registry.example.com/api:v2' REPLICAS=4 \
  yq '
    .deployment.image = strenv(IMAGE) |
    .deployment.replicas = env(REPLICAS)
  ' config.yml
) || true
```

`diff` returns 1 when differences are found, so `|| true` is appropriate only for this intentional preview. Do not attach it to the actual edit or validation step.

## Use a Validated Same-directory Temporary File

This Bash pattern gives you a checkpoint between rendering and publication for a configuration containing exactly one YAML document:

```bash
#!/usr/bin/env bash
set -euo pipefail

file=config.yml
image=${IMAGE:?IMAGE is required}
replicas=${REPLICAS:?REPLICAS is required}

if [[ -L $file ]]; then
  printf '%s\n' 'refusing to replace a symbolic link' >&2
  exit 1
fi

directory=${file%/*}
if [[ $directory == "$file" ]]; then
  directory=.
fi
basename=${file##*/}

temporary=$(mktemp "$directory/.${basename}.XXXXXX")
cleanup() {
  rm -f -- "$temporary"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# Copy metadata that cp -p supports, then replace only the temporary contents.
cp -p -- "$file" "$temporary"

if ! IMAGE=$image REPLICAS=$replicas yq '
  .deployment.image = strenv(IMAGE) |
  .deployment.replicas = env(REPLICAS)
' "$file" >"$temporary"; then
  printf '%s\n' 'render failed; original retained' >&2
  exit 1
fi

if ! IMAGE=$image REPLICAS=$replicas yq ea -e '
  [
  (.deployment | tag == "!!map") and
  (.deployment.image == strenv(IMAGE)) and
  (.deployment.replicas == env(REPLICAS)) and
  ((.deployment.replicas | tag) == "!!int")
  ] | ((length == 1) and all)
' "$temporary" >/dev/null; then
  printf '%s\n' 'post-render checks failed; original retained' >&2
  exit 1
fi

mv -- "$temporary" "$file"
trap - EXIT HUP INT TERM
```

The script rejects a symbolic-link target because `mv` would replace the link itself, unlike yq's copy fallback for `-i`. The temporary file is created beside a regular target, so the final `mv` normally uses a same-filesystem rename. A failed render truncates only the temporary file. The trap removes an unpublished temporary file on ordinary errors and signals.

`cp -p` is widely available but does not promise identical ACL and extended-attribute behavior on every platform. Audit permissions and metadata requirements for secrets, system configuration, and files owned by another account. GNU and BSD utilities also differ in some long options; remove `--` only if a target platform's command does not accept it, while continuing to reject filenames that begin with a dash by policy.

## Validate the Meaning, Not Merely the Syntax

If yq can read the temporary output, it is syntactically valid YAML. That does not prove it matches the application's schema. Add checks for expected root types, required keys, ranges, and invariants. These examples require exactly one document: `ea` collects one validation result per document into an array, then checks that there is exactly one result and it is true. Plain `yq -e` can succeed if any document produces a true result, even when another produces false:

```bash
yq ea -e '
  [
  (tag == "!!map") and
  (.deployment | tag == "!!map") and
  ((.deployment.replicas | tag) == "!!int") and
  (.deployment.replicas >= 1) and
  (.deployment.replicas <= 50) and
  ((.deployment.image | tag) == "!!str")
  ] | ((length == 1) and all)
' candidate.yml >/dev/null
```

Run the owning application's official configuration checker as an additional step when one exists. yq is a processor, not a general schema validator.

## Preserve a Recoverable Backup When Required

Atomic replacement prevents readers from seeing half a new local file; it does not provide rollback. For high-risk changes, create a versioned backup with a unique suffix before publication:

```bash
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup=$(mktemp "config.yml.$timestamp.XXXXXX")
cp -p -- config.yml "$backup"
```

Store backups according to a retention and secrets policy. A copy beside a secret configuration has the same confidentiality requirements and may be picked up by broad deployment globs.

Avoid fixed names such as `config.yml.tmp`: concurrent runs can overwrite each other's staging file or an attacker may pre-create a symlink in a writable directory. `mktemp` creates the file exclusively with an unpredictable suffix.

## Handle Privileged and Confined Files Explicitly

The official Mike Farah repository notes that the strictly confined Snap cannot directly access root files. Its documented patterns read with `sudo cat`, write a temporary file with `sudo tee`, then move it, or use `sponge`.

Do not casually run all of yq as root merely to cross one permission boundary. Render unprivileged when possible, validate, then use a narrowly scoped privileged move whose destination is explicit. Confirm ownership and mode after publication.

## Coordinate Concurrent Writers

Neither `yq -i` nor a rename protocol merges concurrent changes. Two successful writers can both read the same old file, produce different candidates, and let the last replacement win.

Use the locking mechanism appropriate to the system: a deployment controller, repository merge, service API, or an advisory lock shared by every writer. `flock` is common on Linux but is not a portable Bash builtin and is absent from a default macOS installation. A lock helps only when all writers honor it.

For Git-managed configuration, an even safer workflow is often to edit a working copy, review a diff, commit it, and let the normal delivery controller publish it.

## Conclusion

Never send yq output directly back to its input pathname with shell redirection. Use Mike Farah yq v4's `-i` for ordinary edits. For critical files, render to an unpredictable same-directory temporary file, validate both YAML shape and application semantics, preserve required metadata, and publish with a same-filesystem rename. Account separately for symlinks, mounted volumes, concurrent writers, rollback, and crash durability.

## Official Documentation

- [Mike Farah yq: Evaluate Command and In-place Flag](https://mikefarah.gitbook.io/yq/commands/evaluate)
- [Mike Farah yq: Official Repository Usage](https://github.com/mikefarah/yq)
- [Mike Farah yq v4.53.3: Write-in-place Handler](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/write_in_place_handler.go)
- [Mike Farah yq v4.53.3: File Replacement Utilities](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/file_utils.go)
- [GNU Bash Manual: Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)
- [GNU Bash Manual: Signals](https://www.gnu.org/software/bash/manual/html_node/Signals.html)
