# How to Fix Cloudability Invalid Credentials with AWS Role Template Diffs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IAM, FinOps, Cost Management

Description: Diagnose Cloudability AWS credential failures by comparing the current role, trust policy, and permissions with a freshly generated account-specific template.

A Cloudability credential failure does not tell you whether the integration cannot assume its AWS role, cannot read the billing export, or lacks a permission required by an enabled feature. Adding broad permissions before identifying that distinction makes the integration harder to maintain.

Start with the exact failed check, export the deployed configuration, and compare it with a newly generated template for the same account and feature selections. The output should be a small, explainable configuration change.

## Capture the failing account and capability

Record the AWS account ID, role name, failed permission, verification time, and any request ID shown in the credential details. Also record whether the account is the payer or a linked account. A linked-account failure and a billing-bucket failure have different consequences.

Do not assume the role is named `CloudabilityRole`. IBM documents failures caused by a missing role, a custom role name, and an external ID that differs between the AWS trust relationship and Cloudability. Compare the configured ARN and external ID before investigating service permissions. [IBM's external ID troubleshooting guide](https://www.ibm.com/support/pages/troubleshooting-aws-external-id-mismatch-aws-vendor-credentials-cloudability-integration)

For example, classify the evidence this way:

| Evidence | First comparison |
| --- | --- |
| `sts:AssumeRole` denied | Role identity, trusted principal, external ID conditions |
| Billing files cannot be read | Bucket, object prefix, role policies, resource policies |
| Cost data exists but an advanced check fails | Permissions for that specific capability |
| Template appears correct but calls remain denied | Boundaries, organizational policies, explicit denies |

Keep the raw error. A summary such as “AWS credentials broken” discards the service and resource information needed for diagnosis.

## Download the template for this configuration

In Cloudability, edit the existing AWS billing-account credential and download its current template. Preserve the feature selections and account identifiers you intend to support. IBM's documented update workflow regenerates the CloudFormation template, updates the existing stack, and re-verifies the account. [AWS connection FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=guide-frequently-asked-questions-connecting-aws)

Save the new file as `expected-template.json`. Keep the previous template and the deployed stack's parameters beside it. A template generated for another organization can contain different trust information even when the action lists look identical.

“Latest” is therefore not a universal JSON file copied from a blog. It means the current template generated for your connection and the capabilities you selected.

## Export the actual IAM role

Use an AWS CLI profile with read access to the target account. Substitute the profile and role names:

```bash
aws --profile billing-audit iam get-role \
  --role-name CloudabilityRole \
  --output json > actual-role.json

aws --profile billing-audit iam list-role-policies \
  --role-name CloudabilityRole \
  --output json > inline-policy-names.json

aws --profile billing-audit iam list-attached-role-policies \
  --role-name CloudabilityRole \
  --output json > attached-policy-names.json
```

`get-role` exposes the trust policy and any permissions boundary. It does not return the contents of every permissions policy. For each inline policy, retrieve its document:

```bash
aws --profile billing-audit iam get-role-policy \
  --role-name CloudabilityRole \
  --policy-name ExampleInlinePolicy \
  --query PolicyDocument \
  --output json > actual-inline-policy.json
```

For an attached managed policy, get its default version using `iam get-policy`, then retrieve that version with `iam get-policy-version`. Compare the default version actually attached to the role, not an inactive version. [AWS get-role reference](https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html), [get-role-policy reference](https://docs.aws.amazon.com/cli/latest/reference/iam/get-role-policy.html), [get-policy-version reference](https://docs.aws.amazon.com/cli/latest/reference/iam/get-policy-version.html)

## Compare documents without losing policy meaning

Extract the relevant `PolicyDocument` from the generated template into `expected-policy.json`. Resolve template parameters and intrinsic functions for the target account first. An unresolved `Fn::Sub` object and a deployed ARN can differ textually while describing the same resource.

Canonical JSON helps expose meaningful changes:

```bash
python3 -m json.tool --sort-keys expected-policy.json > expected.sorted.json
python3 -m json.tool --sort-keys actual-inline-policy.json > actual.sorted.json
diff -u actual.sorted.json expected.sorted.json
```

This is a structural review aid, not an IAM authorization simulator. Sorting object keys does not normalize statement order, scalar-versus-array forms, wildcards, or equivalent conditions. A `diff` exit code of 1 means differences were found.

Review each statement as a unit:

- **Effect:** Is there an explicit deny?
- **Action:** Is the failed API operation covered?
- **Resource:** Does the statement cover the actual bucket, object, or other resource?
- **Condition:** Does the request satisfy every required condition?

Compare the trust document separately. Do not combine every action into one set and declare success: an allowed action against the wrong resource does not grant useful access.

## Explain remaining denials before changing anything else

An attached allow does not settle the entire authorization decision. AWS evaluates multiple policy types, and explicit denies can override allows. Permissions boundaries and applicable organizational controls can constrain the role. [AWS policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

If the template and role agree, inspect the denied request's resource and context. For a billing object, inspect the bucket policy and the export's encryption configuration. The current IBM AWS FAQ documents support for SSE-S3 and says KMS and customer-provided encryption keys are unsupported for this integration. An unsupported encryption setup needs a supported export design; adding key permissions alone does not establish compatibility. For a region-specific failure, compare the attempted region with organizational restrictions. A successful command using your administrator profile proves your access, not Cloudability's access.

Apply the reviewed change through the system that owns the role, such as its existing CloudFormation stack. Preserve the before-and-after policy documents and update result. Then re-verify in Cloudability and confirm that the previously failing capability actually recovers.

Close the incident with the missing permission or trust mismatch, its cause, and the configuration change that fixed it. That evidence makes the next template update a routine review instead of another round of permission guessing.
