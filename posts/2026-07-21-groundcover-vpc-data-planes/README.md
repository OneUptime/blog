# Does Groundcover Data Leave Your VPC? Control and Data Planes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, BYOC, Data Privacy, Cloud Security

Description: Map Groundcover's data, control, UI, authentication, and deployment-telemetry paths before making a claim about VPC or data residency.

---

The accurate answer is deployment-specific. Groundcover documents that observability data is stored in your environment, but BYOC still uses external frontend, authentication, and managed-control-plane components. It also documents an outbound portal connection and optional deployment telemetry. If the backend is in a separate customer-owned VPC, telemetry can leave the monitored workload VPC while remaining inside infrastructure your organization controls.

Do not turn "stored in your environment" into the broader claim "no data ever crosses a VPC boundary." First define which VPC, which data category, and which deployment mode you mean.

## Define the boundaries

A review should distinguish:

- **Monitored environment:** The Kubernetes cluster or Linux host producing telemetry.
- **Groundcover data plane:** Collection, aggregation, object storage, ClickHouse, and VictoriaMetrics components.
- **Groundcover control plane:** Services that manage and configure the backend.
- **Frontend and authentication:** The path through which an authorized user requests and views data.
- **Management telemetry:** Groundcover component performance metrics and logs described in the FAQ.
- **Customer boundary:** The accounts, projects, subscriptions, regions, VPCs, and on-premises networks your organization controls.

A production cluster VPC and a dedicated BYOC backend VPC are two different network boundaries even when both belong to the same company.

## Understand the BYOC path

In Groundcover's current BYOC architecture, sensors run in monitored clusters and a unified backend runs in a dedicated cluster in your cloud environment. ClickHouse stores logs, traces, and Kubernetes events. VictoriaMetrics stores metrics. The architecture also supports object storage in the customer's cloud environment.

The external side includes:

- the frontend
- SSO authentication
- the managed control plane

Groundcover says the frontend reaches the backend through secure communication and that the control plane manages the backend. Its security page says data displayed in the UI moves through an encrypted tunnel and is not persisted on Groundcover's side.

This is different from uploading the observability database to a vendor SaaS account. It is still an external communication path that belongs in the threat model and data-flow diagram.

## Understand movement between customer VPCs

Groundcover's high-availability documentation describes two ingestion paths for managed BYOC:

- logs, traces, and events can move through customer-provisioned object storage
- metrics are shipped over the network

If the monitored cluster, object store, and backend are in different accounts, projects, regions, or VPCs, the data crosses those boundaries. Whether it uses public endpoints, private endpoints, peering, a transit network, or provider backbone depends on your deployment.

For every hop, record:

```text
source -> destination -> data category -> protocol -> identity
       -> encryption -> route -> storage -> retention
```

The claim you may be able to support is "observability records remain in customer-controlled storage in approved regions." That is more precise than "the data never leaves the VPC."

## Include control-plane access

Groundcover's BYOC page says its control plane uses cloud-provider federation with specific roles and permissions to manage the dedicated backend account. It also documents security principles intended to prevent routes from the BYOC environment toward production workloads and to restrict public access.

Review the deployed cloud resources rather than relying only on an architecture diagram:

- federated role or service-account permissions
- trust policy and external identity
- VPC routes and security groups or firewall rules
- Kubernetes API exposure and source restrictions
- load balancers and ingress endpoints
- object-storage bucket policies
- encryption keys and key administrators
- audit logs for management actions

Management access to the isolated BYOC account is not the same as access to production workloads, but the isolation depends on the actual IAM and network configuration.

## Account for the portal and UI

Groundcover's Kubernetes requirements state that the `portal` pod sends HTTPS requests to `app.groundcover.com` on port 443. The documentation describes an on-demand, encrypted data path that avoids opening an inbound ingress to the monitored cluster.

The FAQ further says the SaaS UI stores account and user-access information plus general Kubernetes governance metadata, with examples such as cluster name and node count. It also says Groundcover collects anonymized deployment telemetry, which can be opted out, including component resource-consumption metrics and logs from Groundcover components.

These are exceptions to a blanket "nothing leaves" statement:

- authentication and account metadata reach external services
- governance metadata is stored for the SaaS experience
- deployment telemetry can be sent unless opted out
- data returned to an authorized browser traverses the UI path

Groundcover states that collected observability data is not persisted on its side. Validate the distinction among transient query results, stored governance metadata, and management telemetry in your contract and technical test.

## Compare deployment modes

| Mode | Data backend | Frontend and authentication | External control |
| --- | --- | --- | --- |
| BYOC | Customer cloud environment | External frontend and SSO | Managed control plane |
| on-premises | Customer environment | Frontend local, authentication external | Customer operates backend |
| air-gapped | Customer environment | Local | None documented |

Groundcover's architecture page is the source for these current distinctions. Product packaging and features can change, so date the review and identify the exact deployment mode in the order form and installed configuration.

The on-premises mode still has a documented external authentication path. Air-gapped is the mode whose current architecture diagram lists no external-cloud component. Do not describe BYOC as air-gapped.

## Build an evidence-based egress inventory

Use cloud flow logs, DNS logs, firewall logs, proxy logs, object-store audit logs, and Kubernetes network observations to verify documented flows. During a controlled test:

1. Start with default-deny egress in a non-production environment.
2. Allow only documented destinations and private customer services.
3. Exercise log, metric, trace, event, dashboard, login, alerting, upgrade, and support workflows.
4. Record every denied or unexpected destination.
5. Confirm whether telemetry opt-out changes outbound flow.
6. Verify UI data is not written to unexpected vendor-controlled storage.
7. Repeat after a version or architecture change.

Do not infer that a destination carries payloads merely because a connection exists. Capture data categories through documentation, packet metadata, application logs, and vendor confirmation without exposing production secrets.

## Ask questions the diagrams do not answer

Obtain written answers for:

- exact domains, IP ranges, ports, and certificate behavior
- regions used by frontend, authentication, and control services
- stored SaaS metadata fields and retention
- deployment-telemetry fields, defaults, and opt-out mechanism
- whether support access can query customer data and how it is approved and audited
- subprocessors involved in authentication or management
- encryption-key ownership and rotation
- deletion behavior for databases, object storage, backups, and SaaS metadata
- changes during incident response or remote troubleshooting

These questions are not evidence that an undocumented path exists. They close gaps before making a compliance claim.

## Write the conclusion narrowly

A defensible conclusion might read:

> Logs, metrics, traces, and events are stored in customer-controlled services in the approved environment. They move from monitored clusters to the dedicated backend through the documented customer network and object-storage paths. BYOC also uses external frontend, SSO, managed-control-plane, governance-metadata, and optional deployment-telemetry paths. Air-gapped has a different external-connectivity profile.

That statement is longer than "data never leaves," but it gives Security, Privacy, and Network teams something they can verify.

## Official documentation

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover BYOC architecture](https://docs.groundcover.com/architecture/byoc)
- [Groundcover BYOC high availability](https://docs.groundcover.com/architecture/byoc/high-availability)
- [Groundcover security considerations](https://docs.groundcover.com/architecture/security-considerations)
- [Groundcover Kubernetes requirements](https://docs.groundcover.com/getting-started/requirements/kubernetes-requirements)
- [Groundcover FAQ](https://docs.groundcover.com/welcome/faq)
