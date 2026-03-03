# How to Migrate from Manual Checks to Sentinel Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Governance, HashiCorp, DevOps, Compliance

Description: Learn how to replace manual infrastructure review checklists with automated HashiCorp Sentinel policies that enforce standards at every Terraform run.

---

If your team still relies on spreadsheets, wiki pages, or verbal agreements to review Terraform changes before they go live, you already know the pain. Someone forgets a rule. A reviewer is on vacation. A critical security setting slips through. Manual checks do not scale, and they certainly do not keep pace with the speed of modern infrastructure deployments.

HashiCorp Sentinel gives you a way to encode those manual checks into automated policies that run on every single Terraform plan. This post walks through a practical migration path - from identifying what you check manually today, to writing and testing Sentinel policies that replace those checks entirely.

## Why Manual Checks Break Down

Manual infrastructure reviews typically follow a pattern like this: someone opens a pull request with Terraform changes, a senior engineer reviews the plan output, and they mentally run through a checklist. Does the instance type meet our standards? Are the tags correct? Is encryption enabled on storage resources?

This process has several failure modes. Reviewers get fatigued. The checklist lives in someone's head or in a document that falls out of date. New team members do not know all the rules. And when you are deploying multiple times per day across several teams, the bottleneck becomes the reviewer, not the code.

Sentinel removes the human from the loop for repeatable, well-defined checks. The human reviewer can then focus on architecture decisions and business logic instead of verifying that every S3 bucket has encryption turned on.

## Step 1: Audit Your Current Manual Checks

Before writing any Sentinel code, you need to document what you actually check today. Sit down with your team and list every rule that gets verified during a Terraform review. Common examples include:

- All resources must have specific tags (environment, owner, cost-center)
- EC2 instances must use approved AMIs
- Security groups must not allow 0.0.0.0/0 on port 22
- S3 buckets must have encryption and versioning enabled
- RDS instances must not be publicly accessible
- Resources must be deployed in approved regions

Write these down in a structured format. For each rule, note whether it is a hard requirement (must block deployment) or a soft recommendation (should warn but allow).

## Step 2: Categorize and Prioritize

Not every manual check should become a Sentinel policy on day one. Categorize your rules into tiers:

**Tier 1 - Security critical:** Rules that prevent data breaches or compliance violations. These become hard-mandatory policies that block applies.

**Tier 2 - Operational standards:** Rules that enforce consistency like naming conventions and tagging. These start as soft-mandatory (advisory) policies and graduate to hard-mandatory over time.

**Tier 3 - Best practices:** Recommendations that improve quality but are not strict requirements. These stay as advisory policies.

## Step 3: Write Your First Sentinel Policy

Let us start with a common manual check - ensuring all AWS resources have required tags. Here is the Sentinel policy:

```python
# require-tags.sentinel
# Enforce that all taggable resources have required tags

import "tfplan/v2" as tfplan

# Define the tags every resource must have
required_tags = ["environment", "owner", "cost-center"]

# Get all resources that support tags
allResources = filter tfplan.resource_changes as _, rc {
    rc.mode is "managed" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check each resource for required tags
violations = []
for allResources as address, rc {
    resource_tags = rc.change.after.tags else {}
    for required_tags as tag {
        if resource_tags is null or not (resource_tags contains tag) {
            append(violations, address + " is missing tag: " + tag)
        }
    }
}

# Policy result
main = rule {
    length(violations) is 0
}
```

Compare this to the manual version: instead of a reviewer eyeballing every resource in a plan output, this runs automatically and catches every single missing tag.

## Step 4: Set Up the Policy in Terraform Cloud or Enterprise

Sentinel policies live in policy sets. Create a repository structure for your policies:

```text
sentinel-policies/
    require-tags.sentinel
    restrict-instance-types.sentinel
    enforce-encryption.sentinel
    sentinel.hcl
    test/
        require-tags/
            pass.hcl
            fail.hcl
```

The `sentinel.hcl` file maps policies to enforcement levels:

```hcl
# sentinel.hcl
# Configuration for all Sentinel policies in this set

policy "require-tags" {
    source            = "./require-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-instance-types" {
    source            = "./restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "enforce-encryption" {
    source            = "./enforce-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}
```

In Terraform Cloud, go to Settings, then Policy Sets, and connect this repository. Choose which workspaces the policies apply to - you can start with a single test workspace before rolling out broadly.

## Step 5: Write Tests Before Enforcing

Sentinel has a built-in testing framework. For each policy, write passing and failing test cases:

```hcl
# test/require-tags/pass.hcl
# Test case where all required tags are present

mock "tfplan/v2" {
    module {
        source = "testdata/require-tags-pass.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

```hcl
# test/require-tags/fail.hcl
# Test case where tags are missing - policy should fail

mock "tfplan/v2" {
    module {
        source = "testdata/require-tags-fail.sentinel"
    }
}

test {
    rules = {
        main = false
    }
}
```

Run tests locally with the Sentinel CLI:

```bash
# Run all tests in the current directory
sentinel test

# Run tests for a specific policy with verbose output
sentinel test -run require-tags -verbose
```

## Step 6: Roll Out Gradually

Here is the migration timeline that works well in practice:

**Week 1-2:** Deploy all policies as advisory (soft-mandatory). They run and report results but do not block anything. This lets you catch false positives without disrupting deployments.

**Week 3-4:** Review the advisory results. Fix any false positives in your policies. Communicate the upcoming enforcement to your team.

**Week 5:** Promote Tier 1 (security) policies to hard-mandatory. These now block non-compliant changes.

**Week 6-8:** Promote Tier 2 (operational) policies to hard-mandatory as teams adjust their Terraform code.

## Step 7: Retire the Manual Checklist

Once your Sentinel policies are enforcing the same rules your reviewers checked manually, update your review process. Remove the automated checks from the human review checklist and document that Sentinel now handles them. Your review checklist should shrink significantly.

Update your team documentation to explain:

- Which policies exist and what they enforce
- How to check policy results in Terraform Cloud
- How to request exceptions or policy changes
- Where the policy source code lives

## Handling Edge Cases and Exceptions

Manual checks often had informal exception processes - someone says "this is fine, ship it" in a Slack message. With Sentinel, you need a formal approach.

For soft-mandatory policies, designated users can override failures in the Terraform Cloud UI. For hard-mandatory policies, the only option is to fix the code or update the policy.

Create a process for policy exception requests. Use your policy repository's pull request workflow - if someone needs a new exception, they propose a policy change that gets reviewed and approved.

## Measuring Success

Track these metrics to demonstrate the value of migration:

- Number of policy violations caught per week (this shows what manual reviewers would have had to catch)
- Time from PR to deployment (this should decrease as automated checks replace waiting for human reviewers)
- Number of compliance findings in audits (this should decrease over time)

## Common Pitfalls to Avoid

Do not try to automate everything at once. Start with five to ten high-value policies and expand from there. Writing too many policies too quickly leads to frustration when teams cannot deploy anything.

Do not skip the advisory period. Running policies in advisory mode first catches the edge cases you did not think of and gives teams time to fix existing non-compliant resources.

Do not forget to maintain policies. Just like application code, Sentinel policies need updates when cloud providers add new resource types or your organization's standards change.

## Conclusion

Migrating from manual checks to Sentinel policies is not just about automation - it is about consistency and confidence. Every Terraform change gets the same thorough review, every time, without depending on a specific person being available. Start with your highest-value checks, roll out gradually, and iterate. Your team will wonder how they ever managed without it.

For more on writing Sentinel policies, check out our guide on [creating Terraform Sentinel policies](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-functions-and-modules/view).
