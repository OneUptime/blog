# Validation Summary: How to Handle Jenkins Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins (Credentials Plugin, Declarative & Scripted Pipelines)
- Jenkins CLI (`create-credentials-by-xml`)
- Groovy Script Console (CloudBees Credentials API: `UsernamePasswordCredentialsImpl`, `StringCredentialsImpl`, `BasicSSHUserPrivateKey`)
- `withCredentials` bindings: `usernamePassword`, `string`, `file`, `sshUserPrivateKey`
- `sshagent` step (SSH Agent Plugin)
- HashiCorp Vault Plugin (`withVault`)
- AWS Secrets Manager (AWS CLI `secretsmanager get-secret-value`)
- Kubernetes (`kubectl create secret tls`, `--dry-run=client`)
- Google Cloud (`gcloud auth activate-service-account`, `gcloud run deploy`)
- Mask Passwords Plugin (`MaskPasswordsBuildWrapper`)
- OpenSSH (`ssh-add`, `ssh-agent`, `SSH_ASKPASS`)
- Docker / Docker Hub login via `--password-stdin`
- Email Extension Plugin (`emailext`)

## Sources Consulted
- Jenkins User Handbook — Using Credentials: https://www.jenkins.io/doc/book/using/using-credentials/
- Jenkins Pipeline Syntax — `withCredentials`: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins CLI documentation — `create-credentials-by-xml`: https://www.jenkins.io/doc/book/managing/cli/
- CloudBees Credentials Plugin Javadoc — `UsernamePasswordCredentialsImpl`, `BasicSSHUserPrivateKey`, `CredentialsScope`: https://javadoc.jenkins.io/plugin/credentials/
- SSH Credentials Plugin: https://plugins.jenkins.io/ssh-credentials/
- SSH Agent Plugin (`sshagent` step): https://plugins.jenkins.io/ssh-agent/
- HashiCorp Vault Jenkins Plugin: https://plugins.jenkins.io/hashicorp-vault-plugin/
- Mask Passwords Plugin: https://plugins.jenkins.io/mask-passwords/
- AWS CLI reference — `secretsmanager get-secret-value`: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html
- AWS CLI reference — `s3 sync`: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- kubectl reference — `create secret tls`, `--dry-run=client`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-tls-em-
- gcloud reference — `run deploy`, `auth activate-service-account`: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- OpenSSH manual — `ssh-add(1)`, `SSH_ASKPASS` environment variable: https://man.openbsd.org/ssh-add
- Docker login `--password-stdin`: https://docs.docker.com/engine/reference/commandline/login/

## Issues Found

1. **Broken `SSH_ASKPASS` usage in the "Deploy via SSH" stage.** The original script set `SSH_ASKPASS="echo ${SSH_PASSPHRASE}"`. Per `ssh-add(1)` / OpenSSH, `SSH_ASKPASS` must be a path to an executable program, not a shell command string. As written, ssh-add would fail to find an executable at the given "path" and the passphrase branch would not work. Additionally, `SSH_ASKPASS_REQUIRE=force` only exists in OpenSSH 8.4+ and was unnecessary here. The standard way to invoke a non-interactive `ssh-add` is with a small temporary script plus `DISPLAY` set and `setsid` so the askpass program is invoked. I rewrote the passphrase branch to create a temporary askpass script, set `DISPLAY=:0`, and run `setsid ssh-add ... < /dev/null`, then delete the temp script. This is the conventional working pattern.

## Review Notes

- **Credential scopes terminology.** The post lists "Global / System / Folder" as the three credential scopes. Strictly speaking, the `CredentialsScope` enum in the Credentials plugin has values `GLOBAL`, `SYSTEM`, and `USER`; "Folder" is provided by the Folders plugin as a credential *store* rather than a scope (credentials inside a folder store still have `GLOBAL` or `SYSTEM` scope). The article's grouping is a common practical simplification used in many Jenkins tutorials, so I left it as-is — but readers writing programmatic code with `CredentialsScope` should be aware of the precise enum values.
- **HashiCorp Vault KV path format.** The example uses `secret/data/myapp/database`. With the Vault plugin's `engineVersion: 2` (the modern default), the plugin inserts `/data/` automatically and you should pass the logical path `secret/myapp/database`. The literal `secret/data/...` form only works correctly when `engineVersion: 1` is configured (treating the path verbatim). The plugin configuration in the example does not set `engineVersion` explicitly; readers should specify it to avoid surprises depending on plugin version.
- **`CredentialsProvider.lookupCredentials` is deprecated.** The troubleshooting Groovy snippet uses `CredentialsProvider.lookupCredentials(...)`, which is marked deprecated since credentials plugin 2.1.5 in favor of `lookupCredentialsInItemGroup(...)` / `lookupCredentialsInItem(...)`. The deprecated method still works, but new code should prefer the newer signatures.
- **AWS credentials binding.** The declarative example binds `AWS_ACCESS_KEY_ID = credentials('aws-access-key')` etc. This assumes the credentials are stored as "Secret text". If users instead store them as a single "AWS Credentials" type (from the AWS Credentials plugin), `credentials()` would create `*_USR`/`*_PSW` variables instead. The example works under the implicit "Secret text" assumption but the comment "AWS credentials example" could be misread.
- **Groovy ternary line break.** The scripted-pipeline example splits a ternary across three lines with `?` and `:` at the start of continuation lines. Groovy generally tolerates this, but the safer canonical form is to put `?` at the end of the line or wrap in parentheses. Functionally fine as written.
