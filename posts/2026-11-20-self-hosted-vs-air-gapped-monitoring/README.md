# Self-Hosted vs. Air-Gapped Monitoring: What Is the Difference?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Air-Gapped, Monitoring, Observability

Description: Learn why self-hosted monitoring can still depend on internet services, and assess registry, login, certificate, and alert dependencies before isolation.

You move monitoring into your own data center. Metrics stay in a local database, dashboards use an internal hostname, and your team controls upgrades. Then internet access disappears. Existing graphs still work, but a new administrator cannot sign in, a replacement node cannot start, and alerts never reach the on-call channel.

The monitoring is self-hosted. Its operation still depends on services outside the network.

Self-hosting and air-gapping describe different properties. Understanding that distinction helps you decide what must change before isolation, including dependencies that remain invisible during normal operation. The examples below are assessment scenarios based on official documentation, not results from a tested deployment.

## Hosting Location and Connectivity Are Separate Decisions

Self-hosted monitoring means your organization operates the monitoring software on infrastructure it controls. That infrastructure might be in a data center, a private cloud, or rented virtual machines. The term alone says nothing about outbound connections, authentication, software distribution, or notification delivery.

An air gap describes separation between systems. The [NIST glossary entry](https://csrc.nist.gov/glossary/term/air_gap) describes an interface without a physical connection, where transfers occur manually under human control rather than through automated logical connections.

Product documentation sometimes uses “air-gapped” more broadly for installations without internet access. State your actual boundary instead of relying on the label. A firewall that denies internet traffic can create an isolated operating environment, but it does not by itself establish the physical separation in that definition.

A self-hosted system can be designed to function inside an air gap. Merely installing it locally does not accomplish that. Equally, local data retention does not establish network independence: an external login service can be essential even when no telemetry is exported to it.

## Recognize the Boundary You Actually Have

Consider four common deployment scenarios:

| Scenario | What is inside | What still crosses the boundary | Accurate description |
| --- | --- | --- | --- |
| Monitoring on private virtual machines | Collection, storage, dashboards | Public image downloads, cloud sign-in, paging API calls | Self-hosted with external dependencies |
| Private subnet with an outbound proxy | Application services and database | Approved requests through the proxy | Self-hosted with restricted egress |
| Environment disconnected between maintenance windows | Runtime services and local operator access | Temporary network connections for updates | Intermittently connected; assess each operating phase |
| Physically separated environment with controlled media transfer | Runtime, identity, software repository, local alert delivery | Human-controlled import or export of approved files | Air-gapped at the stated interface |

A private subnet without inbound internet access may still use outbound connectivity. Similarly, an internal relay that forwards alerts to a public service preserves an external dependency. Adding a gateway changes where the connection occurs, not whether the overall workflow crosses the boundary.

Draw the boundary around operator workstations and supporting services as well as servers. A dashboard accessed through an internet-connected laptop can conceal browser-side dependencies that an isolated workstation cannot satisfy.

## Map Dependencies by When They Become Necessary

A network diagram should show more than ingestion and storage. Build a dependency register that includes startup, user access, renewal, and recovery.

| Dependency | Typical external connection | When its absence becomes visible | Migration question |
| --- | --- | --- | --- |
| Images and packages | Registry, package repository, plugin catalog | New node, update, disaster recovery | Can every required artifact be supplied internally? |
| Identity | Authorization, token, user-information endpoints | Fresh login, session renewal, account recovery | Can authentication and user administration complete locally? |
| Certificates | Public certificate authority and DNS provider API | Issuance or renewal | Who issues, renews, and distributes trusted certificates? |
| Notifications | Hosted messaging, SMS, or paging service | First actionable incident | Can an operator receive and acknowledge alerts within the boundary? |
| Supporting services | External DNS, time, secrets, backup storage | Restart, credential rotation, restore | Which apparently local services have upstream dependencies? |

For each row, name the caller, destination, data exchanged, owner, and consequence of failure. Distinguish an optional update check from a required token exchange. Both may appear in denied-traffic logs, but their operational consequences differ substantially.

## Public Registries Remain Dependencies After Installation

An existing container can keep running after its source registry becomes unreachable. That says little about the ability to replace it.

Kubernetes documents that `IfNotPresent` uses a local image when available, while `Never` fails if the required image is absent. With `Always`, startup normally includes registry resolution even when image layers are cached. These behaviors explain why one node can start a workload while a fresh node fails. See the [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/).

Pinning an image digest identifies its content; it does not move that content inside your network. Assess images used by initialization containers, migration jobs, operators, and recovery utilities alongside the monitoring application itself.

An internal registry is useful only if it contains the required artifacts and can operate without an upstream service. Check whether a registry described as a mirror downloads missing content on demand. Also identify where its own installation artifacts and recovery credentials live. A public dependency hidden behind an internal hostname remains a migration task.

## Local Dashboards Can Still Require External Identity

Authentication involves more than opening the dashboard URL. For example, Grafana's [Generic OAuth configuration](https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/) specifies authorization and token endpoints, with a user-information endpoint available according to the provider configuration. Those destinations can belong to a hosted provider even when Grafana runs locally.

Inventory browser redirects separately from server-side requests. An operator's browser may reach the provider while the monitoring server cannot exchange the resulting authorization code. An existing session may also continue working temporarily and obscure the broken login path.

Moving identity inside the boundary requires reviewing its own dependencies: federation, account provisioning, multifactor authentication, password recovery, and signing-key distribution. An internal identity service that delegates authentication to a cloud provider has not removed that dependency.

Define a local administrative recovery route consistent with your access policy. It should be available when the normal identity service fails, with ownership and auditing established before isolation.

## Private HTTPS Does Not Mean Offline Certificate Renewal

A currently valid certificate can make an installation appear independent until renewal is due.

Let's Encrypt's HTTP-01 validation retrieves a challenge from a web endpoint. DNS-01 instead validates a DNS TXT record and can issue certificates for domain names whose web servers are not publicly reachable. Therefore, a private website can use a publicly issued certificate. The [challenge documentation](https://letsencrypt.org/docs/challenge-types/) explains this distinction.

DNS-01 does not make public issuance an offline process. The issuance workflow still needs communication with the certificate authority and publication of the required DNS record. Moving that workflow to a connected machine changes the location of the dependency.

For a separated environment, assess an internal certificate authority or an approved external issuance and manual certificate-transfer procedure. Record renewal lead time, trust distribution, and private-key handling. If policy requires fully internal renewal, an imported public certificate alone does not meet it.

## Local Alert Evaluation Does Not Guarantee Local Response

An alert may fire correctly in a local database while notification delivery fails completely. Slack's [incoming-webhook documentation](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) describes sending an HTTP POST to its hosted webhook URL. Hosting the alert evaluator yourself does not relocate that destination.

An internal email server or webhook receiver can provide a local route when supported. For example, [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/) includes SMTP and webhook destinations. Follow that route all the way to the operator: a local mail relay forwarding to an external mailbox still depends on connectivity beyond the boundary.

Also establish where acknowledgment occurs. A message visible on an internal console is insufficient if acknowledging or escalating the incident requires a cloud application. If responders work outside the isolated environment, resolve that operating-model constraint explicitly rather than assuming an integration will bridge it.

## Assess Migration as a Set of Dependency Changes

Start with the current deployment, not a replacement product shortlist. Mark each dependency as internal, external and required, external and optional, or unresolved. Assign one action: retain, replace locally, remove, or supply through a controlled transfer.

For each required replacement, record the responsible team, prerequisite services, and evidence needed for acceptance. Converting cloud sign-in to internal identity may require account provisioning before the monitoring configuration changes. Replacing a public paging service may require staffing a local response channel, not just updating a URL.

Prioritize by the earliest event that exposes the dependency. Fresh login and alert delivery affect immediate use; certificate expiration and empty-node recovery may expose failures later. Give those delayed events explicit review dates rather than accepting a day of healthy dashboards as proof of independence.

Finish with a boundary statement that another team can verify: which systems are separated, which transfers remain, and how installation, access, renewal, and response will function. A successful migration removes required external connections from the intended workflow and assigns owners to the local services that replace them.
