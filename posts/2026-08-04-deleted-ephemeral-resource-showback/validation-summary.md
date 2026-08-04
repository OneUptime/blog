# Validation Summary: Showback for Deleted and Ephemeral Resources

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- AWS Cost and Usage Reports (CUR) and AWS Data Exports CUR 2.0
- AWS cost allocation tags and historical tag backfill
- AWS Config resource recording and configuration history
- AWS CloudTrail event history
- Amazon EKS resource tagging
- Kubernetes Pod lifecycle, UIDs, owner references, and API watches
- Temporal resource inventory and ownership ledgers
- SQL interval-overlap joins for cost attribution
- FinOps showback and cost-allocation controls

## Sources Consulted

- [AWS Data Exports: Line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: CUR 2.0 Tags column](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-tag-columns.html)
- [AWS Data Exports: Resource tags details](https://docs.aws.amazon.com/cur/latest/userguide/resource-tags-columns.html)
- [AWS Billing: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Billing: Backfill cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Config: Recording AWS resources](https://docs.aws.amazon.com/config/latest/developerguide/select-resources.html)
- [AWS Config: Looking up discovered and deleted resources](https://docs.aws.amazon.com/config/latest/developerguide/looking-up-discovered-resources.html)
- [AWS Config API: GetResourceConfigHistory](https://docs.aws.amazon.com/config/latest/APIReference/API_GetResourceConfigHistory.html)
- [AWS CloudTrail: Working with CloudTrail event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html)
- [Amazon EKS: Organize Amazon EKS resources with tags](https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html)
- [Kubernetes: Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Object names and IDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [Kubernetes: Owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Kubernetes: API concepts and watches](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [PostgreSQL: Date/time types and timestamp literal syntax](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [PostgreSQL: Conditional expressions, including COALESCE](https://www.postgresql.org/docs/current/functions-conditional.html)

## Issues Found
No technical issues found.

## Review Notes

- All external documentation links in the post resolve to the intended official AWS or Kubernetes documentation.
- The SQL is a valid PostgreSQL-compatible illustration of a half-open interval-overlap join. A production implementation should normalize timestamps to UTC, use compatible timestamp types, define a non-null sentinel for global or regionless resources (or use null-safe matching), and enforce non-overlapping ownership intervals.
- AWS CUR documents usage start as inclusive and usage end as exclusive, which is consistent with the query's strict overlap predicates.
- CloudTrail event history covers the previous 90 days of management events within an AWS Region. Longer retention or broader coverage requires a trail or event data store; the post correctly treats CloudTrail coverage and retention as bounded.
- Kubernetes API watches require normal list/watch and `resourceVersion` recovery behavior because historical changes are retained for a limited time. The post's recommendation to persist lifecycle records outside the cluster is therefore important.
- No version-specific or deprecated API usage was found.
