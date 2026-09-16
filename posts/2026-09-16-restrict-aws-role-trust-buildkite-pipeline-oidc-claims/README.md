# How to Restrict AWS Role Trust to Specific Buildkite Pipelines with OIDC Claims

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, AWS, OIDC, Security, CI/CD

Description: Constrain AWS web-identity role trust to a Buildkite organization, pipeline, branch, and step using audience and subject claims.

---

Adding Buildkite as an AWS OIDC provider establishes who can issue identity tokens. It does not, by itself, say which Buildkite pipeline may assume a role. That boundary belongs in the role's trust policy.

Match the token's audience and subject narrowly, then grant only the AWS actions the job needs through the role's permissions policy. Keep those two policy responsibilities separate.

## Identify the issuer and audience

Buildkite issues job tokens from `https://agent.buildkite.com`. For AWS STS, configure the IAM OIDC provider with the audience `sts.amazonaws.com` and request tokens for that same audience.

The issuer identifies Buildkite's signing authority. The audience identifies the intended recipient. Neither distinguishes your deployment pipeline from another pipeline on its own.

Buildkite's [AWS OIDC guide](https://buildkite.com/docs/pipelines/security/oidc/aws) documents the provider setup and the subject structure used in trust conditions. Inspect the currently documented claims before designing a policy around a field that AWS may not expose directly as a condition key.

## Restrict the subject

For an example organization `acme`, pipeline `service-release`, main branch, and command step key `deploy`, a trust policy can be:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/agent.buildkite.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "agent.buildkite.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "agent.buildkite.com:sub": "organization:acme:pipeline:service-release:ref:refs/heads/main:commit:*:step:deploy"
        }
      }
    }
  ]
}
```

Replace the account ID, organization, pipeline, ref, and step key. The wildcard permits different commits while retaining the surrounding identity fields. Do not broaden the pipeline or ref to `*` simply to make an initial test pass.

This example does not request AWS session tags, so it does not grant `sts:TagSession`. If you intentionally add signed claims as session tags, update both the token request and trust policy according to the documented mechanism.

## Give the step a stable key

The command that requests the token must have the key named in the policy:

```yaml
steps:
  - label: "Verify deployment role"
    key: deploy
    command: "aws sts get-caller-identity"
    plugins:
      - aws-assume-role-with-web-identity#v1.7.0:
          role-arn: "arn:aws:iam::123456789012:role/service-deploy"
```

This uses a harmless identity command before introducing deployment actions. The [official web-identity plugin](https://github.com/buildkite-plugins/aws-assume-role-with-web-identity-buildkite-plugin) requests the token and exchanges it for temporary AWS credentials.

A step label is display text; it is not the `step` field in this subject contract. A missing or changed key can make a previously working policy fail. Keep the key stable in reviewed pipeline configuration.

## Separate trust from permissions

The trust policy answers whether the job can become the role. The role's identity policy answers what it can do afterward. Grant access only to the intended service resources and operations, such as one deployment target or artifact repository.

If `AssumeRoleWithWebIdentity` fails, inspect provider, audience, subject, and any session-tag conditions. If assumption succeeds but an AWS API call fails, inspect the role policy, resource policy, permissions boundary, and other applicable controls.

AWS's [OIDC role documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html) explains the trust relationship. Adding broad service permissions does not repair an audience mismatch, and broadening trust does not solve a denied resource operation.

## Treat claims as part of a larger boundary

A narrow subject is valuable, but it does not make untrusted pipeline code safe. A job able to modify the release pipeline, select its protected context, or execute under the trusted step can request the same credentials.

Keep release configuration protected, restrict who can create or alter privileged builds, and gate fork code before it executes. Use separate clusters or queues with enforced access boundaries when appropriate. A branch string alone is not a substitute for controlling which source code is allowed to run in that context.

For additional stable organization identity, Buildkite supports including claims such as `organization_id` as AWS session tags. Request those tags explicitly and require their expected values if you adopt that pattern. Do not invent condition keys such as `agent.buildkite.com:pipeline_slug` without verifying AWS supports that claim mapping.

The [agent OIDC reference](https://buildkite.com/docs/agent/cli/reference/oidc) documents token requests and available claims. Avoid printing the token while debugging; inspect nonsecret identity fields through controlled tooling and CloudTrail records.

## Test the denied cases

Verify the intended main-branch deployment step can assume the role. Then test a different pipeline, another step key, a feature branch, and a token with the wrong audience. Each should fail the trust policy.

Use staging resources for these checks and compare the expected subject with the failed assumption evidence. Also verify the successful role cannot access an unrelated resource.

The resulting policy should be explainable as a precise contract: this Buildkite pipeline and step, in this approved ref context, may request this narrowly permissioned AWS role.
