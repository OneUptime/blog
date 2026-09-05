# How to Tell Which yq You Installed—and Translate Commands to Mike Farah yq v4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Command Line, DevOps, CI/CD

Description: Identify the program behind your yq command and translate older or Python-wrapper examples into reliable Mike Farah yq v4 syntax.

---

`yq` is not one universally compatible program. Several unrelated projects install an executable with that name, and Mike Farah's own `yq` changed its command language substantially between v3 and v4. A command copied from a search result can therefore fail even though both the example and your installation are working as designed.

The reliable approach is to identify the exact executable Bash will run, fingerprint its implementation, and only then translate the command.

## Inventory Every `yq` on `PATH`

Start in the same shell and execution environment as the failing script:

```bash
type -a yq
command -V yq
command -v yq
```

In Bash, `type -a` reports every matching alias, function, builtin, and executable found through `PATH`. `command -v` describes the command Bash would choose. Its output is not guaranteed to be a filesystem path: for an alias it can be an alias definition, and for a function it can simply be the function name. This matters when Homebrew, `pipx`, a Python virtual environment, Snap, and a manually downloaded binary have each installed a different `yq`.

Fingerprint the selected command by invoking it normally, so an interactive alias or shell function is included:

```bash
if ! command -v yq >/dev/null; then
  printf '%s\n' 'yq is not on PATH' >&2
  exit 127
fi

printf 'selected command: %s\n' "$(command -v yq)"
yq --version
yq --help | sed -n '1,35p'
```

When you specifically need the first external executable on `PATH`, Bash's `type -P yq` returns that pathname while ignoring aliases and functions. It may not be the command a plain `yq` invocation selects, so compare it with `type -a yq` rather than substituting it silently.

If you changed `PATH` or replaced a binary during the current Bash session, run `hash -r` and repeat the check. Bash can remember the pathname previously selected for an external command.

## Fingerprint the Implementation, Not Just the Number

As of this writing, both major projects can have a 4.x version, so a major version alone is no longer enough.

Mike Farah `yq` identifies itself with output shaped like this:

```text
yq (https://github.com/mikefarah/yq/) version v4.53.3
```

Its help lists `eval`, `eval-all`, `--inplace`, `--null-input`, input/output formats, and a GitBook documentation URL. It is a standalone Go executable.

Andrey Kislyuk's Python `yq` describes itself as a jq wrapper. Its help exposes options such as `--yaml-output` or `-y` and `--yaml-roundtrip` or `-Y`, and it requires `jq`. Its current release number may also begin with 4, but its command-line contract is different.

Mike Farah v3 is a third common case. Its examples use subcommands such as `r`, `w`, `d`, and `m`. Those are not the v4 expression-first interface.

These signatures are more useful than guessing from the operating system package name:

| Signature | Implementation |
| --- | --- |
| Version output contains `github.com/mikefarah/yq/` and `version v4...` | Mike Farah v4 |
| Help says jq wrapper and offers `-y` or `-Y` | Kislyuk Python wrapper |
| Commands are `yq r`, `yq w`, and `yq d` | Mike Farah v3 |

Package provenance can confirm the result:

```bash
brew info yq 2>/dev/null || true
brew info python-yq 2>/dev/null || true
python3 -m pip show yq 2>/dev/null || true
snap list yq 2>/dev/null || true
```

Do not install another package until you know which existing executable your automation actually invokes.

## Understand the Mike Farah v4 Shape

In v4, `eval` is the default command. The expression normally comes first and filenames follow it:

```bash
yq '.application.image' config.yml
yq eval '.application.image' config.yml
```

Those commands are equivalent. `eval-all`, often shortened to `ea`, is different: it loads all documents from all input files and runs one expression across them. Use it when an operation depends on more than one file, such as a merge.

Updates are expressions too:

```bash
IMAGE_TAG=v2.4.1 \
  yq -i '.application.tag = strenv(IMAGE_TAG)' config.yml
```

Single quotes keep Bash from interpreting the yq expression. `strenv` passes the environment value as a YAML string without constructing program text through shell interpolation.

## Translate Mike Farah v3 Commands

The official v3-to-v4 guide provides direct translations for the common operations:

| Task | Mike Farah v3 | Mike Farah v4 |
| --- | --- | --- |
| Read a path | `yq r config.yml 'a.b.c'` | `yq '.a.b.c' config.yml` |
| Read with a default | `yq r config.yml --defaultValue frog path.missing` | `yq '.path.missing // "frog"' config.yml` |
| Write a value | `yq w -i config.yml 'a.b.c' fred` | `yq -i '.a.b.c = "fred"' config.yml` |
| Delete a value | `yq d -i config.yml 'a.b.c'` | `yq -i 'del(.a.b.c)' config.yml` |
| Append an array item | `yq w -i config.yml 'items[+]' fred` | `yq -i '.items += ["fred"]' config.yml` |
| Create new YAML | `yq n b.c cat` | `yq -n '.b.c = "cat"'` |

The key migration idea is that v4 encodes the operation in one expression. Do not keep a v3 verb and merely rearrange its flags.

Merging also changed. A right-biased deep merge of two files in v4 is:

```bash
yq eval-all \
  'select(fileIndex == 0) * select(fileIndex == 1)' \
  base.yml override.yml
```

Order is significant: values from `override.yml` take precedence where the multiply merge operator permits them to override.

## Translate Python-wrapper Examples

Many simple reads look deceptively similar because both tools use jq-like expressions:

```bash
yq '.application.image' config.yml
```

Their output defaults differ. The Python wrapper normally emits jq's JSON output unless `-y` or `-Y` is requested. Mike Farah v4 normally emits YAML and unwraps scalar values for YAML output.

An in-place Python-wrapper example may look like this:

```bash
yq -yi '.application.image = "api:v2"' config.yml
```

The Mike Farah v4 equivalent is:

```bash
yq -i '.application.image = "api:v2"' config.yml
```

Do not blindly remove every `-y`. In Mike Farah v4, `-y` is not the Python wrapper's YAML-output switch; use the documented `-o=yaml` when explicit output selection helps readability:

```bash
yq -o=yaml '.' config.json
```

Likewise, Python-wrapper filters are ultimately jq programs. Mike Farah v4 deliberately implements a jq-like language, not every jq feature. Confirm complex filters against the Mike Farah operator documentation rather than assuming full jq compatibility.

## Make Scripts Reject the Wrong Binary

Fail early in automation instead of producing a subtly different document:

```bash
version_output=$(yq --version 2>&1) || {
  printf '%s\n' 'cannot execute yq' >&2
  exit 1
}

case $version_output in
  *'github.com/mikefarah/yq/'*'version v4.'*) ;;
  *)
    printf 'Mike Farah yq v4 required; found: %s\n' \
      "$version_output" >&2
    exit 1
    ;;
esac
```

For reproducible CI, pin the release rather than downloading `latest` on every run. A container makes the implementation visible in configuration:

```bash
docker run --rm \
  -v "$PWD:/workdir" \
  mikefarah/yq:4.53.3 \
  '.application.image' config.yml
```

Pinning a tag prevents an unrelated `yq` package from being selected, though high-assurance pipelines should pin the image digest as well. For a downloaded executable, verify the release checksum or Sigstore bundle published with the official GitHub release.

## Diagnose Shell-versus-CI Differences

When a command works interactively but fails in CI, print diagnostics from both environments:

```bash
printf 'PATH=%s\n' "$PATH"
type -a yq || true
yq --version || true
```

Also check whether the script activates a Python virtual environment, runs inside a different container stage, or uses `sudo`. Each can select a different `PATH`. An alias visible in an interactive shell may not exist in a non-interactive CI shell. A script with `/usr/bin/env bash` inherits `PATH`; an absolute path selects one known executable.

## Conclusion

Treat `yq` as an ambiguous command name. Use Bash to identify every candidate, fingerprint the selected executable by its self-description and flags, and pin Mike Farah v4 in automation. Then translate v3 verbs into v4 expressions and translate Python-wrapper output flags deliberately. This short inventory step prevents most mysterious syntax errors and, more importantly, prevents a superficially successful command from producing the wrong format.

## Official Documentation

- [Mike Farah yq: Official Repository and Installation](https://github.com/mikefarah/yq)
- [Mike Farah yq: Upgrading from v3](https://mikefarah.gitbook.io/yq/upgrading-from-v3)
- [Mike Farah yq: Evaluate Command](https://mikefarah.gitbook.io/yq/commands/evaluate)
- [Kislyuk yq: Official Repository](https://github.com/kislyuk/yq)
- [GNU Bash Manual: Bourne Shell Builtins](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html)
