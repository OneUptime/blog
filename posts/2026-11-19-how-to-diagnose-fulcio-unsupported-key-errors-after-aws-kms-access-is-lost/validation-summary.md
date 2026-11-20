# Validation Summary: How to Diagnose Fulcio Unsupported-Key Errors After AWS KMS Access Is Lost

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI diagnostic commands.

## Technologies Covered
- Sigstore Fulcio and its KMS CA backend
- AWS KMS asymmetric signing keys, aliases, and key policies
- AWS CLI, AWS STS, IAM roles, and temporary credentials
- AWS CloudTrail and VPC endpoint policies
- Go crypto.Signer and X.509 certificate creation

## Sources Consulted
- Fulcio KMS CA implementation: https://github.com/sigstore/fulcio/blob/main/pkg/ca/kmsca/kmsca.go
- Fulcio base CA implementation: https://github.com/sigstore/fulcio/blob/main/pkg/ca/baseca/baseca.go
- Fulcio certificate-maker documentation, including certificate/key matching: https://github.com/sigstore/fulcio/blob/main/docs/certificate-maker.md
- Sigstore AWS signer adapter: https://github.com/sigstore/sigstore/blob/main/pkg/signature/kms/aws/signer.go
- Sigstore AWS KMS client and metadata cache: https://github.com/sigstore/sigstore/blob/main/pkg/signature/kms/aws/client.go
- Go X.509 implementation: https://go.dev/src/crypto/x509/x509.go
- AWS CLI get-caller-identity: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS CLI describe-key: https://docs.aws.amazon.com/cli/latest/reference/kms/describe-key.html
- AWS CLI get-public-key: https://docs.aws.amazon.com/cli/latest/reference/kms/get-public-key.html
- AWS KMS GetPublicKey API: https://docs.aws.amazon.com/kms/latest/APIReference/API_GetPublicKey.html
- AWS KMS Sign API: https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html
- AWS KMS permission troubleshooting: https://docs.aws.amazon.com/kms/latest/developerguide/policy-evaluation.html
- AWS KMS alias updates: https://docs.aws.amazon.com/kms/latest/developerguide/alias-update.html
- AWS KMS CloudTrail logging: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- AWS KMS VPC endpoints: https://docs.aws.amazon.com/kms/latest/developerguide/kms-vpc-endpoint.html
- AWS CLI role credentials and caching: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all three CLI commands, line continuations, region and alias arguments, and the JMESPath projection. The commands and response field names are valid. The projection intentionally displays metadata rather than the public-key bytes; the API still retrieves the public key. DescribeKey returns the ARN in KeyMetadata.Arn, while GetPublicKey returns the key ARN in KeyId.
- Confirmed that GetPublicKey, DescribeKey, and Sign have separate permissions. Successful STS identity lookup identifies the caller but does not establish KMS authorization. The post correctly requires testing with the workload's credential source.
- Confirmed the error-path explanation from source: Fulcio supplies a no-op error callback to the KMS crypto.Signer adapter; the AWS adapter's Public method can return nil after public-key retrieval fails. X.509 signing-parameter selection can then reject the key type. This supports the post's conditional diagnosis, rather than a claim that every unsupported-key error is an authorization failure.
- The reviewed AWS client retrieves both public-key material and key metadata and caches them. Consequently, DescribeKey failures and cache refresh timing can also matter. Exact error text, caching behavior, and supported algorithms depend on the deployed Fulcio, Sigstore, and Go versions. The post appropriately calls for recording the deployed image and distinguishes startup from issuance failures.
- Confirmed that aliases can target a different key without changing their names, that a CA certificate must match its signing key, and that successful public-key retrieval does not prove signing access. Direct signing probes must use an appropriate key algorithm and message type.
- CloudTrail is useful for correlation, but not every failed attempt is necessarily present. AWS documents that cross-account access-denied requests are recorded only in the caller account. Missing events alone do not establish that authorization succeeded.
- The linked technical resources resolve to the intended official documentation or source files. No deprecated commands or version-specific assertions requiring correction were found. Links to main branches are mutable and should be compared with the deployed revision during a real incident.
- Validation consisted of documentation and source inspection plus a Bash syntax check. No live AWS calls, staging issuance, artifact verification, or credential-refresh experiment was performed because no deployment or test credentials were supplied. README.md was left unchanged.
