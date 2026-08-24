# Store Telegraf Secrets with systemd Credentials and Docker Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Secrets Management, Systemd, Docker, Security

Description: Replace plaintext Telegraf credentials with native secret stores and choose rotation and runtime behavior appropriate to each deployment model.

---

Environment substitution keeps values out of a Telegraf TOML file, but it can still expose secrets through service definitions, container metadata, deployment manifests, diagnostics, or process environments. Telegraf secret-store plugins resolve references such as `@{store_id:secret_name}` at runtime and protect the resolved values in memory.

Not every option accepts a secret reference. Plugin documentation has a **Secret store support** section listing supported options; using `@{...}` in an unsupported option fails rather than magically hiding the value.

## Reference a Secret from an Output

For an InfluxDB v2 output, `token` is secret-capable:

```toml
[[outputs.influxdb_v2]]
  urls = ["https://us-east-1-1.aws.cloud2.influxdata.com"]
  organization = "platform"
  bucket = "telegraf"
  token = "@{host_secrets:influxdb_token}"
```

The `host_secrets` ID must match one configured store. Store IDs and secret names may contain only letters, numbers, and underscores.

## systemd Credentials for a Linux Service

The systemd store is designed for Telegraf launched by systemd:

```toml
[[secretstores.systemd]]
  id = "host_secrets"

[[outputs.influxdb_v2]]
  urls = ["https://influx.example.com"]
  organization = "platform"
  bucket = "telegraf"
  token = "@{host_secrets:influxdb_token}"
```

Telegraf's plugin requires systemd 250 or later. The default package unit uses `ImportCredential`, which requires systemd 254 or later. On older supported systemd versions, inject each encrypted credential with a service drop-in using `LoadCredentialEncrypted=`.

Create an encrypted credential without putting its plaintext in shell history:

```bash
sudo install -d -m 0700 -o root -g root /etc/credstore.encrypted
sudo systemd-creds setup
systemd-ask-password -n | \
  sudo systemd-creds encrypt - \
  /etc/credstore.encrypted/telegraf.influxdb_token
```

The default `prefix = "telegraf."` is stripped, so the file `telegraf.influxdb_token` becomes the key `influxdb_token`. Do not pass a custom `--name` when relying on the package unit's `ImportCredential` behavior.

The store is available only inside the systemd service and is static: Telegraf reads values at startup. A manual `telegraf --test` or `telegraf secrets` command cannot see those injected credentials. Validate this configuration through a controlled service instance, and restart it after rotating a credential.

## Docker Secrets for a Container

Docker mounts declared secrets as files under `/run/secrets` in the container. Configure Telegraf's store:

```toml
[[secretstores.docker]]
  id = "container_secrets"
  path = "/run/secrets"
  dynamic = false

[[outputs.influxdb_v2]]
  urls = ["https://influx.example.com"]
  organization = "platform"
  bucket = "telegraf"
  token = "@{container_secrets:influxdb_token}"
```

Then attach the secret in Compose:

```yaml
services:
  telegraf:
    image: telegraf:1.39
    user: "${USERID}:${GROUPID}"
    secrets:
      - influxdb_token
    volumes:
      - ./telegraf.conf:/etc/telegraf/telegraf.conf:ro

secrets:
  influxdb_token:
    file: ./secrets/influxdb_token
```

Before starting Compose, set `USERID` and `GROUPID` to the numeric owner and group of `./secrets/influxdb_token`; for a file owned by your current account, run `USERID=$(id -u) GROUPID=$(id -g) docker compose up -d`. Compose implements file-backed secrets as bind mounts and ignores per-secret `uid`, `gid`, and `mode`, so the container identity must be able to read the restricted source file.

The Docker store is read-only from Telegraf. With `dynamic = true`, Telegraf rereads the mounted file on later accesses by a consuming plugin. In ordinary Compose, this can expose in-place changes to a `file`-backed secret; an `environment` secret is materialized when the container is created. External-secret update behavior depends on the deployment platform; Docker Swarm secrets are immutable, so rotation replaces the secret and redeploys the task. Keep the source file out of Git and restrict its permissions.

## The Native OS Keyring

The OS store uses the Linux kernel keyring, macOS Keychain, or Windows Credential Manager:

```toml
[[secretstores.os]]
  id = "keyring_secrets"
  keyring = "telegraf"
  dynamic = false
```

Set a value through Telegraf so it uses the configured store:

```bash
telegraf --config /etc/telegraf/telegraf.conf \
  secrets set keyring_secrets influxdb_token
```

Telegraf also accepts the value as a third positional argument, but supplying it literally can expose it through shell history or process inspection. Omit it, as above, to use Telegraf's hidden interactive prompt.

With `dynamic = false`, values are read once at startup. `dynamic = true` asks a plugin for the current value whenever it accesses the secret, which can enable rotation without restart when the consuming plugin performs later accesses. It does not guarantee that every plugin reconnects immediately.

On Linux, the OS plugin uses a user-scope kernel keyring, so populate and run it under the correct service identity. Kernel keyrings are disabled by default in Docker and are not namespaced; enabling them can expose keys between containers on the same host. Prefer Docker Secrets inside ordinary containers.

## Protect Secrets After Resolution

Telegraf locks memory pages that contain secrets. Ensure the process has enough locked-memory allowance; Telegraf warns at startup when the limit is too low. The official container guidance uses `docker run --ulimit memlock=<bytes>` when needed.

Also apply basic controls:

- keep configuration and credential metadata readable only by the required account;
- never print secret values with `telegraf secrets list --reveal-secret` in automation logs;
- separate read-only agent credentials from administrative tokens;
- rotate and revoke credentials through the backing system; and
- verify startup and authentication without logging request headers or plaintext secrets.

## Choose by Runtime Boundary

Use systemd credentials for a package-managed Linux service, Docker Secrets for orchestrated containers, and the OS keyring for a stable host identity with an available native keyring. The choice should match who starts Telegraf and how credentials rotate-not merely which syntax is shortest.

## Official Documentation

- [Use secrets in Telegraf configurations](https://docs.influxdata.com/telegraf/v1/configuration/secrets/)
- [systemd secret store plugin](https://docs.influxdata.com/telegraf/v1/secretstore-plugins/systemd/)
- [Docker secret store plugin](https://docs.influxdata.com/telegraf/v1/secretstore-plugins/docker/)
- [OS secret store plugin](https://docs.influxdata.com/telegraf/v1/secretstore-plugins/os/)
- [`telegraf secrets set` command](https://docs.influxdata.com/telegraf/v1/commands/secrets/set/)
- [InfluxDB v2 output plugin](https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/)
- [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

## Conclusion

Define a secret store, reference only documented secret-capable options with `@{store:key}`, and align the backend with the process boundary. Account for systemd version requirements, Docker's mounted-file behavior, OS-keyring identity, static versus dynamic reads, and locked memory so the credential stays protected throughout its lifecycle.
