# Enforce AWS Data Residency with SCPs, Region-Deny Policies, and IaC Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, AWS Organizations, Data Residency, Security, Infrastructure as Code

Description: Combine AWS Region restrictions with destination-aware infrastructure checks, service replication controls, and tests of the gaps SCPs do not cover.

---

An AWS Region-deny policy is a useful guardrail, but it is not a complete data residency boundary. Some operations invoked in an approved region affect other regions, global services require special treatment, and application code can send data to an external endpoint.

Use service control policies to restrict API access, infrastructure checks to inspect resource destinations, and service-level controls to constrain replication and exports. Verify each layer against a written list of permitted data locations.

## Understand the SCP Boundary

SCPs set permission limits for principals in affected member accounts; they do not grant permissions. They do not restrict principals in the management account, and they do not affect service-linked roles. Resource policies granting access to principals outside the organization also need separate review. These scope rules are documented in [Service control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html).

Keep application workloads out of the management account and test policies in a dedicated organizational unit before broader attachment. Preserve the organization administrator's ability to recover from an incorrect attachment through a documented management-account procedure.

## Restrict Requested Regions Deliberately

The `aws:RequestedRegion` condition evaluates the endpoint region being called. It does not universally constrain every downstream effect of the request. AWS specifically identifies cross-region S3 replication and bucket creation as examples in its [global condition-key reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion).

This illustrative deny statement denies requests outside two example approved regions and exempts a small reviewed list of global service actions from this particular deny:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictRequestedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "organizations:*",
        "account:*",
        "route53:*",
        "support:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["eu-west-1", "eu-central-1"]
        }
      }
    }
  ]
}
```

This is a starting policy for a test OU, not a universal global-service exception list. Global services not listed can be denied because of their endpoint locations. Exempt actions still require ordinary authorization and other applicable policy evaluation, but this regional deny no longer constrains them.

Review AWS's [Region-deny policy explanation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html) and, for managed landing zones, the maintained [Control Tower Region-deny control](https://docs.aws.amazon.com/controltower/latest/userguide/region-deny.html). An exemption for a global service must trigger a data-flow review of that service, not an assumption that it never stores customer content.

## Inspect Cross-Region Effects Separately

Inventory bucket replication, database global replicas, snapshot copies, backup copy actions, event forwarding, log exports, and identity replication. Evaluate both the source API call and the destination.

For S3 bucket creation, use the appropriate service-specific location conditions rather than treating the request endpoint as the bucket's location. For replication, control who can change configuration, inspect destination resource identities, and constrain the roles and resource policies that perform the transfer.

Existing resources and already enabled replication need an explicit audit. Attaching an SCP does not relocate a backup or remove an old replica. Also review application egress: a process with permission to read local data can attempt to send it outside AWS without calling an AWS control-plane API to create a resource.

## Gate the Rendered Infrastructure

Validate the resolved deployment, including module outputs and provider aliases, instead of searching source files for a forbidden region string. Unknown destinations should require resolution or a documented exception before applying the change.

For CloudFormation, [CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html) can validate structured configuration against rules. Write rules for the actual resource properties used by your stack, including replica lists and backup destinations. Template validation still needs the deployment target region and account because these are not properties on every resource.

A useful policy test matrix is:

| Fixture | Expected result |
| --- | --- |
| Approved deployment and only approved replicas | Pass the region checks |
| Approved primary with an unapproved replica | Reject |
| Destination still unresolved after rendering | Reject or require explicit review |
| Exempt global service carrying customer content | Require service-specific evidence |
| Existing resource modified outside IaC | Detect through configuration monitoring |

Track rule coverage by resource type. A passing rule for one bucket says nothing about an unexamined database or SaaS export.

## Test Enforcement and Record Its Limits

Use a test member account with the intended SCP hierarchy and actual application roles. Confirm approved operations succeed and disallowed regional operations fail. Exercise the reviewed global services, replication changes, restore procedures, and deployment automation to detect unintended outages.

Then verify resource configurations and data destinations independently. A policy denial proves a particular request was blocked; it does not prove that all existing data is inside the boundary.

Keep the allowed-region list, exception owners, service controls, and infrastructure rules under review together. That coordinated evidence is what supports the residency claim as the workload evolves.
