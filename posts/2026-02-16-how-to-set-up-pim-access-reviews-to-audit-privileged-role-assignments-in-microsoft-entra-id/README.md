# How to Set Up PIM Access Reviews to Audit Privileged Role Assignments in Microsoft Entra ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Entra, PIM, Access Reviews, Privileged Access, Identity Governance, Security

Description: A complete guide to creating and managing PIM access reviews in Microsoft Entra ID to periodically audit privileged role assignments and remove unnecessary access.

---

Privileged Identity Management (PIM) in Microsoft Entra ID lets you manage just-in-time access to elevated roles. But even with PIM, role assignments accumulate over time. Someone who needed Global Administrator access for a migration project three months ago might still have an eligible assignment. Access reviews solve this by requiring periodic attestation that each role assignment is still needed.

In this post, I will cover how to set up access reviews for PIM role assignments, configure review settings for different scenarios, and handle the results.

## Why Access Reviews for Privileged Roles

The principle of least privilege says users should have only the access they need, for only as long as they need it. PIM helps with the "for only as long as they need it" part through time-limited active assignments and just-in-time activation. Access reviews address the accumulation problem - even eligible assignments should be reviewed periodically.

Common findings from access reviews:

- Employees who changed teams but still have roles from their old position
- Contractors whose projects ended but whose role assignments remain
- Service accounts with role assignments that nobody remembers setting up
- Eligible assignments for roles that were never actually activated

## Prerequisites

- Microsoft Entra ID P2 license
- Privileged Role Administrator or Global Administrator role
- PIM enabled in your tenant (it is enabled by default)

## Step 1: Plan Your Review Strategy

Before creating reviews, decide on your review strategy:

**Review frequency:** How often should reviewers verify each assignment?
- Critical roles (Global Admin, Security Admin): Monthly or quarterly
- High-privilege roles (Exchange Admin, SharePoint Admin): Quarterly or semi-annually
- Lower-privilege roles (Helpdesk Admin, Reports Reader): Semi-annually or annually

**Reviewers:** Who should review the assignments?
- **Self-review:** The assigned user reviews their own assignment. Simple but less rigorous.
- **Manager review:** The user's manager reviews. Good for employee role assignments.
- **Specific reviewers:** Named individuals (like the security team). Best for critical roles.
- **Resource owners:** The owner of the resource being accessed.

**Auto-apply:** Should review results be applied automatically?
- For critical roles, require manual approval after review
- For less sensitive roles, auto-apply is acceptable

## Step 2: Create an Access Review for Entra ID Roles

Go to the Microsoft Entra admin center. Navigate to Identity Governance, then Access Reviews. Click "New access review."

**Review type:** Select "Privileged Identity Management - Azure AD roles" (or "Entra ID roles" depending on your portal version).

**Scope:**

Select the role to review. You can review one role at a time or create multiple reviews for different roles.

For the Global Administrator role, configure:

- **Role:** Global Administrator
- **Assignment type:** Select "Eligible" to review eligible assignments, "Active" to review permanent active assignments, or both. Reviewing eligible assignments is important because eligible users can self-activate to the role.

Using Microsoft Graph PowerShell:

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "AccessReview.ReadWrite.All"

# Create an access review for Global Administrator eligible assignments
$reviewParams = @{
    DisplayName = "Global Administrator - Quarterly Review"
    DescriptionForAdmins = "Review all eligible Global Administrator assignments quarterly"
    DescriptionForReviewers = "Please verify that this user still needs Global Administrator access. If not, deny the review."
    Scope = @{
        "@odata.type" = "#microsoft.graph.accessReviewQueryScope"
        # Query for eligible role assignments to Global Administrator
        Query = "/roleManagement/directory/roleAssignmentScheduleInstances?`$filter=roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'"
        QueryType = "MicrosoftGraph"
        QueryRoot = $null
    }
    Reviewers = @(
        @{
            Query = "/users/security-admin-user-id"
            QueryType = "MicrosoftGraph"
        }
    )
    Settings = @{
        MailNotificationsEnabled = $true
        ReminderNotificationsEnabled = $true
        JustificationRequiredOnApproval = $true
        # Auto-apply results after review period ends
        AutoApplyDecisionsEnabled = $false
        # Remove access if reviewer does not respond
        DefaultDecisionEnabled = $true
        DefaultDecision = "Deny"
        # Review recurrence settings
        Recurrence = @{
            Pattern = @{
                Type = "absoluteMonthly"
                Interval = 3
            }
            Range = @{
                Type = "noEnd"
                StartDate = "2026-03-01"
            }
        }
        # Review period: 14 days to complete
        InstanceDurationInDays = 14
    }
}

$review = New-MgIdentityGovernanceAccessReviewDefinition -BodyParameter $reviewParams
Write-Output "Access review created: $($review.Id)"
```

## Step 3: Configure Review Settings

The settings determine how the review process works:

**Duration:** How many days reviewers have to complete the review. 14 days is typical - long enough for people to respond, short enough to keep urgency.

**Recurrence:** How often the review repeats. Set this to match your review strategy. Options include weekly, monthly, quarterly, semi-annually, and annually.

**Auto-apply:** When enabled, approved assignments stay and denied assignments are automatically removed when the review ends. For critical roles, keep this disabled and manually process results.

**Default decision:** What happens to assignments that are not reviewed (the reviewer did not respond). Options:
- **No change:** The assignment stays as-is
- **Remove access:** The assignment is removed
- **Approve:** The assignment is kept

For privileged roles, "Remove access" is the recommended default. If a reviewer does not bother to review, the access should be removed.

**Justification required:** When enabled, reviewers must provide a reason for their approval or denial. Always enable this for audit trail purposes.

## Step 4: Review Process for Reviewers

When a review starts, reviewers receive an email notification with a link to the access review. Here is what the reviewer does:

1. Click the link in the email (or navigate to myaccess.microsoft.com)
2. See the list of users with the role assignment
3. For each user, decide: **Approve** or **Deny**
4. Provide a justification for each decision
5. Submit the review

The reviewer should check:
- Does this user still need this role?
- When did they last activate the role? (Check PIM audit logs)
- Is there a less-privileged role that would meet their needs?

## Step 5: Process Review Results

After the review period ends, process the results:

```powershell
# Get the access review instances (completed rounds)
$instances = Get-MgIdentityGovernanceAccessReviewDefinitionInstance `
    -AccessReviewScheduleDefinitionId $review.Id

# Get decisions for the most recent instance
$decisions = Get-MgIdentityGovernanceAccessReviewDefinitionInstanceDecision `
    -AccessReviewScheduleDefinitionId $review.Id `
    -AccessReviewInstanceId $instances[0].Id

# Display the results
foreach ($decision in $decisions) {
    $user = $decision.Principal.DisplayName
    $result = $decision.Decision
    $justification = $decision.Justification
    Write-Output "$user : $result - $justification"
}
```

If auto-apply is disabled, you need to manually apply the results:

```powershell
# Apply the review decisions manually
# This removes access for denied assignments
Invoke-MgApplyIdentityGovernanceAccessReviewDefinitionInstanceDecision `
    -AccessReviewScheduleDefinitionId $review.Id `
    -AccessReviewInstanceId $instances[0].Id
```

## Step 6: Create Reviews for Azure Resource Roles

PIM also manages Azure resource roles (like Owner, Contributor on subscriptions and resource groups). Create access reviews for these too:

```powershell
# Create an access review for Azure subscription Owner role
$azureReviewParams = @{
    DisplayName = "Subscription Owner - Semi-Annual Review"
    DescriptionForAdmins = "Review all Owner role assignments on production subscription"
    DescriptionForReviewers = "Verify that this user still needs Owner access to the production subscription."
    Scope = @{
        "@odata.type" = "#microsoft.graph.accessReviewQueryScope"
        # Query for Owner role assignments on a specific subscription
        Query = "/roleManagement/directory/roleAssignmentScheduleInstances?`$filter=directoryScopeId eq '/subscriptions/{sub-id}' and roleDefinitionId eq '{owner-role-id}'"
        QueryType = "MicrosoftGraph"
    }
    Reviewers = @(
        @{
            # Use manager review
            Query = "./manager"
            QueryType = "MicrosoftGraph"
            QueryRoot = "decisions"
        }
    )
    Settings = @{
        MailNotificationsEnabled = $true
        ReminderNotificationsEnabled = $true
        JustificationRequiredOnApproval = $true
        AutoApplyDecisionsEnabled = $true
        DefaultDecisionEnabled = $true
        DefaultDecision = "Deny"
        Recurrence = @{
            Pattern = @{
                Type = "absoluteMonthly"
                Interval = 6
            }
            Range = @{
                Type = "noEnd"
                StartDate = "2026-03-01"
            }
        }
        InstanceDurationInDays = 21
    }
}

New-MgIdentityGovernanceAccessReviewDefinition -BodyParameter $azureReviewParams
```

## Step 7: Monitor Review Progress

Track whether reviewers are completing their reviews on time:

```powershell
# Check the status of active review instances
$activeInstances = Get-MgIdentityGovernanceAccessReviewDefinitionInstance `
    -AccessReviewScheduleDefinitionId $review.Id `
    -Filter "status eq 'InProgress'"

foreach ($instance in $activeInstances) {
    $decisions = Get-MgIdentityGovernanceAccessReviewDefinitionInstanceDecision `
        -AccessReviewScheduleDefinitionId $review.Id `
        -AccessReviewInstanceId $instance.Id

    $total = $decisions.Count
    $reviewed = ($decisions | Where-Object { $_.Decision -ne "NotReviewed" }).Count
    $pending = $total - $reviewed

    Write-Output "Instance: $($instance.StartDateTime) to $($instance.EndDateTime)"
    Write-Output "  Total: $total, Reviewed: $reviewed, Pending: $pending"
}
```

Send reminder emails if reviewers are lagging. The built-in reminder notifications help, but you might want additional nudges for critical reviews.

## Reporting on Review History

For audit purposes, keep track of all review outcomes:

```powershell
# Generate a report of all completed access reviews and their outcomes
$allDefinitions = Get-MgIdentityGovernanceAccessReviewDefinition

foreach ($def in $allDefinitions) {
    Write-Output "Review: $($def.DisplayName)"

    $completedInstances = Get-MgIdentityGovernanceAccessReviewDefinitionInstance `
        -AccessReviewScheduleDefinitionId $def.Id `
        -Filter "status eq 'Completed'"

    foreach ($instance in $completedInstances) {
        $decisions = Get-MgIdentityGovernanceAccessReviewDefinitionInstanceDecision `
            -AccessReviewScheduleDefinitionId $def.Id `
            -AccessReviewInstanceId $instance.Id

        $approved = ($decisions | Where-Object { $_.Decision -eq "Approve" }).Count
        $denied = ($decisions | Where-Object { $_.Decision -eq "Deny" }).Count
        $notReviewed = ($decisions | Where-Object { $_.Decision -eq "NotReviewed" }).Count

        Write-Output "  Period: $($instance.StartDateTime) to $($instance.EndDateTime)"
        Write-Output "  Approved: $approved, Denied: $denied, Not Reviewed: $notReviewed"
    }
}
```

## Best Practices

- Use multi-stage reviews for the most critical roles. The first stage could be self-review, and the second stage could be the security team reviewing the self-review results.
- Set the default decision to "Deny" for privileged roles. If nobody cares enough to review the access, it probably is not needed.
- Always require justification. "Still needed" is not a sufficient justification - require specific reasons.
- Review the review process itself annually. Are the right people reviewing? Is the frequency appropriate?
- Combine access reviews with PIM activation data. If someone has an eligible assignment but has not activated it in 90 days, that is a strong signal it should be removed.
- Document your review strategy in a governance document that maps roles to review frequency, reviewers, and escalation paths.

## Summary

PIM access reviews are a governance mechanism that ensures privileged role assignments stay current and justified. Create reviews for each critical role with appropriate frequency and reviewers, configure auto-apply and default decisions based on the role's sensitivity, and track review completion and outcomes for audit purposes. The combination of PIM's just-in-time activation with periodic access reviews gives you strong control over privileged access in your Entra ID environment.
