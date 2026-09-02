# Validation Summary: Write a Recovery Runbook Anyone Can Execute at 3 A.M.

## Status

validated

## Post Type

Technical guide and operational reference

## Technologies Covered

- Disaster recovery and cyber-event recovery runbooks/playbooks
- Recovery time objectives (RTOs), recovery point objectives (RPOs), backup restoration, failover, and failback
- Incident command roles, communications, evidence capture, approval gates, and escalation
- Database recovery safety, writer fencing, isolation, validation, traffic shifting, and rollback
- CISA tabletop exercises and isolated technical recovery testing
- Azure Site Recovery recovery plans
- Generic CLI-based recovery workflows (illustrative pseudocommands only)

## Sources Consulted

- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final), including the playbook definition, planning, testing, metrics, and playbook checklist guidance
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final), including RTO/RPO definitions and plan testing, training, exercise, and maintenance guidance
- [CISA Cybersecurity Tabletop Exercise Package documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [Microsoft Learn: About recovery plans in Azure Site Recovery](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [Microsoft Learn: Run a test failover to Azure](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure)
- [Microsoft Learn: Redundancy, replication, and backup](https://learn.microsoft.com/en-us/azure/reliability/concept-redundancy-replication-backup)
- [Microsoft Learn: Manually force a failover of a SQL Server Always On availability group](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/perform-a-forced-manual-failover-of-an-availability-group-sql-server?view=sql-server-ver17)

## Issues Found

- The command template used `EXPECTED_TARGET_ACCOUNT` and `APPROVED_MINIMUM_SEQUENCE` without defining them and reused `OPERATION_ID` without showing how it was captured. Added definitions for both required inputs and made the mapping from the returned `operation_id` to `OPERATION_ID` explicit.
- The safety rule required every resource selector to include the incident or exercise ID, which cannot apply to pre-existing source resources. Narrowed the rule to selectors for resources created during recovery.
- The acceptance criteria described RTO and RPO as measured results. RTO and RPO are objectives; actual recovery time and the achieved recovery point are the results measured against them. Corrected the criterion accordingly.

## Review Notes

The `recoveryctl` block is explicitly identified as an information-shape example, is fenced as Markdown rather than shell, and does not claim to be a real product CLI. Its invented command and flags therefore were not treated as executable syntax; an operational runbook must replace them with tested, version-specific product commands, as the post already states. All five links in the post resolved successfully during validation. The cited NIST publications remain published as final documents, although SP 800-34 Rev. 1 dates from 2010 and SP 800-184 dates from 2016.
