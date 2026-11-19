# How to Diagnose Fulcio Unsupported-Key Errors After AWS KMS Access Is Lost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, AWS KMS, Security, Troubleshooting

Description: Trace misleading Fulcio unsupported-key failures through the AWS workload identity, KMS public-key access, signing permissions, and the configured CA certificate chain.

An unsupported-key error can look like a cryptographic algorithm problem even when the operational change was a lost AWS credential or permission. Do not replace a working CA key just because that phrase appears at the end of a nested failure. Establish which operation failed and which identity performed it.

Fulcio's [KMS backend](https://github.com/sigstore/fulcio/blob/main/pkg/ca/kmsca/kmsca.go) adapts a remote signer into certificate issuance. The [base CA implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/baseca/baseca.go) passes the signer into X.509 certificate creation. Errors can therefore cross several abstraction layers before they reach the client. The exact error wrapping depends on the Fulcio and Sigstore library versions.

## Preserve the first useful error

Record the Fulcio image digest, configured KMS resource, AWS region, time of the first failure, and last successful issuance. Keep the complete causal error chain from server logs, with tokens and credentials removed. Distinguish startup failure from a process that starts normally and fails when signing.

Ask what changed immediately beforehand: service account, IAM role, key policy, network endpoint policy, credential source, region, or KMS alias target. A steady key identifier with a changed authorization boundary is a stronger lead than an unsupported algorithm hypothesis.

Do not assume every unsupported-key message hides an access problem. A real mismatch between supported key type, signing algorithm, and certificate chain is also possible. The next checks separate these possibilities.

## Test the workload's AWS identity

Run diagnostics in an authorized environment that uses the same credential source as Fulcio. A successful command under your administrator profile does not test the pod's role.

```bash
aws sts get-caller-identity
aws kms describe-key \
  --region eu-west-1 \
  --key-id alias/fulcio-intermediate
aws kms get-public-key \
  --region eu-west-1 \
  --key-id alias/fulcio-intermediate \
  --query '{KeyId:KeyId,KeySpec:KeySpec,KeyUsage:KeyUsage,SigningAlgorithms:SigningAlgorithms}'
```

The region and alias are examples. Substitute the exact resource from the deployment and record the returned full key ARN. If an alias was repointed, the name may be unchanged while the underlying key no longer matches the CA certificate.

AWS documents that [GetPublicKey](https://docs.aws.amazon.com/kms/latest/APIReference/API_GetPublicKey.html) requires its own permission and returns key metadata as well as the public key. Downloading public material is an authorized API operation even though the key is public. A caller can lose that permission independently of other KMS capabilities.

## Separate retrieval from signing

Successful public-key retrieval does not establish that signing works. The [KMS Sign API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html) has separate authorization and requires a suitable asymmetric signing key and supported algorithm.

Use a staging issuance request through Fulcio to exercise the real signing path. If your operational procedure includes a direct KMS signing probe, use the returned supported algorithm and an explicitly defined message-versus-digest input. Do not copy an arbitrary algorithm from another key or use production data as a test message.

Correlate the failure time with AWS audit records for the expected principal and key. Look for denied `GetPublicKey` or `Sign` calls, wrong-region requests, disabled key state, or a changed endpoint policy. A network timeout and an authorization denial need different repairs even if the outer Fulcio error is similar.

| Observation | Next investigation |
|---|---|
| Wrong caller ARN | Workload credential source and role association |
| Public-key retrieval denied | IAM, key policy, grants, and endpoint policy |
| Retrieval succeeds, signing denied | Signing authorization and key state |
| Both work, issuance still fails | Key/chain match, algorithm support, and deeper server error |

## Compare the CA certificate with KMS

The configured CA certificate must certify the public key held by KMS. Fulcio's [certificate-maker documentation](https://github.com/sigstore/fulcio/blob/main/docs/certificate-maker.md) includes this key-match troubleshooting step. Compare normalized public keys rather than certificate subjects or alias names.

If the key genuinely changed, treat that as a CA rotation with the appropriate trust-distribution work. If authorization changed, restore the intended narrowly scoped permission and retain the original key. Generating a replacement key is not a remedy for a lost workload credential.

After repair, repeat public-key retrieval under the workload identity, issue a staging certificate, and verify an artifact signed through the recovered path. Observe more than one request and include a credential refresh boundary when temporary credentials were involved. That distinguishes a durable fix from a short-lived cached credential that merely postponed the next failure.
