# How to Build Secure Rundeck Job Options for Passwords, Files, and Allowed Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Security, File Upload, Automation

Description: Choose the right Rundeck option type for secrets, remote authentication, uploaded files, and controlled values while avoiding command injection and secret leakage.

---

Rundeck job options are an input boundary. They can shape node selection, enter a command line, become environment variables, provide SSH credentials, or refer to an uploaded file. Marking every sensitive-looking field **Secure** is not enough: Rundeck has distinct option types with intentionally different exposure rules.

## Choose the Option Type by Destination

Use this decision table:

| Need | Option type | Available to job commands? | Stored with execution? |
| --- | --- | --- | --- |
| Environment, region, change ID | Plain | Yes | Yes |
| Application password/API secret | Secure | Yes, as plaintext at runtime | No option value in execution record |
| SSH or sudo authentication password | Secure Remote Authentication | No | No |
| User-supplied artifact/config | File | Local path and metadata references | Managed as an uploaded input |

A Secure option hides the input and avoids persisting its value with the execution, but the value can still appear in process arguments, environment variables, temporary inline-script files, application output, or downstream systems. It is a runtime secret, not an automatic end-to-end secret channel.

Secure Remote Authentication is deliberately narrower. The Node Executor consumes it, and normal commands and scripts cannot expand it. Use this type for supported SSH password, SSH key passphrase, or sudo authentication flows.

## Build a Constrained Plain Option

For `environment`, configure:

- Required: Yes
- Allowed values: `dev,stage,prod`
- Enforced from values: Yes
- Multi-valued: No, unless the workflow handles a list safely

An enforced list is stronger than a drop-down that still permits arbitrary input. A regular-expression restriction is useful for identifiers that cannot be enumerated:

```text
^CHG-[0-9]{6,10}$
```

Use the option as a quoted argument:

```text
/usr/local/bin/deploy --environment ${option.environment} --change ${option.change_id}
```

Rundeck escapes `${option.name}` in command contexts by default. Do not switch to `${unquotedoption.name}` merely to make a shell expression convenient. The official documentation warns that unquoted option expansion can enable command injection. Prefer a script that reads `$RD_OPTION_ENVIRONMENT`, validates it again, and passes it as one quoted argument:

```bash
#!/usr/bin/env bash
set -euo pipefail

case "$RD_OPTION_ENVIRONMENT" in
  dev|stage|prod) ;;
  *) echo "invalid environment" >&2; exit 2 ;;
esac

exec /usr/local/bin/deploy --environment "$RD_OPTION_ENVIRONMENT"
```

Validation in Rundeck improves the interface; validation in the script protects reuse outside Rundeck.

## Handle Passwords and Tokens

Create a Secure option when a script genuinely needs the value. Reference it as little as possible, never echo it, and enable the Mask Passwords log filter as defense in depth. Avoid putting secrets on a command line because other processes may be able to inspect the argument vector.

Where supported, point the Secure option at a **password** entry in Key Storage as its storage path. A user-supplied value can override that default, so decide whether the job should prompt or always use managed storage. Private/public key entries cannot be used as ordinary option values by design; only password entries can back Secure options.

When passing a secret through a Job Reference, both parent and child options must have the same type. Plain can map to Plain, Secure to Secure, and Secure Remote Authentication to the same authentication type. Rundeck refuses cross-type mappings to prevent a secret from becoming a persisted plain value or an authentication-only value from entering a script.

## Use File Options Safely

A File option does not expand directly to its original filename. Rundeck provides several references:

```text
${option.bundle}          # unique uploaded-file ID
${file.bundle}            # local path on the Automation Server
${file.bundle.filename}   # original client filename, when available
${file.bundle.sha}        # SHA-256 digest
```

Use `${file.bundle}` as the source for a Copy File or validation step. Treat the original filename as untrusted display metadata; never concatenate it into a destination path without sanitizing it. Prefer a server-chosen path:

```text
/var/tmp/rundeck-${job.execid}-bundle.tar.gz
```

Before copying, verify size, type, and expected digest or signature. Parse archives defensively to prevent path traversal, and delete remote temporary data in an always-run cleanup path.

The current Rundeck documentation calls out a major limitation: File options are not supported when a job executes through an Enterprise Runner. The uploaded file remains on the Automation Server, so `${file.NAME}` does not resolve on the Runner. There is no pre-execution warning. Jobs that depend on uploads must use the Local Runner/Automation Server or move artifacts through a supported repository workflow.

## Secure Remote Allowed Values

Rundeck can fetch allowed values from a URL, including cascading values that depend on another option. Treat the provider as part of your authorization design:

- Use HTTPS and authenticate the request appropriately.
- Return only values the caller is allowed to select.
- Enable **Enforced from values** if the list is a security boundary.
- Set timeouts and define behavior when the provider is unavailable.
- Do not place credentials in a query string or log provider responses containing secrets.

For cascading options, a URL can refer to another value as `${option.environment.value}`. Rundeck URL-encodes unsafe characters. Avoid dependency cycles; the documentation notes that cycles disable automatic reload and require a manual refresh.

## Review the Complete Data Path

Before publishing a job, trace each option through these questions:

1. Who may supply or override it?
2. Is it stored in execution history?
3. Can it reach logs, process lists, environment variables, or temporary files?
4. Does a Job Reference preserve its type?
5. Is it interpreted by a shell, node filter, URL, or file path?
6. Does execution occur on the Automation Server or a Runner?

Run a negative test for rejected values, blank required input, a malicious shell string, an oversized file, and unavailable remote values. Verify that execution output and audit records reveal selectors such as environment and change ID while excluding actual secrets.

## Conclusion

Secure Rundeck options come from matching the option type to its consumer. Use enforced plain values for selectors, Secure for secrets a script must consume, Secure Remote Authentication for executor-only credentials, and File for managed uploads on the Automation Server. Then validate again at the script boundary and design explicitly for every place plaintext could travel.

## Official Documentation

- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)
- [Built-in Node Steps](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html)
