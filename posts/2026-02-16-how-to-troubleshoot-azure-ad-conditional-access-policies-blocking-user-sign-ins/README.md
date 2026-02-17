# How to Troubleshoot Azure AD Conditional Access Policies Blocking User Sign-Ins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure AD, Conditional Access, Sign-In, Troubleshooting, Identity, Security

Description: Diagnose and resolve Azure AD Conditional Access policies that unexpectedly block legitimate user sign-ins using sign-in logs and what-if analysis.

---

A user calls the help desk saying they cannot sign in. Another reports they can access their email but not SharePoint. A third says everything worked yesterday but today they get "You cannot access this right now." These are the classic symptoms of Conditional Access policies doing their job a little too enthusiastically.

Conditional Access is powerful, but when policies interact in unexpected ways, they can block legitimate users. This post covers a systematic approach to figuring out which policy is blocking access and how to fix it without weakening your security posture.

## Understanding How Conditional Access Evaluates

Before debugging, you need to understand the evaluation logic. When a user signs in, Azure AD evaluates all Conditional Access policies that apply to the user and the target application. If multiple policies match, their controls are combined:

- If any matching policy blocks access, the sign-in is blocked (block takes priority)
- If multiple policies require controls (like MFA, compliant device, approved app), all required controls must be satisfied
- Policies in "Report-only" mode are evaluated but not enforced

The evaluation happens in this order:

1. Azure AD evaluates the sign-in against all enabled policies
2. For each policy, it checks if the user, application, and conditions match
3. If a policy matches, its grant or session controls are collected
4. The combined controls determine the outcome

## Step 1: Check the Sign-In Logs

The Azure AD sign-in logs tell you exactly which policies were evaluated and what their outcome was.

Navigate to Azure AD > Sign-in logs in the portal, or use the CLI:

```bash
# Get recent failed sign-ins for a specific user
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq 'user@company.com' and status/errorCode ne 0&\$top=10" \
  --headers "Content-Type=application/json"
```

In the portal, find the failed sign-in and click on it. Go to the "Conditional Access" tab. This shows every policy that was evaluated, organized into three categories:

- **Success**: Policy matched and controls were satisfied
- **Failure**: Policy matched and controls were NOT satisfied (this is your blocker)
- **Not applied**: Policy did not match this sign-in

The "Failure" entries are what you are looking for. Click on each one to see which specific control was not satisfied.

## Step 2: Use the What-If Tool

The What-If tool in the Azure portal lets you simulate a sign-in without the user actually trying. This is extremely useful for testing policy changes before deploying them.

Navigate to Azure AD > Security > Conditional Access > Policies > What If.

Fill in the simulation parameters:

- **User**: Select the affected user
- **Cloud apps**: Select the application they are trying to access
- **IP address**: Enter the user's IP (optional)
- **Device platform**: Select if relevant
- **Client app**: Browser, mobile app, etc.
- **Sign-in risk**: Set if Identity Protection is involved

Click "What If" and review the results. It shows which policies would apply and what controls would be required.

## Step 3: Common Blocking Scenarios

### Scenario: MFA Required but User Has Not Registered

A policy requires MFA, but the user has not registered any MFA methods. They get stuck in a loop where they need MFA to sign in but cannot register for MFA without signing in.

**Fix**: Temporarily exclude the user from the MFA policy (or add them to an exclusion group) so they can sign in and register their MFA methods. Then remove the exclusion.

Better long-term fix: Configure the MFA registration policy in Identity Protection to allow users to register from trusted locations without existing MFA.

### Scenario: Device Compliance Required but Device Is Not Enrolled

A policy requires a compliant device, but the user's device is not enrolled in Intune. This commonly happens with personal devices or newly provisioned machines.

**Fix**: Either enroll the device in Intune and wait for compliance evaluation, or create a separate policy for unmanaged devices that provides limited access through browser-only sessions with app-enforced restrictions.

### Scenario: Named Location Blocking

A policy blocks sign-ins from outside trusted locations, but the user is on a VPN or at a remote office whose IP is not in the trusted locations list.

```bash
# List named locations in Conditional Access
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json"
```

**Fix**: Add the VPN or remote office IP range to the trusted locations list.

### Scenario: Legacy Authentication Blocked

A policy blocks legacy authentication, and the user is connecting with an email client that uses IMAP, POP, or basic authentication with SMTP.

**Fix**: Update the email client to use modern authentication (OAuth 2.0). Outlook 2016+ and the Outlook mobile app support modern authentication. If the user is stuck on an old client, they need to upgrade.

### Scenario: Client App Filter Mismatch

A policy targets "Browser" client apps but the user is signing in through a desktop application, or vice versa. The policy might not match when you expect it to, or it might match unexpectedly.

**Fix**: Review the "Client apps" condition in your policies. Be explicit about which client app types each policy targets.

### Scenario: Conflicting Policies

Two policies apply to the same user and application, but one requires MFA and another blocks access under certain conditions. The block takes priority.

**Fix**: Review all policies that apply to the user and application combination. Use the What-If tool to see the combined effect. Consider consolidating overlapping policies.

## Step 4: Check for Emergency Access Account Exclusions

Before making any changes, verify that your emergency access (break-glass) accounts are excluded from all Conditional Access policies. If you accidentally lock out all administrators, these accounts are your safety net.

```bash
# List all Conditional Access policies and their exclusions
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --query "value[].{Name:displayName, State:state, ExcludedUsers:conditions.users.excludeUsers}"
```

## Step 5: Use Report-Only Mode for Testing

Never deploy a new Conditional Access policy directly in "On" mode. Use "Report-only" first.

In report-only mode, the policy is evaluated on every sign-in, but the controls are not enforced. The sign-in logs show what would have happened if the policy were active.

Run a policy in report-only mode for at least a week before switching to "On." Check the sign-in logs for unexpected blocks:

```bash
# Check report-only outcomes in sign-in logs
# Look for entries where a report-only policy would have blocked access
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=conditionalAccessStatus eq 'reportOnlyFailure'&\$top=50" \
  --headers "Content-Type=application/json"
```

## Step 6: Review Conditional Access Insights Workbook

Azure AD provides a Conditional Access Insights workbook in the portal under Azure AD > Security > Conditional Access > Insights and reporting.

This workbook shows:

- How many sign-ins each policy affected
- How many were blocked vs allowed
- Trends over time
- Users most affected by each policy

Use it to identify policies that are blocking more users than expected.

## Step 7: Debugging Token and Session Issues

Conditional Access evaluates at sign-in time and during token refresh. If a user was signed in before a policy was created, they might not be affected until their token refreshes (typically 1 hour for access tokens, up to 90 days for refresh tokens).

To force re-evaluation, you can revoke the user's sessions:

```bash
# Revoke all refresh tokens for a user (forces re-authentication)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/user@company.com/revokeSignInSessions" \
  --headers "Content-Type=application/json"
```

If you have Continuous Access Evaluation (CAE) enabled, critical events like location changes or risk detection trigger immediate re-evaluation without waiting for token expiry.

## Best Practices for Avoiding Blocking Issues

- Name your policies clearly (e.g., "Require MFA - All Users - All Apps" not "Policy 1")
- Always test with report-only mode before enforcing
- Maintain at least two break-glass accounts excluded from all policies
- Document the intent of each policy
- Avoid creating too many granular policies that interact in complex ways
- Review the sign-in logs weekly for unexpected blocks
- Use groups for policy assignments rather than individual users

Conditional Access blocking issues are almost always a configuration problem, not a bug. The sign-in logs and What-If tool give you the information to diagnose any blocking scenario. Take the time to understand which policy triggered the block, why the user did not satisfy the controls, and fix the specific gap without creating new ones.
