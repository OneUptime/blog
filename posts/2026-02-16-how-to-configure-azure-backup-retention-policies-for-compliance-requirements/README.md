# How to Configure Azure Backup Retention Policies for Compliance Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Backup, Retention Policies, Compliance, Disaster Recovery, Data Protection, Azure Recovery Services

Description: Configure Azure Backup retention policies to meet regulatory compliance requirements including HIPAA, SOC 2, GDPR, and industry-specific data retention mandates.

---

Backup retention is not just about having restore points. In regulated industries, you are required to keep backups for specific periods and be able to prove it. Healthcare organizations under HIPAA need to retain certain records for six years. Financial services companies may need seven years of retention. GDPR requires the ability to delete data, which means your retention policies also need to support data removal.

Azure Backup provides flexible retention policies, but configuring them correctly for compliance requires understanding how retention tiers work, how policies interact with different backup types, and how to document your configuration for auditors.

## Understanding Azure Backup Retention Tiers

Azure Backup organizes retention into four tiers:

- **Daily retention** - keeps daily backup points for a specified number of days
- **Weekly retention** - keeps a weekly backup point (typically from the first backup of the week)
- **Monthly retention** - keeps a monthly backup point (typically from the first backup of the month)
- **Yearly retention** - keeps a yearly backup point (from a specific week and day you define)

These tiers work together. A single backup point can count toward multiple tiers. For example, the backup taken on January 1st could be the daily point, the weekly point, the monthly point, and the yearly point all at once.

## Creating a Compliance-Focused Backup Policy

Let me walk through creating a backup policy that meets common compliance requirements. This example configures a policy for a healthcare workload that needs:

- Daily backups retained for 30 days (operational recovery)
- Weekly backups retained for 12 weeks (short-term compliance)
- Monthly backups retained for 24 months (medium-term compliance)
- Yearly backups retained for 7 years (long-term compliance)

```bash
# Create a Recovery Services vault with geo-redundant storage
# GRS is recommended for compliance workloads to protect against regional outages
az backup vault create \
  --resource-group rg-backup \
  --name rsv-compliance \
  --location eastus2

# Set storage redundancy to geo-redundant
az backup vault backup-properties set \
  --resource-group rg-backup \
  --name rsv-compliance \
  --backup-storage-redundancy GeoRedundant
```

Now create the backup policy with the retention schedule.

```bash
# Create a custom backup policy for Azure VMs
# First, get the default policy template
az backup policy show \
  --resource-group rg-backup \
  --vault-name rsv-compliance \
  --name DefaultPolicy \
  -o json > /tmp/policy-template.json
```

The JSON policy template needs to be modified for your retention requirements. Here is the key section of a policy configuration.

```json
{
  "properties": {
    "backupManagementType": "AzureIaasVM",
    "schedulePolicy": {
      "schedulePolicyType": "SimpleSchedulePolicy",
      "scheduleRunFrequency": "Daily",
      "scheduleRunTimes": ["2026-02-16T02:00:00Z"]
    },
    "retentionPolicy": {
      "retentionPolicyType": "LongTermRetentionPolicy",
      "dailySchedule": {
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 30,
          "durationType": "Days"
        }
      },
      "weeklySchedule": {
        "daysOfTheWeek": ["Sunday"],
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 12,
          "durationType": "Weeks"
        }
      },
      "monthlySchedule": {
        "retentionScheduleFormatType": "Weekly",
        "retentionScheduleWeekly": {
          "daysOfTheWeek": ["Sunday"],
          "weeksOfTheMonth": ["First"]
        },
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 24,
          "durationType": "Months"
        }
      },
      "yearlySchedule": {
        "retentionScheduleFormatType": "Weekly",
        "retentionScheduleWeekly": {
          "daysOfTheWeek": ["Sunday"],
          "weeksOfTheMonth": ["First"]
        },
        "monthsOfYear": ["January"],
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 7,
          "durationType": "Years"
        }
      }
    }
  }
}
```

## Retention for Different Workload Types

Azure Backup supports multiple workload types, and each has slightly different retention capabilities.

### Azure VM Backup

VM backup supports all four retention tiers. Maximum retention is 9999 days for daily, 5163 weeks for weekly, 1188 months for monthly, and 99 years for yearly.

### Azure SQL Database Backup

SQL Database uses a different retention mechanism called Long-Term Retention (LTR). You configure it through the SQL Database settings rather than the Recovery Services vault.

```bash
# Configure long-term retention for Azure SQL Database
# Keep weekly backups for 12 weeks, monthly for 12 months, yearly for 7 years
az sql db ltr-policy set \
  --resource-group myRG \
  --server myServer \
  --database myDB \
  --weekly-retention P12W \
  --monthly-retention P12M \
  --yearly-retention P7Y \
  --week-of-year 1
```

### Azure Files Backup

Azure Files backup supports daily and yearly retention. Weekly and monthly retention are available but with some limitations on the maximum retention period.

### Azure Blob Storage

Blob storage uses operational and vaulted backup. Operational backup supports 1-360 days of retention. For longer retention, use vaulted backup which supports the full retention tier structure.

## Immutable Backup Vaults

For compliance scenarios where backups must not be deletable (even by administrators), enable immutability on the Recovery Services vault.

```bash
# Enable immutability on the vault
# Once locked, this cannot be disabled
az backup vault update \
  --resource-group rg-backup \
  --name rsv-compliance \
  --immutability-state Unlocked

# When ready to enforce, lock the immutability
# WARNING: This is irreversible
az backup vault update \
  --resource-group rg-backup \
  --name rsv-compliance \
  --immutability-state Locked
```

Immutable vaults prevent:
- Deletion of backup data before the retention period expires
- Reduction of retention periods
- Disabling of soft-delete

This is critical for meeting compliance requirements that mandate tamper-proof backups. Auditors want to know that backup data cannot be destroyed, even by a malicious insider with admin access.

## Multi-User Authorization

For additional protection, enable multi-user authorization (MUA) on the vault. This requires a second authorized user to approve critical operations like disabling soft-delete, reducing retention, or stopping backup with delete data.

```bash
# Create a Resource Guard in a separate subscription managed by security team
az dataprotection resource-guard create \
  --resource-group rg-security \
  --name myResourceGuard \
  --location eastus2

# Associate the Resource Guard with the backup vault
# Now critical operations require approval from the Resource Guard owner
```

## Documenting Retention for Auditors

Compliance is not just about having the right configuration. You need to prove it to auditors. Document the following:

1. **Retention policy configuration** - Export your backup policies and store them in your compliance documentation.
2. **Backup job history** - Azure Backup keeps a log of all backup jobs. Export these regularly.
3. **Restore test results** - Auditors want to see that backups are actually restorable. Schedule quarterly restore tests and document the results.
4. **Vault security configuration** - Document immutability settings, RBAC assignments, and network security.

```bash
# Export backup policy configuration for documentation
az backup policy list \
  --resource-group rg-backup \
  --vault-name rsv-compliance \
  -o json > backup-policies-export.json

# Export recent backup job history
az backup job list \
  --resource-group rg-backup \
  --vault-name rsv-compliance \
  --start-date 2026-01-01 \
  --end-date 2026-02-16 \
  -o json > backup-jobs-export.json
```

## Cost Implications of Long Retention

Long retention periods directly impact cost. Azure Backup charges for storage consumed by backup data. A 7-year yearly retention policy for a 1 TB database means you are storing at least 7 copies (potentially more with incremental changes).

To manage costs while meeting compliance:

- Use tiered storage where available (move older backups to cooler storage tiers)
- Review retention policies annually and remove retention periods that exceed regulatory minimums
- Use compression and deduplication where supported
- Consider using different retention policies for different data classifications (not all data needs 7-year retention)

## Handling GDPR Right to Erasure

GDPR introduces an interesting conflict with backup retention. If a user requests deletion of their personal data, you need to delete it from backups too, or have a documented process explaining why you cannot.

The practical approach is to:
1. Document that backup deletion is technically infeasible without destroying other users' data
2. Ensure that restore operations include a data cleansing step that removes deleted user data
3. Let backup retention expire naturally, at which point the data is deleted

Consult with your legal team on the specific approach for your jurisdiction and data types.

Backup retention configuration for compliance is a balance between regulatory requirements, operational needs, and cost management. Get the policy right from the start, enable immutability for tamper protection, and maintain documentation that auditors can review. Changing retention policies after the fact is much harder than setting them up correctly initially.
