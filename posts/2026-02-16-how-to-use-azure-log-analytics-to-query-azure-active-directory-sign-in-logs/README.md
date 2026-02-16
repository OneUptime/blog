# How to Use Azure Log Analytics to Query Azure Active Directory Sign-In Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, Azure Active Directory, Sign-In Logs, KQL, Security Monitoring, Identity, Azure Monitor

Description: Learn how to send Azure AD sign-in logs to Log Analytics and write KQL queries to detect suspicious activity, analyze authentication patterns, and audit access.

---

Azure Active Directory sign-in logs are one of the most valuable data sources for security monitoring. They tell you who is logging in, from where, using what devices, and whether multi-factor authentication was required. But viewing these logs in the Azure AD portal has limitations - the built-in views only go back 30 days, custom filtering is limited, and you cannot create complex queries or correlate sign-in data with other log sources.

By routing sign-in logs to a Log Analytics workspace, you unlock the full power of KQL for querying, the ability to set up alerts, and long-term retention beyond the 30-day default.

## Step 1: Route Sign-In Logs to Log Analytics

First, configure Azure AD diagnostic settings to send sign-in logs to your workspace.

```bash
# Create a diagnostic setting to send Azure AD sign-in logs to Log Analytics
az monitor diagnostic-settings create \
  --name aad-signin-logs \
  --resource "/providers/Microsoft.AAD/domainServices" \
  --workspace /subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace \
  --logs '[
    {"category": "SignInLogs", "enabled": true},
    {"category": "NonInteractiveUserSignInLogs", "enabled": true},
    {"category": "ServicePrincipalSignInLogs", "enabled": true},
    {"category": "ManagedIdentitySignInLogs", "enabled": true},
    {"category": "AuditLogs", "enabled": true}
  ]'
```

You can also do this through the Azure Portal:

1. Go to Azure Active Directory
2. Click Diagnostic settings in the Monitoring section
3. Click Add diagnostic setting
4. Select the log categories you want (SignInLogs, NonInteractiveUserSignInLogs, etc.)
5. Check "Send to Log Analytics workspace"
6. Select your workspace
7. Save

It takes 15-30 minutes for data to start flowing after you enable the diagnostic setting.

## Step 2: Understand the Sign-In Log Tables

Azure AD logs land in several tables:

- **SigninLogs**: Interactive user sign-ins (user entered credentials)
- **AADNonInteractiveUserSignInLogs**: Token refreshes and silent authentication
- **AADServicePrincipalSignInLogs**: Application and service principal sign-ins
- **AADManagedIdentitySignInLogs**: Managed identity sign-ins

For security monitoring, `SigninLogs` is usually the most important table.

## Step 3: Basic Sign-In Queries

Start with simple queries to understand the data:

```kql
// View recent sign-in activity
SigninLogs
| where TimeGenerated > ago(1h)
| project TimeGenerated, UserDisplayName, UserPrincipalName, AppDisplayName,
          IPAddress, Location = LocationDetails.city,
          Status = ResultType, ResultDescription
| order by TimeGenerated desc
| take 50
```

Result types are numeric codes. The important ones:

- `0` = Success
- `50126` = Invalid username or password
- `50074` = User did not pass MFA challenge
- `50076` = MFA required but not completed
- `53003` = Blocked by Conditional Access
- `50053` = Account locked out

```kql
// Count sign-in results by status
SigninLogs
| where TimeGenerated > ago(24h)
| summarize Count = count() by ResultType, ResultDescription
| order by Count desc
```

## Step 4: Detect Suspicious Sign-In Patterns

Here are queries that detect common attack patterns:

**Brute force attempts** - multiple failed sign-ins for the same account:

```kql
// Detect potential brute force attacks
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType != "0"  // Failed sign-ins only
| summarize
    FailedAttempts = count(),
    DistinctIPs = dcount(IPAddress),
    IPs = make_set(IPAddress, 10),
    LastAttempt = max(TimeGenerated)
    by UserPrincipalName
| where FailedAttempts > 10
| order by FailedAttempts desc
```

**Password spray** - the same password tried against many accounts (shows as failed attempts from one IP across many users):

```kql
// Detect potential password spray attacks
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType == "50126"  // Invalid username or password
| summarize
    TargetedAccounts = dcount(UserPrincipalName),
    Accounts = make_set(UserPrincipalName, 20),
    AttemptCount = count()
    by IPAddress
| where TargetedAccounts > 10
| order by TargetedAccounts desc
```

**Impossible travel** - sign-ins from geographically distant locations in a short time:

```kql
// Detect sign-ins from different countries within a short timeframe
SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType == "0"  // Successful sign-ins only
| extend Country = tostring(LocationDetails.countryOrRegion)
| extend City = tostring(LocationDetails.city)
| summarize
    Countries = make_set(Country),
    Cities = make_set(City),
    CountryCount = dcount(Country),
    EarliestSignIn = min(TimeGenerated),
    LatestSignIn = max(TimeGenerated)
    by UserPrincipalName
| where CountryCount > 1
| extend TimeDiffHours = datetime_diff('hour', LatestSignIn, EarliestSignIn)
| where TimeDiffHours < 4
| project UserPrincipalName, Countries, Cities, TimeDiffHours
```

## Step 5: Analyze MFA Usage

Understanding MFA adoption and effectiveness is critical for security posture:

```kql
// MFA usage analysis
SigninLogs
| where TimeGenerated > ago(7d)
| where ResultType == "0"  // Successful sign-ins
| extend MFARequired = tostring(AuthenticationRequirement)
| summarize
    TotalSignIns = count(),
    MFARequired = countif(MFARequired == "multiFactorAuthentication"),
    SingleFactor = countif(MFARequired == "singleFactorAuthentication")
    by bin(TimeGenerated, 1d)
| extend MFAPercentage = round(100.0 * MFARequired / TotalSignIns, 1)
| project TimeGenerated, TotalSignIns, MFARequired, SingleFactor, MFAPercentage
```

```kql
// Find users who signed in without MFA
SigninLogs
| where TimeGenerated > ago(7d)
| where ResultType == "0"
| where AuthenticationRequirement == "singleFactorAuthentication"
| summarize
    SignInCount = count(),
    Apps = make_set(AppDisplayName, 5),
    LastSignIn = max(TimeGenerated)
    by UserPrincipalName
| order by SignInCount desc
```

## Step 6: Conditional Access Policy Analysis

Check whether your Conditional Access policies are working as expected:

```kql
// Analyze Conditional Access policy results
SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand ConditionalAccessPolicies
| extend PolicyName = tostring(ConditionalAccessPolicies.displayName)
| extend PolicyResult = tostring(ConditionalAccessPolicies.result)
| summarize
    Applied = countif(PolicyResult == "success"),
    NotApplied = countif(PolicyResult == "notApplied"),
    Failed = countif(PolicyResult == "failure")
    by PolicyName
| order by Applied desc
```

```kql
// Find sign-ins blocked by Conditional Access
SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType == "53003"  // Blocked by CA
| mv-expand ConditionalAccessPolicies
| where ConditionalAccessPolicies.result == "failure"
| extend PolicyName = tostring(ConditionalAccessPolicies.displayName)
| summarize BlockCount = count() by PolicyName, UserPrincipalName
| order by BlockCount desc
```

## Step 7: Monitor Service Principal Sign-Ins

Application sign-ins are often overlooked but are critical for security:

```kql
// Monitor service principal sign-in activity
AADServicePrincipalSignInLogs
| where TimeGenerated > ago(24h)
| summarize
    SignInCount = count(),
    FailedCount = countif(ResultType != "0"),
    UniqueIPs = dcount(IPAddress)
    by ServicePrincipalName, AppId
| where FailedCount > 0
| order by FailedCount desc
```

```kql
// Detect service principals signing in from unexpected IP addresses
let KnownIPs = dynamic(["10.0.0.1", "10.0.0.2", "20.30.40.50"]);
AADServicePrincipalSignInLogs
| where TimeGenerated > ago(24h)
| where IPAddress !in (KnownIPs)
| project TimeGenerated, ServicePrincipalName, IPAddress, ResultType
| order by TimeGenerated desc
```

## Step 8: Create Alerts for Critical Events

Set up log alerts for the most important sign-in events:

**Alert on successful sign-in after multiple failures** (potential compromised account):

```kql
// Detect successful sign-in after multiple failures within 30 minutes
let FailedSignIns = SigninLogs
    | where TimeGenerated > ago(30m)
    | where ResultType != "0"
    | summarize FailureCount = count(), FailureIPs = make_set(IPAddress)
        by UserPrincipalName;
let SuccessfulSignIns = SigninLogs
    | where TimeGenerated > ago(30m)
    | where ResultType == "0"
    | project UserPrincipalName, SuccessTime = TimeGenerated, SuccessIP = IPAddress;
FailedSignIns
| where FailureCount > 5
| join kind=inner SuccessfulSignIns on UserPrincipalName
| project UserPrincipalName, FailureCount, FailureIPs, SuccessTime, SuccessIP
```

**Alert on sign-ins from blocked countries**:

```kql
// Detect sign-ins from countries not in the allowed list
let AllowedCountries = dynamic(["US", "CA", "GB", "DE", "FR"]);
SigninLogs
| where TimeGenerated > ago(15m)
| where ResultType == "0"
| extend Country = tostring(LocationDetails.countryOrRegion)
| where Country !in (AllowedCountries) and isnotempty(Country)
| project TimeGenerated, UserPrincipalName, Country, IPAddress, AppDisplayName
```

## Step 9: Build a Sign-In Dashboard

Combine these queries into an Azure Workbook for a comprehensive sign-in dashboard. Key visualizations to include:

- Sign-in success/failure trend over time
- Top failed sign-in accounts (potential attack targets)
- Geographic distribution of sign-ins
- MFA adoption percentage
- Conditional Access policy effectiveness
- Legacy authentication usage (a common attack vector)

```kql
// Legacy authentication detection - these should be blocked
SigninLogs
| where TimeGenerated > ago(7d)
| where ClientAppUsed in ("Exchange ActiveSync", "IMAP4", "POP3", "SMTP", "Other clients")
| summarize Count = count() by UserPrincipalName, ClientAppUsed
| order by Count desc
```

## Retention and Cost

Sign-in logs can be verbose, especially in large organizations. Consider:

- **Retention**: Set workspace retention to match your compliance requirements (90 days, 1 year, etc.)
- **Archive tier**: For logs older than your interactive retention period, use the archive tier for cost-effective long-term storage
- **Sampling**: You cannot sample sign-in logs, but you can filter out non-interactive sign-in logs if they are too voluminous

## Summary

Routing Azure AD sign-in logs to Log Analytics transforms them from a basic audit trail into a powerful security monitoring tool. The combination of KQL queries, alerting, and workbook dashboards lets you detect brute force attacks, password sprays, impossible travel, MFA gaps, and compromised accounts. Start with the detection queries in this guide, create alerts for the most critical scenarios, and build a dashboard for ongoing visibility.
