# How to Source Drone Secrets from HashiCorp Vault Without Storing Long-Lived Tokens in Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, HashiCorp Vault, Security, CI/CD, DevOps

Description: Source Drone secrets through a Vault extension with infrastructure-managed AppRole credentials and explicit repository and event restrictions.

Keep Vault authentication on an infrastructure-managed secret extension, outside repository YAML and build containers. Drone steps can request a named value through `from_secret`; they do not need a Vault token to retrieve it themselves.

Drone's [Vault extension installation](https://docs.drone.io/runner/extensions/vault/) documents the runner integration. The official [extension repository](https://github.com/drone/drone-vault) also documents AppRole authentication, which exchanges an infrastructure-provided RoleID and SecretID for Vault tokens.

## Separate the identities and permissions

There are three different credentials in this design:

| Credential | Who holds it |
| --- | --- |
| Drone extension shared secret | Runner and extension |
| Vault AppRole credentials | Extension deployment infrastructure |
| Requested application credential | Only the permitted build step |

AppRole avoids placing a long-lived Vault token in a repository. It does not eliminate credentials: protect, rotate, and deliver the SecretID through your infrastructure secret manager. A leaked SecretID can still be valuable until its restrictions or lifetime prevent use.

Create a Vault policy that lets this extension identity read only its intended path:

```hcl
path "secret/data/ci/acme/api" {
  capabilities = ["read"]
}
```

Attach that policy to an AppRole with an appropriate token lifetime, SecretID lifetime, and usage policy. Configure renewal and SecretID replacement according to your operating model. HashiCorp's [AppRole documentation](https://developer.hashicorp.com/vault/docs/auth/approle) explains those controls; avoid using a root token or a policy granting the extension access to all secrets.

## Store both the value and Drone access restrictions

This example assumes a KV v2 mount named `secret`. Prepare a protected JSON file outside your repository:

```json
{
  "token": "disposable-test-token",
  "x-drone-repos": "acme/api",
  "x-drone-events": "push",
  "x-drone-branches": "main",
  "x-drone-disallow-forks": "true"
}
```

Write it as an administrator:

```sh
vault kv put -mount=secret ci/acme/api @ci-secret.json
```

Use a real narrowly scoped application token only after testing with the disposable value. KV v2 uses the `data/` component in its HTTP read path; its friendly CLI path omits that component. HashiCorp documents this distinction in the [KV v2 guide](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2).

Drone's [external Vault secrets documentation](https://docs.drone.io/secret/external/vault/) says secret access is broad by default. The repository, event, and branch fields are therefore part of the access policy, not optional descriptive metadata. The extension's [implementation](https://github.com/drone/drone-vault/blob/master/plugin/plugin.go) also supports rejecting fork requests; verify that capability in the pinned image you deploy.

## Configure the extension and runner

Inject these into the extension deployment from infrastructure-managed configuration:

```text
DRONE_SECRET=<extension-shared-secret>
DRONE_DISALLOW_FORKS=true
VAULT_ADDR=https://vault.internal.example.com
VAULT_AUTH_TYPE=approle
VAULT_APPROLE_ID=<role-id>
VAULT_APPROLE_SECRET=<secret-id>
VAULT_TOKEN_TTL=1h
VAULT_TOKEN_RENEWAL=30m
```

The durations are an example, not a substitute for the AppRole's actual constraints. Verify login and renewal with your Vault role, and arrange SecretID rotation before it expires. Keep Vault certificate verification enabled and supply the required CA trust to the extension.

Set these on the runner:

```text
DRONE_SECRET_PLUGIN_ENDPOINT=https://drone-vault.internal.example.com
DRONE_SECRET_PLUGIN_TOKEN=<extension-shared-secret>
```

The extension's built-in HTTP service may require a TLS proxy for that HTTPS endpoint. Restrict access to it because it can return secrets after authenticating requests. Pin the extension image and keep its authentication behavior under change control.

## Reference the value without exposing Vault credentials

The repository declares the external path and local secret name:

```yaml
kind: pipeline
type: docker
name: verify-secret
trigger:
  event:
    - push
  branch:
    - main
steps:
  - name: check
    image: alpine:3.22
    environment:
      API_TOKEN:
        from_secret: api_token
    commands:
      - |
        set +x
        test -n "$$API_TOKEN"

---
kind: secret
name: api_token
get:
  path: secret/data/ci/acme/api
  name: token
```

The check disables shell tracing before verifying presence so the expanded token is not echoed into the build log. Replace it with the intended application operation without printing the token. The path itself is visible to repository readers, so do not encode sensitive information in path names.

Test the allowed main push, a different branch, another repository, and a fork pull request. The latter cases must fail to receive the value. Test extension downtime, expired AppRole credentials, and token renewal too. Diagnose those failures through sanitized extension logs and Vault audit records, keeping actual secret values out of build logs and test reports.
