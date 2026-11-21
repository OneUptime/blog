# Rotate Expiring S3 Credentials in JuiceFS Without Unmounting Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JuiceFS, S3, Security

Description: Rotate a complete S3 temporary-credential set through JuiceFS configuration, distinguish SDK renewal from static secrets, and verify uncached access before expiry.

A JuiceFS mount can look healthy after its S3 credentials expire. Directory listings may come from the metadata engine, and repeated reads may come from cache. The failure appears later when the client needs a new object or tries to upload a block.

Preventing that outage requires more than replacing a Kubernetes Secret or exporting a new variable in an administrator's shell. Determine how the running client obtains its credentials, renew the complete set early, and verify real object-storage traffic from the affected clients.

This guide follows **JuiceFS Community Edition 1.4.2**. It distinguishes two mechanisms: credential providers that can renew credentials themselves, and explicitly configured credentials that you update in JuiceFS metadata.

## Treat temporary credentials as one expiring set

AWS Security Token Service (STS) issues an access key, a secret access key, and a session token with an expiration time. Requests need the matching three values. Updating only the access key and secret while retaining an old token produces an invalid combination.

An issued set cannot be extended past its expiration; obtain a new set instead. AWS explains these requirements in its [temporary-credential guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html).

Track expiration outside JuiceFS's stored credential fields. The operator or renewal service needs a deadline, an early-warning threshold, and evidence that every relevant client adopted the new set. Expiration is a failure boundary, not the scheduled time to begin rotation.

## Identify which renewal path you use

The 1.4.2 [S3 backend](https://github.com/juicedata/juicefs/blob/v1.4.2/pkg/object/s3.go) selects a static credential provider when an explicit access key is supplied. Otherwise it loads the AWS SDK's default configuration.

| Credential source | Renewal responsibility |
| --- | --- |
| Explicit access key, secret, and token stored for the volume | Your rotation workflow publishes a replacement set |
| A supported renewing role provider in the SDK chain | The provider renews, provided its identity endpoint remains available |
| Temporary values injected as static environment variables | Do not assume the running process will receive later shell or Secret changes |

The SDK chain can include several sources with precedence rules. An unintended static environment value may prevent the role-based path you expected. Review the [AWS SDK for Go configuration guide](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html), the process environment, and the deployment's actual identity setup.

For a working renewing provider, validate renewal across an expiration boundary in staging. Do not introduce volume-wide static credentials merely because one client has a broken identity endpoint.

## Understand the metadata-update path

For explicit volume credentials, `juicefs config` updates the stored configuration. Running clients reload metadata configuration in their background refresh loop. The mount's reload handler detects changed access keys, secret keys, or session tokens and rebuilds the object-storage client.

```mermaid
flowchart LR
    A[Obtain fresh STS credential set] --> B[Validate permission and remaining lifetime]
    B --> C[Update JuiceFS volume configuration]
    C --> D[Clients refresh metadata configuration]
    D --> E[Rebuild object-storage client]
    E --> F[Verify uncached reads and uploads]
    F --> G[Record adoption before old expiry]
```

This behavior is visible in the [configuration command](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/config.go), [mount reload handler](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/mount.go), and [metadata refresh loop](https://github.com/juicedata/juicefs/blob/v1.4.2/pkg/meta/base.go). It supports rotation without a planned unmount, but does not guarantee immediate adoption by every disconnected or unhealthy client.

Inventory all mounts, gateways, and other volume consumers. Record their versions and credential paths. Choose an overlap window that covers issuance, configuration validation, client refresh, retries, and verification, with time left for recovery.

## Reject credentials with too little lifetime

Before publishing an STS response, check its expiration. This Python 3.11-compatible example reads an AWS-style response file without printing its credentials. Save it as `check-sts-lifetime.py`:

```python
import json
import sys
from datetime import datetime, timezone

if len(sys.argv) != 2:
    raise SystemExit("usage: check-sts-lifetime.py RESPONSE.json")

with open(sys.argv[1], encoding="utf-8") as stream:
    credentials = json.load(stream)["Credentials"]

for field in ("AccessKeyId", "SecretAccessKey", "SessionToken"):
    if not isinstance(credentials.get(field), str) or not credentials[field]:
        raise SystemExit(f"Missing credential field: {field}")

expires = datetime.fromisoformat(
    credentials["Expiration"].replace("Z", "+00:00")
)
if expires.tzinfo is None:
    raise SystemExit("Expiration must include a timezone")
remaining = (expires - datetime.now(timezone.utc)).total_seconds()
if remaining < 600:
    raise SystemExit("Less than ten minutes remain; obtain a fresh set")
print(f"Credential lifetime check passed: {int(remaining)} seconds remain")
```

The ten-minute margin is an illustrative minimum, not a universal rotation schedule. Raise it to fit your observed propagation and recovery time. Keep the response file in restricted temporary storage and manage its retention as a secret. This check proves only that the supplied response has required fields and enough stated lifetime; it does not authenticate the response or prove S3 permissions.

## Publish all three values together

Have the approved secret mechanism populate `NEXT_ACCESS_KEY`, `NEXT_SECRET_KEY`, and `NEXT_SESSION_TOKEN` from the same validated response. Set `META_URL` to the existing volume's authenticated metadata connection. Then, from a restricted administrative host:

```bash
: "${META_URL:?Select the existing volume}"
: "${NEXT_ACCESS_KEY:?Supply the fresh access key}"
: "${NEXT_SECRET_KEY:?Supply the matching secret key}"
: "${NEXT_SESSION_TOKEN:?Supply the matching session token}"

juicefs config "$META_URL" \
  --access-key "$NEXT_ACCESS_KEY" \
  --secret-key "$NEXT_SECRET_KEY" \
  --session-token "$NEXT_SESSION_TOKEN"
```

The shell variables avoid literal secrets in the example, but their expanded values are command arguments. Run this only where process-argument visibility is appropriately restricted, disable shell tracing, and protect administrative logs. The command can also report access-key identifiers. Do not paste its full output into public incident records.

Do not add `--force`. The normal configuration path tests the candidate storage configuration before saving it. That test can perform storage operations, so the new identity must have the intended permissions for the volume, not merely permission to list a bucket.

Keep the bucket, storage type, encryption configuration, and metadata destination unchanged during credential rotation. One command updates the complete candidate configuration; issuing three separate commands creates unnecessary intermediate states.

## Verify adoption rather than trusting cached success

Watch client logs for configuration reloads and object-client creation errors. A successful administrative command means the configuration was accepted at that point; it does not prove every existing client has used it.

From controlled application contexts, write a unique test file, wait for the deployment's normal upload completion guarantees, and read it from a client without that data cached. Also read an existing object that the tested client has not recently accessed. Check storage-side request evidence where available to confirm the new identity is being used.

For writeback clients, a successful application write or local readback alone is insufficient because upload may still be pending. Preserve pending staged data during troubleshooting. Do not clear production caches or restart every client simply to force a verification request.

Continue observing beyond the old credential expiration in staging. Record the latest successful renewal, remaining lifetime, clients not yet verified, and authorization failures. Renewing credentials successfully once does not prove the recurring workflow is reliable.

## Recover without making the outage broader

If the new set is rejected, check token matching, role permissions, endpoint reachability, and clock accuracy. Obtain another valid set if necessary. Reapplying an expired set cannot restore access, and an old set is useful only while it remains valid and authorized.

Local testing confirmed that JuiceFS 1.4.2 accepts sequential three-field configuration updates on a disposable file-backed volume while preserving its UUID and bucket. That backend does not authenticate S3 credentials. No live STS renewal or mounted-client adoption was tested here; rehearse those steps with the actual identity provider before relying on an unattended rotation schedule.
