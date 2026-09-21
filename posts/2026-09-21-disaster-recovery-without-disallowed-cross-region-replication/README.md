# How to Design Disaster Recovery When Cross-Region Replication Would Violate Residency Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, Disaster Recovery, AWS RDS, Backup, High Availability

Description: Design failure-specific recovery plans using approved availability zones, isolated backups, and explicit limits when no second geographic destination is allowed.

---

A disaster recovery template often begins with a second cloud region. That is not an available option when the approved data boundary contains only one region. The design must then state which failures it can survive and which outages require waiting for the region to recover.

Start with the actual requirement. A country may contain multiple permitted regions, or none with the required service. A broader contractual boundary may permit a second region. Record the approved set before choosing a topology.

## Separate the failure cases

Use a table like this during architecture review:

| Failure | Candidate recovery mechanism | Remaining dependency |
| --- | --- | --- |
| Process or host failure | Managed restart or standby promotion | Regional service |
| Availability-zone outage | Placement across approved zones | Region-wide control and data planes |
| Accidental deletion | Point-in-time recovery | Accessible backup and key |
| Account compromise | Isolated backup account and restricted restore role | Region and identity recovery |
| Region-wide loss | Another approved region or independent approved site | Availability of that destination |
| No reachable approved destination | Controlled service suspension | Restoration of approved capacity |

This is a planning model, not a provider availability guarantee. Calculate recovery objectives separately for each row instead of assigning a single optimistic recovery time to every failure.

## Use regional high availability for the failures it covers

For RDS, a [Multi-AZ DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html) maintains a synchronous standby in another availability zone. Its standby does not serve read queries. A [Multi-AZ DB cluster](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html) has a different architecture: a writer and two readers across three zones in the same region.

Those topologies improve protection against local failures. They do not provide an independently located recovery destination for a complete regional outage. Keep this distinction in both the runbook and customer-facing recovery promises.

Inspect the deployed instance rather than relying on an infrastructure variable:

```bash
aws rds describe-db-instances \
  --region eu-west-2 \
  --db-instance-identifier orders \
  --query 'DBInstances[0].{MultiAZ:MultiAZ,PrimaryAZ:AvailabilityZone,StandbyAZ:SecondaryAvailabilityZone,Arn:DBInstanceArn}' \
  --output json
```

For cluster deployments, inventory the cluster and all member instances using their corresponding APIs. A field from the DB-instance topology should not be used to infer cluster placement.

## Isolate backups from routine administrators

Place recovery copies in an approved location under a separately controlled recovery account where the service supports that design. Use separate administrative roles, restore credentials, and deletion controls. Check each resource type's cross-account support and encryption requirements before selecting it.

Account isolation limits some administrative failures; it does not create geographic independence. Likewise, immutable storage addresses deletion risk, not application consistency. AWS documents the distinct retention modes and legal holds of [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html). Use those controls only with an agreed retention and deletion policy.

Restore a representative backup regularly. Measure how long it takes to acquire capacity, recover data, rebuild indexes, validate the application, and reconnect clients. A snapshot's existence says little about the time required to resume a useful service.

## Keep emergency automation within the approved set

Use an application-specific recovery policy checked by the deployment pipeline:

```json
{
  "service": "orders",
  "approved_regions": ["eu-west-2"],
  "automatic_failover_regions": ["eu-west-2"],
  "cross_region_recovery": false,
  "regional_outage_action": "suspend_writes"
}
```

This is an example policy artifact, not an AWS API request. Enforce it in the code that creates recovery resources and updates routing. Also constrain the operator role and inspect destination parameters. An endpoint-region restriction alone may miss downstream replication effects, as AWS explains for [aws:RequestedRegion](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion).

Failing over compute must not silently relocate queues, object storage, telemetry, or keys. Exercise those dependencies during a rehearsal. A static maintenance page can be served separately if its content and request metadata are permitted by the boundary.

## Rehearse the uncomfortable outcome

Run three drills: an availability-zone failure, restoration from an older backup after corruption, and a simulated loss of every approved region. The last drill should demonstrate that the system refuses an unapproved destination.

Verify that clients stop accepting writes they cannot durably preserve. If requests are queued, the queue becomes another customer-data store and needs an approved location and bounded retention. Communicate unavailable capabilities and the next recovery checkpoint.

When no independent approved site exists, document the resulting regional-outage limitation and seek an explicit architectural decision about alternate providers, on-premises capacity, or revised objectives. A clear limit is more useful than a recovery plan that can only succeed by crossing the required boundary.
