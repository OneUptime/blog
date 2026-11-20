# SSM Parameter Store `AccessDeniedException`: Check IAM, Paths, and KMS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, IAM, KMS, Troubleshooting

Description: Diagnose Parameter Store access denials by matching the caller, retrieval action, resource path, and SecureString decryption permissions without printing parameter values.

An application can read a parameter successfully with one API and receive `AccessDeniedException` with another. A `SecureString` read can also pass Systems Manager authorization and fail when AWS KMS decrypts the value. Treat these as separate checks before changing permissions.

This walkthrough targets one intended operation: an application role reading `/payments/prod/db-password` with `GetParameter`, in `us-east-1`, using a customer managed KMS key in the same account. Substitute your actual identifiers throughout.

## Establish the caller and exact request

Run diagnostics in the application's credential context. A successful command from your administrator laptop does not establish what the application role can do. Confirm the identity using [STS GetCallerIdentity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html):

```bash
aws sts get-caller-identity \
  --query '{Account:Account,Arn:Arn}' \
  --output json --no-cli-pager
```

Record the failing operation, Region, parameter name or requested path, decryption setting, error text, and request ID. If reproducing through a named CLI profile, use the same `--profile` on every diagnostic command. Check the application's configured credentials separately; passing `--profile` to a CLI command does not select that profile for the application's SDK.

## Match the retrieval action

Parameter Store authorizes these operations independently:

| Operation | Required IAM action | Resource evaluated |
| --- | --- | --- |
| `GetParameter` | `ssm:GetParameter` | The named parameter |
| `GetParameters` | `ssm:GetParameters` | Each named parameter |
| `GetParameterHistory` | `ssm:GetParameterHistory` | The named parameter |
| `GetParametersByPath` | `ssm:GetParametersByPath` | The requested path |

Consequently, allowing `GetParameter` does not fix a client that calls `GetParameters`. Denying `GetParameter` does not block the other three operations. AWS documents this explicitly in the [GetParameter reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html).

History is also a value-reading permission: it includes the current version. Do not grant it merely to help a runtime inspect metadata. Review all existing retrieval permissions when establishing an access boundary. [AWS's permission guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-setting-up.html) describes this history-access caveat.

## Compare the full ARN and requested path

For the example parameter, the resource ARN is:

```text
arn:aws:ssm:us-east-1:123456789012:parameter/payments/prod/db-password
```

The name's leading slash is omitted after `parameter/`; `parameter//payments/...` is wrong. Check partition, Region, owning account, and the complete name against the [Systems Manager resource format](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html).

For `GetParametersByPath`, inspect the actual `Path` argument. A request for `/payments/prod` authorizes the requested hierarchy rather than each returned parameter. Check the policy against the client's exact path request; a policy for individual parameter reads does not establish permission for a path read. Add path access only if reading that entire intended hierarchy is required.

Recursive access is especially important: a caller allowed to read `/payments` recursively can retrieve descendants even when a deny names a leaf parameter's ARN, including a deny for `ssm:GetParametersByPath`. AWS evaluates the requested path, so protecting `/payments/prod/db-password` requires controlling `/payments/prod`, `/payments`, and `/`. A deny must match the action and resource actually evaluated; it does not filter individual results from an authorized ancestor-path request. See [path authorization](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-retrieval-authorization.html) and [restricting parameters and paths](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-restrict-parameter-access.html).

## Separate SSM access from decryption

Use a metadata-only output projection for both probes:

```bash
aws ssm get-parameter \
  --region us-east-1 \
  --name /payments/prod/db-password \
  --no-with-decryption \
  --query 'Parameter.{Name:Name,ARN:ARN,Type:Type,Version:Version}' \
  --output json --no-cli-pager

aws ssm get-parameter \
  --region us-east-1 \
  --name /payments/prod/db-password \
  --with-decryption \
  --query 'Parameter.{Name:Name,ARN:ARN,Type:Type,Version:Version}' \
  --output json --no-cli-pager
```

The query suppresses values in displayed output; the decrypted response still reaches the CLI process. Keep debug logging and response-capturing wrappers disabled. The [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html) documents the decryption flags, and [CLI filtering guidance](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html) explains that `--query` runs after the response reaches the client.

If the first probe fails, investigate SSM authorization first. If it succeeds for a `SecureString` and only the second fails, inspect the KMS error and key authorization. Both standard and advanced `SecureString` decryption require `kms:Decrypt`. Neither `String` nor `StringList` uses this decryption switch. [AWS explains the SecureString decryption flow](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html).

Have a parameter administrator confirm the configured `KeyId` through [DescribeParameters](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-parameters.html), then identify the actual key ARN. That metadata operation has separate permissions; the runtime need not receive it just for diagnosis. If aliases or parameter versions changed, verify which key encrypted the version being requested. In the IAM `kms:Decrypt` statement, use the [KMS key ARN](https://docs.aws.amazon.com/kms/latest/developerguide/cmks-in-iam-policies.html), not a key ID, alias name, or alias ARN.

## Express the intended permission narrowly

For our single-parameter example, this identity policy permits only the selected SSM action and decryption through SSM for that parameter:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/payments/prod/db-password"
    },
    {
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.us-east-1.amazonaws.com",
          "kms:EncryptionContext:PARAMETER_ARN": "arn:aws:ssm:us-east-1:123456789012:parameter/payments/prod/db-password"
        }
      }
    }
  ]
}
```

`PARAMETER_ARN` is the encryption-context entry supplied by Parameter Store. The `kms:ViaService` restriction matches SSM acting for the caller; a direct `aws kms decrypt` test will not satisfy it. These conditions constrain this allow statement, not permissions granted elsewhere. See [Parameter Store encryption context](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html#parameter-store-encryption-context) and [KMS service conditions](https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html#conditions-kms-via-service).

This example assumes the customer managed key policy enables this account's IAM policies to grant decrypt access. Otherwise, inspect the intended key-policy or grant authorization path with the key administrator. Adding an IAM allow alone cannot replace the required [KMS authorization](https://docs.aws.amazon.com/kms/latest/developerguide/control-access.html).

The default `alias/aws/ssm` key differs: its AWS-managed policy cannot be edited, and it provides broad in-account decrypt access through SSM. Use a customer managed key when separate decryption control is required. [AWS documents the default-key distinction](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-setting-up.html).

## Check the remaining policy layers

An applicable explicit deny overrides an allow. Review identity policies, permissions boundaries, assumed-role session restrictions, and organization controls against the same request. Adding broader actions will not resolve a matching deny. Follow the [IAM policy evaluation guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html).

If the request uses an SSM VPC endpoint, check that endpoint's policy for the caller, action, and resource. [Systems Manager endpoint policies](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html) impose another access restriction.

For an AWS RAM cross-account share, verify advanced tier, the owner's full parameter ARN in `GetParameter` or `GetParameters`, and a customer managed key shared separately for `SecureString`. Verify both the owning key policy and consumer IAM permissions. [Shared-parameter requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-shared-parameters.html) describe that workflow.

Retest the exact application operation after the targeted correction. Confirm the intended read succeeds, then check that unrelated parameters and unintended retrieval APIs remain inaccessible under the complete policy set.
