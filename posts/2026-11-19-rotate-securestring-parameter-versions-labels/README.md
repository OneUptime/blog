# How to Rotate a `SecureString` with Parameter Versions and Labels Without Breaking Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, Secret Rotation, KMS

Description: Rotate SecureString credentials through captured parameter versions, controlled label promotion, consumer adoption checks, and a usable rollback window.

Updating a secret in Parameter Store does not update the database or API that accepts it. Successful rotation requires coordinating the credential issuer, the stored value, and every consumer.

Parameter Store stores encrypted versions; it does not create or revoke upstream credentials. AWS recommends [Secrets Manager for secrets requiring managed rotation](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). If your application already uses Parameter Store, the following publication workflow makes those responsibilities explicit.

## Establish the consumer contract first

Use `/payments/prod/api-token` as an example. Production consumers read `/payments/prod/api-token:prod`; tests read a captured numeric version such as `/payments/prod/api-token:42`. These are the documented [GetParameter selectors](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParameter.html).

Before rotating, attach `prod` to the known-good version and migrate every consumer to that selector. An unqualified name retrieves the latest version, so those readers would see a candidate immediately after it is written, before promotion. Unfiltered hierarchy readers also need migration; labels do not redirect their reads automatically. Verify every consumer's selection before creating the candidate. [Parameter version behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-versions.html) explains the latest-version default.

The credential issuer must support a period when both credentials work, such as two active API tokens or separate database users. Create the replacement without invalidating the existing credential. If changing a password immediately invalidates the old one and no alternate identity is possible, labels alone cannot guarantee uninterrupted service; plan a coordinated maintenance window.

## Serialize publishers and capture versions

Run one rotation workflow per parameter at a time, through adoption and retirement. Use a CI concurrency group or an external lock that every writer honors, including infrastructure automation and emergency operators.

`PutParameter(Overwrite=True)` creates a new version and returns its number. Capture that response instead of reading the unqualified name afterward: another writer could have changed “latest.” Always specify `ParameterVersion` when labeling. The [PutParameter](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html) and [LabelParameterVersion](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_LabelParameterVersion.html) request contracts expose no expected-current-version argument; read-then-write checks are not compare-and-swap protection.

This Boto3 fragment assumes an existing standard-tier `SecureString` with a working `prod` label and configured AWS credentials. Replace the identifiers, setting `KEY_ARN` to the parameter's current symmetric customer managed KMS key. The example keeps its tier and key fixed; do not apply `Tier="Standard"` to an existing advanced parameter, which cannot be downgraded. Its callbacks are application code: `verify` must perform a fresh authenticated backend operation (read-only when possible) and raise on failure; `record` durably stores only the version numbers in deployment metadata. Supply `new_secret` directly from your issuer adapter in process memory, without printing it or passing it through command-line arguments.

```python
import boto3

ssm = boto3.client("ssm", region_name="us-east-1")
NAME = "/payments/prod/api-token"
KEY_ARN = "arn:aws:kms:us-east-1:123456789012:key/REPLACE-ME"


def stage_rotation(new_secret, verify, record):
    previous = ssm.get_parameter(
        Name=f"{NAME}:prod", WithDecryption=False
    )["Parameter"]["Version"]

    candidate = ssm.put_parameter(
        Name=NAME,
        Type="SecureString",
        Tier="Standard",
        KeyId=KEY_ARN,
        Value=new_secret,
        Overwrite=True,
    )["Version"]
    versions = {"previous": previous, "candidate": candidate}
    record(versions)

    parameter = ssm.get_parameter(
        Name=f"{NAME}:{candidate}", WithDecryption=True
    )["Parameter"]
    verify(parameter["Value"])
    return versions
```

The [Boto3 write API](https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/put_parameter.html) documents these arguments and the `Version` response. Do not log SDK responses, secret-bearing locals, or debug request bodies. If verification or recording fails, stop before promotion. If the write response is lost, reconcile the uncertain outcome under the same serialization before proceeding; do not infer your candidate from the latest version.

## Promote by moving the existing label

After candidate validation, move `prod` directly to the captured version. AWS documents [assigning an existing label to another version](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html) as the move operation. Removing the label first creates an unnecessary interval when readers cannot resolve it.

```python
def move_production(version):
    result = ssm.label_parameter_version(
        Name=NAME,
        ParameterVersion=version,
        Labels=["prod"],
    )
    if result.get("InvalidLabels") or result["ParameterVersion"] != version:
        raise RuntimeError("Production label was not applied as requested")

    observed = ssm.get_parameter(
        Name=f"{NAME}:prod", WithDecryption=False
    )["Parameter"]["Version"]
    if observed != version:
        raise RuntimeError("Production label verification failed")


# Only after stage_rotation succeeded and its metadata was retained:
# move_production(versions["candidate"])
```

Check both the returned version and `InvalidLabels`, as specified by the [Boto3 label API](https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/label_parameter_version.html). A timeout or failed read-back leaves the outcome uncertain: inspect the selector again before taking further action. Keep both backend credentials valid during investigation.

This operation changes a selector for one parameter. It does not transactionally update other parameters, invalidate application caches, or switch every consumer simultaneously. Store a coupled username/password pair in one structured value if they must be selected together.

## Verify adoption before revocation

Each consumer should fetch `:prod` with `WithDecryption=True`, retain the returned `Version`, and build a new client or connection pool from the returned value. Test fresh authentication before installing that client, then drain old connections safely. Reading the new value while continuing to use an old pool is not adoption.

Give caches a bounded refresh interval with jitter, or trigger a controlled reload. Processes that only read at startup need a rollout. On refresh failure, retain the last working client and report the failure; continuing silently makes retirement unsafe.

Track active version and fresh-authentication success per consumer instance without recording the secret. Check scheduled jobs, infrequent workers, and newly started replicas as well as busy services. Retire the old credential only after verified adoption, the rollback window, and any required connection drain. Elapsed cache TTL alone does not prove every consumer has refreshed.

For rollback, first confirm the recorded previous version still exists and its credential still authenticates. Call `move_production(versions["previous"])`, reload consumers, and verify their adoption. Keep the replacement credential valid until returning consumers settle. If the previous credential was revoked or expired, moving the label cannot restore it; repair the backend or publish another valid credential.

## Keep permissions and retention usable

The publisher needs `ssm:PutParameter`, `ssm:GetParameter`, and `ssm:LabelParameterVersion` on this parameter; consumers need `ssm:GetParameter`. These are separate [SSM permissions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html).

Standard `SecureString` writes require `kms:Encrypt`; advanced writes require `kms:GenerateDataKey`. Decrypted reads require `kms:Decrypt` for either tier, including the publisher's validation read. See [Parameter Store KMS permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html). For customer managed keys, verify the [key-policy, IAM, or grant authorization path](https://docs.aws.amazon.com/kms/latest/developerguide/control-access.html); IAM access needs key-policy support. Preserve access to keys encrypting rollback versions.

A version supports ten labels. Labels have a 100-character maximum, accept letters, numbers, periods, hyphens, and underscores, and cannot start with a number, `aws`, or `ssm`. Prefix restrictions are case-insensitive; labels themselves are case-sensitive. See [label restrictions](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_LabelParameterVersion.html).

Parameter Store retains up to 100 versions. Normally the next write removes the oldest; if that oldest version has a label, the write fails instead. Review [version retention](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-versions.html) before rotation. Retire obsolete labels deliberately after their consumers and rollback obligations end. Never move an actively used label merely to clear a version-limit error.
