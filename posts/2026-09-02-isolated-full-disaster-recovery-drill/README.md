# Run an Isolated Full Disaster Recovery Drill

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Testing, Security, Cloud

Description: Run a production-faithful disaster recovery drill inside an isolated environment that safely replaces or blocks production dependencies.

---

A full disaster recovery drill should exercise real restore, rebuild, startup, and validation procedures. It should not email customers, charge cards, publish duplicate messages, mutate a production database, or allow two machines with the same identity onto the same network.

The design challenge is fidelity without uncontrolled side effects. Azure's Site Recovery documentation recommends an isolated network for test failover, and AWS drill guidance recommends a drill subnet with no route to the source environment or production systems.

## Threat-Model the Drill First

List every way a restored service can escape its test boundary:

- DNS still resolves production databases or APIs;
- copied configuration contains production hostnames;
- a restored queue consumer acknowledges live messages;
- retry workers replay old email, SMS, webhook, or payment jobs;
- OAuth clients redirect to production;
- certificates or machine identities collide with live instances;
- monitoring agents register under production identity;
- backup agents begin new jobs against production targets;
- transit gateways, peering, private endpoints, or shared proxies bypass an apparent subnet boundary;
- an operator uses a production kubeconfig or cloud profile from the drill host.

Treat “private network” and “non-production account” as useful boundaries, not proofs. Verify effective routes, firewall policies, private DNS, service endpoints, identity policy, and application configuration.

## Classify Dependencies

Create a dependency manifest before the exercise:

| Dependency | Drill behavior | Validation |
| --- | --- | --- |
| Restored database | Local clone | Writes visible only in run-tagged target |
| DNS | Private drill zone | Known names return drill addresses |
| Email/SMS | Capturing sink | Message contents captured; nothing delivered |
| Payments | Vendor sandbox or deterministic stub | No live merchant credentials available |
| Webhooks | Local request recorder | Requests stored with run ID |
| Object storage | Restored copy or read-only fixture | Production bucket denied by identity policy |
| Identity provider | Test tenant or constrained stub | Test users only |
| Time/PKI | Dedicated or explicitly shared read-only service | Trust path documented and monitored |
| Telemetry | Drill-labelled destination | Alerts cannot page production responders unless intended |

Use a real dependency only when the exercise plan documents why it is safe, who approved it, and how writes are prevented.

## Build Multiple Containment Layers

### Network boundary

Create a dedicated virtual network or VPC with no peering, VPN, transit, or default route to production. Apply default-deny egress. Add narrow routes only to approved artifact, time, logging, and test services.

### DNS boundary

Give the drill its own resolver and private zone. Map required service names to drill endpoints or explicit sinks. Add a canary production name that must fail resolution; test it before any workload starts.

### Identity boundary

Use a dedicated drill account, project, subscription, or narrowly scoped role. Production secrets should be unavailable even if network policy is accidentally weakened. Issue short-lived credentials and associate each identity or session with the exercise ID.

### Application boundary

Set an unmistakable environment marker and force side-effecting adapters into drill mode. A safe design refuses to start when both environment=drill and a production endpoint or credential fingerprint is present.

~~~text
if environment == "drill":
    assert payment_mode == "sandbox"
    assert mail_transport == "capture"
    assert parse_url(webhook_base_url).scheme == "https"
    assert parse_url(webhook_base_url).hostname in approved_drill_webhook_hosts
    assert production_credential_fingerprints intersection fingerprints(loaded_secrets) is empty
~~~

### Data boundary

Mark restored records and generated traffic with a unique run ID where schemas permit. Deny reverse replication from the drill environment. Never attach a restored data directory to a still-running production database.

## Add a Preflight Gate

The exercise controller should refuse to start workloads until all safety checks pass:

~~~yaml
preflight:
  - no_route: production_cidrs
  - dns_must_fail: prod-write.internal.example
  - tcp_must_fail: production_database:5432
  - identity_policy_must_deny: production-object-store-write
  - required_sinks_healthy: [mail, sms, webhook, payment]
  - unique_run_id_present: true
  - cleanup_owner_present: true
  - stop_authority_present: true
~~~

Evaluate production write permissions with a non-mutating policy simulator or equivalent authorization analysis. If a live probe is required, target a dedicated non-production canary; do not test a denial by attempting a real production write. Run a continuous, non-mutating escape canary during the drill, not only at startup. Cloud routes and identity policies can change while an exercise is running.

## Execute the Full Drill

1. **Authorize scope.** Record scenario, objectives, systems, start and stop authority, communications, and abort conditions.
2. **Capture baseline.** Save source recovery watermark, configuration versions, backup IDs, replication lag, and expected topology.
3. **Create containment.** Provision the isolated network, resolver, identities, sinks, observability, quotas, and budgets.
4. **Prove isolation.** Run negative DNS, TCP, identity, and side-effect tests from the same runtime identity and namespace as the restored workload.
5. **Recover in documented order.** Restore data, rebuild foundations, start control services, then application tiers.
6. **Exercise degraded modes.** Do not silently replace missing required dependencies; observe whether the service fails safely.
7. **Validate business flows.** Drive synthetic transactions through the normal ingress path and inspect sink outputs.
8. **Evaluate RTO and RPO.** Measure the achieved recovery duration and determine the achieved recovery point from captured event timestamps and data watermarks, then compare them with the objectives.
9. **Test stop and rollback.** Confirm the incident commander can halt automation and revoke drill access.
10. **Export evidence and clean up.** Destroy exact run-tagged resources, revoke identities, and verify that no route, record, or temporary secret remains.

## Safety Cautions

Copied production data may remain sensitive even in isolation. Preserve encryption, access logging, retention limits, and data-handling obligations. Prefer masked or synthetic data only when it still exercises the failure mode; document the fidelity lost.

Do not lower protections merely to make the restore pass. Disabling TLS validation, using a global administrator role, or opening broad egress hides the very recovery dependencies the drill should discover.

Be especially cautious with Active Directory, Kubernetes node identity, database replication, DHCP, and duplicate IP addresses. Azure notes that placing a test VM on the production recovery network while the primary VM remains on can create two machines with the same identity.

## Acceptance Criteria

The drill passes only when:

- the production procedure restores all scoped services in dependency order;
- network, DNS, identity, application, and data isolation checks remain green throughout;
- all outbound side effects appear only in approved sinks or sandboxes;
- synthetic business flows and integrity checks pass;
- measured recovery duration is within the RTO, and the achieved recovery point is within the RPO;
- abort and credential-revocation paths work;
- every temporary resource is attributable to one run ID and cleanup is verified;
- an after-action report assigns owners and deadlines to gaps.

A drill that is perfectly safe but unlike production teaches little. A drill that is realistic but can mutate production is reckless. Layered containment makes it possible to achieve both useful fidelity and controlled risk.

## Official References

- [Azure Site Recovery: Run a test failover](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure)
- [Azure Site Recovery: Active Directory and DNS test-failover isolation](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-active-directory)
- [AWS: Drill planning for cross-Region disaster recovery](https://docs.aws.amazon.com/guidance/latest/deploying-cross-region-disaster-recovery-with-aws-elastic-disaster-recovery/drill-planning.html)
- [CISA: Cybersecurity Tabletop Exercise Package documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
