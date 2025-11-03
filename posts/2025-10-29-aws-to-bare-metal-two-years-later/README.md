# AWS to Bare Metal Two Years Later: Answering Your Toughest Questions About Leaving AWS

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: AWS, Cloud, Infrastructure, Cost Optimization

Description: Two years after our AWS-to-bare-metal migration, we revisit the numbers, share what changed, and address the biggest questions from Hacker News and Reddit.

When we published [How moving from AWS to Bare-Metal saved us $230,000 /yr.](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view) in 2023, the story travelled far beyond our usual readership. The discussion threads on [Hacker News](https://news.ycombinator.com/item?id=38294569) and [Reddit](https://www.reddit.com/r/sysadmin/comments/17y6zbi/moving_from_aws_to_baremetal_saved_us_230000_yr/) were packed with sharp questions: did we skip Reserved Instances, how do we fail over a single rack, what about the people cost, and when is cloud still the better answer? This follow-up is our long-form reply.

Over the last twenty-four months we:

- Ran the MicroK8s + Ceph stack in production for 730+ days with 99.993% measured availability.
- Added a second rack in Frankfurt, joined to our primary Paris cage over redundant DWDM, to kill the “single rack” concern.
- Cut average customer-facing latency by 19% thanks to local NVMe and eliminating noisy neighbours.
- Reinvested the savings into buying bare metal AI servers to expand LLM-based alert / incident summarisation and auto code fixes based on log / traces and metrics in OneUptime. 

Below we tackle the recurring themes from the community feedback, complete with the numbers we use internally.

## $230,000 / yr savings? That is just an engineers salary. 

In the US, it is. In the rest of the world. That's 2-5x engineers salary. We *used* to save $230,000 / yr but now the savings have exponentially grown. We now save over $1.2M / yr and we expect this to grow, as we grow as a business.

## “Why not just buy Savings Plans or Reserved Instances?”

We tried. Long answer: the maths still favoured bare metal once we priced everything in. We see a savings of over 76% if you compare our bare metal setup to AWS. 

A few clarifications:

- Savings Plans **do not** reduce S3, egress, or Direct Connect. 37% off instances still leaves you paying list price for bandwidth, which was 22% of our AWS bill.
- EKS had an extra $1,260/month control-plane fee plus $600/month for NAT gateways. Those costs disappear once you run Kubernetes yourself.
- Our workload is 24/7 steady. We were already at >90% reservation coverage; there was no idle burst capacity to “right size” away. If we had the kind of bursty compute profile many commenters referenced, the choice would be different.

## “How much did migration and ongoing ops really cost?”

We spent a week of engineers time (and that is the worst case estimate) on the initial migration, spread across SRE, platform, and database owners. Most of that time was work we needed anyway- formalising infrastructure-as-code, smoke testing charts, tightening backup policies. The incremental work that existed purely *because* of bare metal was roughly one week.

Ongoing run-cost looks like this:

- **Hands-on keyboard:** ~24 engineer-hours/quarter across the entire platform team, including routine patching and firmware updates. That is comparable to the AWS time we used to burn on cost optimisation, IAM policy churn, and chasing deprecations and updating our VM's on AWS. 
- **Remote hands:** 2 interventions in 24 months (mainly disks). Mean response time: 27 minutes. We do not staff an on-site team. We rely on co-location provider to physically manage our rack. This means no traditional hardware admins. 
- **Automation:** We're now moving to Talos. We PXE boot with Tinkerbell, image with Talos, manage configs through Flux and Terraform, and run conformance suites before each Kubernetes upgrade. All of those tools also hardened our AWS estate, so they were not net-new effort.

The opportunity cost question from is fair. We track it the same way we track feature velocity: did the infra team ship less? The answer was “no”- our release cadence increased because we reclaimed few hours/month we used to spend in AWS “cost council” meetings.

## “Isn’t a single rack a single point of failure?”

We have multiple racks across two different DC / providers. We:

- Leased a secondary quarter rack in Frankfurt with a different provider and power utility.
- Currently: Deployed a second MicroK8s control plane, mirrored Ceph pools with asynchronous replication. Future: We're moving to Talos. Nothing against Microk8s, but we like the Talos way of managing the k8s cluster.
- Added isolated out-of-band management paths (4G / satellite) so we can reach the gear even during metro fibre events.

The AWS failover cluster we mentioned in 2023 still exists. We rehearse a full cutover quarterly using the same Helm releases we ship to customers. DNS failover remains the slowest leg (resolver caches can ignore TTL), so we added Anycast ingress via BGP with our transit provider to cut traffic shifting to sub-minute.

## “What about hardware lifecycle and surprise CapEx?”

We amortise servers over five years, but we sized them with 2 × AMD EPYC 9654 CPUs, 1 TB RAM, and NVMe sleds. At our current growth rate the boxes will hit CPU saturation before we hit year five. When that happens, the plan is to cascade the older gear into our regional analytics cluster (we use Posthog + Metabase for this) and buy a new batch. Thanks to the savings delta, we can refresh 40% of the fleet every 24 months and still spend less annually than the optimised AWS bill above.

We also buy extended warranties from the OEM (Supermicro) and keep three cold spares in the cage. The hardware lasts 7-8 years and not 5, but we wtill count it as 5 to be very conservative. 

## “Are you reinventing managed services?”

Another strong Reddit critique: why rebuild services AWS already offers? Three reasons we are comfortable with the trade:

1. **Portability is part of our product promise.** OneUptime customers self-host in their own environments. Running the same open stack we ship (Postgres, Redis, ClickHouse, etc.) keeps us honest. We eun on Kubernetes and self-hosted customers run on Kubernetes as well. 
2. **Tooling maturity.** Two years ago we relied on Terraform + EKS + RDS. Today we run MicroK8s (Talos in the future), Argo Rollouts, OpenTelemetry Collector, and Ceph dashboards. None of that is bespoke. We do not maintain a fork of anything.
3. **Selective cloud use.** We still pay AWS for Glacier backups, CloudFront for edge caching, and short-lived burst capacity for load tests. Cloud makes sense when elasticity matters; bare metal wins when baseload dominates.

Managed services are phenomenal when you are short on expertise or need features beyond commodity compute. If we were all-in on DynamoDB streams or Step Functions we would almost certainly still be on AWS.

## “How do bandwidth and DoS scenarios work now?”

We committed to 5 Gbps 95th percentile across two carriers.  The same traffic on AWS egress would be 8x expensive in eu-west-1. For DDoS protection we front our ingress with Cloudflare. 

## “Has reliability suffered?”

Short answer: No. Infact it was better than AWS (compared to recent AWS downtimes)

We have 730+ days with 99.993% measured availability and we also escaped AWS region wide downtime that happened a week ago. 

## “How do audits and compliance work off-cloud now?”

We stayed SOC 2 Type II and ISO 27001 certified through the transition. The biggest deltas auditors cared about:

- Physical controls: We provide badge logs from the colo, camera footage on request, and quarterly access reviews. The colo already meets Tier III redundancy, so their reports roll into ours.
- Change management: Terraform plans, and now Talos machine configs give us immutable evidence of change. Auditors liked that more than AWS Console screenshots.
- Business continuity: We prove failover by moving workload to other DC.

If you are in a regulated space (HIPAA for instance), expect the paperwork to grow a little. We worked it in by leaning on the colo providers’ standard compliance packets- they slotted straight into our risk register.

## “Why not stay in the cloud but switch providers?”

We priced Hetzner, OVH, Leaseweb, Equinix Metal, and AWS Outposts. The short version:

- Hyperscaler alternatives were cheaper on compute but still expensive on egress once you hit petabytes/month. Outposts also carried minimum commits that exceeded our needs.
- European dedicated hosts (Hetzner, OVH) are fantastic for lab clusters. The challenge was multi-100 TB Ceph clusters with redundant uplinks and smart-hands SLAs. Once we priced that tier, the savings narrowed.
- Equinix Metal got the closest, but bare metal on-demand still carried a 25-30% premium over our CapEx plan. Their global footprint is tempting; we may still use them for short-lived expansion.

Owning the hardware also let us plan power density (we run 15 kW racks) and reuse components. For our steady-state footprint, colocation won by a long shot.

## “What does day-to-day toil look like now?”

We put real numbers to it because Reddit kept us honest:

- Weekly: Kernel and firmware patches (Talos makes this a redeploy), Ceph health checks,  Total time averages 1 hour/week on average over months. 
- Monthly: Kubernetes control plane upgrades in canary fashion. About 2 engineer-hours. We expect this to reduce when Talos kicks in.
- Quarterly: Disaster recovery drills, capacity planning, and contract audits with carriers. Roughly 12 hours across three engineers.

Total toil is ~14 engineer-hours/month, including prep. The AWS era had us spending similar time but on different work: chasing cost anomalies, expanding Security Hub exceptions, and mapping breaking changes in managed services. The toil moved; it did not multiply.

## “Do you still use the cloud for anything substantial?”

Absolutely. Cloud still solves problems we would rather not own:

- Glacier keeps long-term log archives at a price point local object storage cannot match.
- CloudFront handles 14 edge PoPs we do not want to build. We terminate TLS at the edge for marketing assets and docs. We will soon move this to Cloudflare as they are cheaper.
- We spin up short-lived AWS environments for load testing. 

So yes, we left AWS for the base workload, but we still swipe the corporate card when elasticity or geography outweighs fixed-cost savings.

## When the cloud is still the right answer

**It depends on your workload**. We still recommend staying put if:

- Your usage pattern is spiky or seasonal and you can auto-scale to near zero between peaks.
- You lean heavily on managed services (Aurora Serverless, Kinesis, Step Functions) where the operational load is the value prop.
- You do not have the appetite to build a platform team comfortable with Kubernetes, Ceph, observability, and incident response.

Cloud-first was the right call for our first five years. Bare metal became the right call once our compute footprint, data gravity, and independence requirements stabilised.

## What is next

- We are working on a detailed runbook + Terraform module to help teams do *capex forecasting* for colo moves. Expect that on the blog later this year.
- A deep dive on Talos is in the queue, as requested by multiple folks in the HN thread.

Questions we did not cover? Let us know in the discussion threads- we are happy to keep sharing the gritty details.

**Related Reading:**

- [How moving from AWS to Bare-Metal saved us $230,000 /yr.](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view)
- [Datadog Dollars: Why Your Monitoring Bill Is Breaking the Bank](https://oneuptime.com/blog/post/2025-02-01-datadog-dollars-why-monitoring-is-breaking-the-bank/view)
- [Why build open-source DataDog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view)
