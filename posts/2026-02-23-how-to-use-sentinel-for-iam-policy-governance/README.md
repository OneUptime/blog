# How to Use Sentinel for IAM Policy Governance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, IAM, Security, Policy as Code, AWS, Governance, Least Privilege

Description: Enforce IAM best practices and least-privilege access automatically using Sentinel policies that validate Terraform IAM resources before deployment.

---

IAM misconfigurations are consistently among the top causes of cloud security breaches. An overly permissive IAM policy, a role with wildcard permissions, or a user with direct admin access can give attackers the keys to your entire cloud environment. The problem is that IAM policies are complex, and reviewing them manually requires deep expertise that not every team member has.

Sentinel lets you codify your IAM governance rules into automated checks. Every IAM role, policy, or user created through Terraform gets validated against your organization's standards before it reaches your cloud account. This post covers the practical Sentinel policies you need to enforce IAM best practices.

## The IAM Security Rules Worth Enforcing

Before writing policies, define what good IAM hygiene looks like for your organization. These are the most commonly enforced rules:

- No IAM policies with wildcard (*) actions on wildcard (*) resources
- No inline IAM policies (use managed policies instead)
- IAM roles must have a maximum session duration
- No IAM users with console access (use SSO instead)
- IAM policies must not allow iam:PassRole with wildcard resources
- Service roles must follow the naming convention
- No IAM access keys for root or admin users

## Policy 1: Block Wildcard IAM Permissions

The most dangerous IAM pattern is `"Action": "*"` on `"Resource": "*"`. This grants full administrative access and should never appear in your Terraform code:

```python
# deny-wildcard-iam.sentinel
# Block IAM policies that grant wildcard actions on wildcard resources

import "tfplan/v2" as tfplan
import "json"

# Get all IAM policy resources
iam_policies = filter tfplan.resource_changes as _, rc {
    rc.type in ["aws_iam_policy", "aws_iam_role_policy", "aws_iam_user_policy", "aws_iam_group_policy"] and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Parse and check each policy document
violations = []
for iam_policies as address, resource {
    policy_doc = resource.change.after.policy else ""

    if policy_doc is not "" {
        # Parse the JSON policy document
        doc = json.unmarshal(policy_doc)
        statements = doc["Statement"] else []

        for statements as statement {
            effect = statement["Effect"] else "Deny"
            actions = statement["Action"] else []
            resources = statement["Resource"] else []

            # Normalize to lists
            if types.type_of(actions) is "string" {
                actions = [actions]
            }
            if types.type_of(resources) is "string" {
                resources = [resources]
            }

            # Check for wildcard action + wildcard resource
            if effect is "Allow" {
                has_wildcard_action = false
                has_wildcard_resource = false

                for actions as action {
                    if action is "*" {
                        has_wildcard_action = true
                    }
                }

                for resources as res {
                    if res is "*" {
                        has_wildcard_resource = true
                    }
                }

                if has_wildcard_action and has_wildcard_resource {
                    append(violations, address +
                        " grants Action:* on Resource:*")
                }
            }
        }
    }
}

if length(violations) > 0 {
    print("Wildcard IAM permission violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 2: Restrict Dangerous IAM Actions

Some IAM actions are particularly dangerous because they enable privilege escalation. Block these unless explicitly approved:

```python
# restrict-dangerous-iam-actions.sentinel
# Block IAM policies that contain privilege escalation vectors

import "tfplan/v2" as tfplan
import "json"

# Actions that enable privilege escalation
dangerous_actions = [
    "iam:CreateUser",
    "iam:CreateLoginProfile",
    "iam:UpdateLoginProfile",
    "iam:AttachUserPolicy",
    "iam:AttachGroupPolicy",
    "iam:AttachRolePolicy",
    "iam:PutUserPolicy",
    "iam:PutGroupPolicy",
    "iam:PutRolePolicy",
    "iam:CreateAccessKey",
    "iam:UpdateAssumeRolePolicy",
    "sts:AssumeRole",
]

# Get all IAM policy resources
iam_policies = filter tfplan.resource_changes as _, rc {
    rc.type in ["aws_iam_policy", "aws_iam_role_policy",
                "aws_iam_user_policy", "aws_iam_group_policy"] and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for iam_policies as address, resource {
    policy_doc = resource.change.after.policy else ""

    if policy_doc is not "" {
        doc = json.unmarshal(policy_doc)
        statements = doc["Statement"] else []

        for statements as statement {
            effect = statement["Effect"] else "Deny"
            actions = statement["Action"] else []

            if types.type_of(actions) is "string" {
                actions = [actions]
            }

            if effect is "Allow" {
                for actions as action {
                    if action in dangerous_actions {
                        append(violations, address +
                            " contains dangerous action: " + action)
                    }
                }
            }
        }
    }
}

if length(violations) > 0 {
    print("Dangerous IAM action violations:")
    for violations as v {
        print("  - " + v)
    }
    print("")
    print("These actions require security team approval.")
}

main = rule {
    length(violations) is 0
}
```

## Policy 3: Enforce No Inline Policies

Inline policies are harder to audit and manage than managed policies. Enforce that all teams use managed policies attached to roles:

```python
# deny-inline-policies.sentinel
# Block inline IAM policies - require managed policies instead

import "tfplan/v2" as tfplan

# Inline policy resource types
inline_policy_types = [
    "aws_iam_role_policy",
    "aws_iam_user_policy",
    "aws_iam_group_policy",
]

# Find any inline policies being created
inline_policies = filter tfplan.resource_changes as _, rc {
    rc.type in inline_policy_types and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for inline_policies as address, _ {
    append(violations, address +
        " - use aws_iam_policy with aws_iam_role_policy_attachment instead")
}

if length(violations) > 0 {
    print("Inline IAM policy violations:")
    print("Organization policy requires managed policies.")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 4: Enforce IAM Role Naming Conventions

Consistent naming makes it easy to identify what a role does and who owns it during incident response:

```python
# enforce-iam-naming.sentinel
# Enforce naming conventions for IAM roles

import "tfplan/v2" as tfplan
import "strings"

# Pattern: {team}-{service}-{environment}-role
# Examples: platform-api-prod-role, data-etl-staging-role

valid_teams = ["platform", "data", "security", "devops", "frontend", "backend"]
valid_environments = ["dev", "staging", "prod", "shared"]

iam_roles = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_iam_role" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for iam_roles as address, role {
    name = role.change.after.name else ""
    parts = strings.split(name, "-")

    if length(parts) < 4 {
        append(violations, address +
            " - name '" + name + "' does not match pattern: {team}-{service}-{env}-role")
    } else {
        team = parts[0]
        env = parts[length(parts) - 2]
        suffix = parts[length(parts) - 1]

        if not (team in valid_teams) {
            append(violations, address +
                " - team prefix '" + team + "' is not recognized")
        }
        if not (env in valid_environments) {
            append(violations, address +
                " - environment '" + env + "' is not valid")
        }
        if suffix is not "role" {
            append(violations, address +
                " - name must end with '-role'")
        }
    }
}

if length(violations) > 0 {
    print("IAM role naming violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 5: Block IAM User Creation

In organizations using SSO (which you should be), there is rarely a need to create IAM users. This policy blocks IAM user creation:

```python
# deny-iam-users.sentinel
# Block creation of IAM users - enforce SSO usage

import "tfplan/v2" as tfplan

iam_users = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_iam_user" and
    rc.mode is "managed" and
    rc.change.actions contains "create"
}

# Also block IAM access keys
iam_access_keys = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_iam_access_key" and
    rc.mode is "managed" and
    rc.change.actions contains "create"
}

violations = []

for iam_users as address, _ {
    append(violations, address +
        " - IAM users are not allowed. Use AWS SSO instead.")
}

for iam_access_keys as address, _ {
    append(violations, address +
        " - IAM access keys are not allowed. Use role-based access.")
}

if length(violations) > 0 {
    print("IAM user/access key violations:")
    for violations as v {
        print("  - " + v)
    }
    print("")
    print("Contact the security team if you need an exception.")
}

main = rule {
    length(violations) is 0
}
```

## Policy 6: Enforce Maximum Session Duration

Long-lived sessions increase the blast radius if credentials are compromised. Enforce a maximum session duration:

```python
# enforce-session-duration.sentinel
# Enforce maximum session duration for IAM roles

import "tfplan/v2" as tfplan

# Maximum session duration in seconds (4 hours)
max_session_duration = 14400

iam_roles = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_iam_role" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for iam_roles as address, role {
    # Default session duration is 3600 (1 hour) if not specified
    session_duration = role.change.after.max_session_duration else 3600

    if session_duration > max_session_duration {
        append(violations, address +
            " - max_session_duration is " + string(session_duration) +
            "s, maximum allowed is " + string(max_session_duration) + "s")
    }
}

if length(violations) > 0 {
    print("Session duration violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Putting It All Together

Create a dedicated IAM policy set in your sentinel.hcl:

```hcl
# sentinel.hcl - IAM Governance Policy Set

policy "deny-wildcard-iam" {
    source            = "./deny-wildcard-iam.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-dangerous-iam-actions" {
    source            = "./restrict-dangerous-iam-actions.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "deny-inline-policies" {
    source            = "./deny-inline-policies.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "enforce-iam-naming" {
    source            = "./enforce-iam-naming.sentinel"
    enforcement_level = "advisory"
}

policy "deny-iam-users" {
    source            = "./deny-iam-users.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "enforce-session-duration" {
    source            = "./enforce-session-duration.sentinel"
    enforcement_level = "hard-mandatory"
}
```

Notice the enforcement levels. Wildcard permissions and IAM user creation are hard-mandatory because they represent severe security risks. Inline policies and dangerous actions are soft-mandatory to allow for exceptions during migration. Naming conventions start as advisory.

## Conclusion

IAM governance through Sentinel policies gives your security team confidence that every IAM change follows organizational standards. The policies in this post cover the most common attack vectors - wildcard permissions, privilege escalation, and uncontrolled user creation. Start with the hard-mandatory policies that prevent the biggest risks, add advisory policies for best practices, and promote them to mandatory as your teams adapt.

For related policies, see our guide on [using Sentinel for database security](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-for-database-security-policies/view).
