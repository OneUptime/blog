# How to Configure Microsoft Defender for SQL to Detect SQL Injection and Anomalous Database Activities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Defender, SQL Security, SQL Injection, Database Security, Azure SQL, Threat Detection, Security

Description: Learn how to enable and configure Microsoft Defender for SQL to detect SQL injection attempts, brute force attacks, and anomalous database access patterns.

---

SQL injection has been on the OWASP Top 10 for as long as the list has existed, and it is not going away anytime soon. Even if your application code is solid, there are always edge cases - stored procedures that build dynamic queries, legacy modules that nobody wants to touch, or third-party integrations that pass user input straight through. Microsoft Defender for SQL adds a safety net by monitoring your database traffic patterns and alerting you when something suspicious happens.

In this guide, I will show you how to enable Defender for SQL on both Azure SQL Database and SQL Server on Azure VMs, configure the alert settings, and set up responses that make the alerts actionable rather than just noisy.

## What Defender for SQL Detects

Microsoft Defender for SQL uses behavioral analytics and machine learning to identify threats in real time. The main detection categories are:

**SQL Injection**: Detects both classic SQL injection attempts and blind SQL injection in query patterns. It analyzes the queries hitting your database and flags ones that match injection signatures or contain suspicious syntax patterns.

**Brute Force Attacks**: Identifies repeated failed login attempts from the same or distributed sources, which indicates credential stuffing or brute force attacks.

**Anomalous Database Access**: Flags unusual patterns like access from a new geographic location, access from an unusual Azure data center, or access from an unfamiliar principal. If a database that normally receives queries from your app servers suddenly gets queries from an unknown IP in a different country, Defender catches that.

**Data Exfiltration Indicators**: Detects queries that retrieve unusually large amounts of data, which could indicate someone is dumping the database.

**Unsafe SQL Commands**: Flags execution of dangerous commands like `xp_cmdshell` or `OPENROWSET` that could indicate post-exploitation activity.

## Step 1: Enable Defender for SQL on Azure SQL Database

The quickest way to enable protection is at the subscription level, which covers all SQL resources automatically.

```bash
# Enable Microsoft Defender for SQL at the subscription level
az security pricing create \
  --name SqlServers \
  --tier Standard

# Also enable for SQL on VMs if you have any
az security pricing create \
  --name SqlServerVirtualMachines \
  --tier Standard
```

You can also enable it on a specific server if you do not want subscription-wide coverage.

```bash
# Enable Defender for SQL on a specific Azure SQL server
az sql server advanced-threat-protection-setting update \
  --resource-group myResourceGroup \
  --server-name myserver \
  --state Enabled
```

Verify that it is enabled.

```bash
# Check the Defender status for a SQL server
az sql server advanced-threat-protection-setting show \
  --resource-group myResourceGroup \
  --server-name myserver \
  --query '{state: state, creationTime: creationTime}'
```

## Step 2: Configure Vulnerability Assessment

Defender for SQL includes a vulnerability assessment feature that scans your database configuration for security weaknesses. This is separate from the threat detection but equally important.

```bash
# Enable vulnerability assessment on the SQL server
# First, create a storage account for scan results
az storage account create \
  --name sqlvascans \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Standard_LRS

# Enable vulnerability assessment with recurring scans
az sql server va-setting update \
  --resource-group myResourceGroup \
  --server-name myserver \
  --storage-account sqlvascans \
  --state Enabled \
  --recurring-scans-enabled true \
  --email-admins true
```

The vulnerability assessment checks for things like:
- Excessive permissions granted to database users
- Missing encryption on sensitive columns
- Disabled auditing
- Firewall rules that are too permissive
- Outdated TLS versions

Each finding includes a description, risk level, and remediation steps.

## Step 3: Configure Alert Notifications

Defender for SQL generates alerts in Microsoft Defender for Cloud, but you probably want email notifications so your team can respond quickly.

```bash
# Set up email notifications for SQL threat detection alerts
az sql server threat-policy update \
  --resource-group myResourceGroup \
  --server-name myserver \
  --state Enabled \
  --email-addresses "soc-team@contoso.com;dba-team@contoso.com" \
  --email-account-admins true
```

The `--email-account-admins true` flag sends alerts to the SQL Server administrators in addition to the specified email addresses. This ensures that the people closest to the database are notified alongside the security team.

## Step 4: Review and Investigate Alerts

When Defender detects a threat, it creates an alert in Microsoft Defender for Cloud. Navigate to Defender for Cloud > Security alerts and filter by resource type "SQL".

Each alert includes:
- The detection type (SQL injection, anomalous access, etc.)
- The affected database and server
- The time window of the suspicious activity
- The source IP address and principal
- Sample queries that triggered the alert (sanitized to avoid exposing sensitive data)

Here is how to query alerts programmatically.

```bash
# List recent SQL threat detection alerts
az security alert list \
  --query "[?contains(alertType, 'SQL')].{type: alertType, severity: severity, status: status, time: timeGeneratedUtc, resource: compromisedEntity}" \
  --output table
```

For deeper investigation, the alert detail page in the portal shows a kill chain mapping that places the alert in context. A SQL injection attempt during a reconnaissance phase tells a different story than one that occurs alongside data exfiltration indicators.

## Step 5: Set Up Automated Responses

Alerts without automated responses just become noise. Here are two practical approaches to automate your response.

**Approach 1: Logic App for Automated Blocking**

Create a Logic App that triggers on Defender for Cloud alerts and automatically adds the attacking IP to the SQL Server firewall deny list.

```json
{
  "triggers": {
    "When_a_Defender_alert_is_created": {
      "type": "ApiConnection",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['ascalert']['connectionId']"
          }
        },
        "method": "get",
        "path": "/alerts"
      },
      "conditions": [
        {
          "expression": "@contains(triggerBody()?['AlertType'], 'SQL')"
        }
      ]
    }
  }
}
```

**Approach 2: Microsoft Sentinel Integration**

If you use Microsoft Sentinel, forward Defender for Cloud alerts to Sentinel and create automation rules there. This gives you the full SOAR (Security Orchestration, Automation, and Response) capabilities of Sentinel.

```bash
# Enable the Microsoft Defender for Cloud data connector in Sentinel
az sentinel data-connector create \
  --resource-group sentinel-rg \
  --workspace-name sentinel-workspace \
  --data-connector-id "MicrosoftDefenderForCloud" \
  --kind "AzureSecurityCenter"
```

## Step 6: Tune Alert Sensitivity

Out of the box, Defender for SQL can generate false positives, especially the "anomalous access" alerts during the initial learning period. The system needs about two weeks to establish a baseline of normal behavior for each database.

During this learning period:
- Review every alert to understand the baseline
- Dismiss false positives with feedback so the system learns
- Add known legitimate IP ranges to the SQL Server firewall to reduce noise

You can suppress specific alert types if they are consistently false positives in your environment.

```bash
# Create an alert suppression rule for a specific alert type
az security alerts-suppression-rule create \
  --name "SuppressAnomAccessFromCorpVPN" \
  --alert-type "Sql.VM_AnomalousAccess" \
  --reason "Our corporate VPN exit IPs trigger this consistently" \
  --state Enabled \
  --expiration-date "2026-06-01"
```

Always set an expiration date on suppression rules so they do not silently hide real threats indefinitely.

## Step 7: Enable SQL Auditing for Forensics

Defender alerts tell you something happened, but SQL auditing gives you the full picture. Enable auditing to capture the actual queries, connection events, and permission changes.

```bash
# Enable SQL auditing to a Log Analytics workspace
az sql server audit-policy update \
  --resource-group myResourceGroup \
  --server-name myserver \
  --state Enabled \
  --lats Enabled \
  --lawri "/subscriptions/YOUR_SUB/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/your-workspace"
```

With auditing enabled, you can investigate alerts by querying the detailed audit logs.

```kql
// Find SQL injection attempts correlated with Defender alerts
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.SQL"
| where Category == "SQLSecurityAuditEvents"
| where TimeGenerated > ago(24h)
| where statement_s contains "UNION" or statement_s contains "OR 1=1" or statement_s contains "--"
| project TimeGenerated, client_ip_s, database_name_s, statement_s
| order by TimeGenerated desc
```

## Protecting SQL Server on Azure VMs

Defender for SQL is not just for Azure SQL Database. If you run SQL Server on Azure VMs, you get the same detection capabilities.

Enable the SQL Server extension on your VMs.

```bash
# Register the SQL Server VM with the SQL IaaS Agent extension
az sql vm create \
  --name my-sql-vm \
  --resource-group myResourceGroup \
  --license-type PAYG \
  --sql-mgmt-type Full

# Enable Defender for SQL on the VM
az security pricing create \
  --name SqlServerVirtualMachines \
  --tier Standard
```

The SQL IaaS Agent collects query patterns and authentication events from the SQL Server instance and sends them to Defender for analysis. The detection capabilities are the same as Azure SQL Database.

## Cost Considerations

Microsoft Defender for SQL is charged per SQL Server instance per month. As of 2026, the pricing is approximately $15 per server per month for Azure SQL Database and $15 per SQL Server instance for VMs. This covers both threat detection and vulnerability assessment.

For most organizations, this is a small cost compared to the impact of a SQL injection breach. A single data breach can cost millions in remediation, legal fees, and reputation damage.

## Wrapping Up

Microsoft Defender for SQL adds a critical detection layer that catches threats your application-level defenses might miss. Enable it at the subscription level for comprehensive coverage, configure email notifications so your team responds quickly, set up automated responses for the most critical alert types, and enable SQL auditing for forensic investigations. The initial learning period will produce some noise, but after a couple of weeks the system settles down and starts delivering high-quality alerts that genuinely help you protect your databases.
