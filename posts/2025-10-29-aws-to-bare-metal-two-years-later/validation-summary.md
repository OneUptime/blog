# Validation Summary: AWS to Bare Metal Two Years Later: Answering Your Toughest Questions About

## Status
not-code-blog

## Post Type
Opinion piece / company update (a long-form follow-up retrospective answering community questions about a previously documented AWS-to-bare-metal migration).

## Technologies Covered
- AWS (EKS, RDS, S3, Glacier, CloudFront, Direct Connect, NAT Gateway, Savings Plans / Reserved Instances, Outposts)
- Kubernetes (MicroK8s, Talos)
- Ceph (distributed storage)
- Tinkerbell (PXE/bare-metal provisioning)
- Flux, Terraform, Argo Rollouts (GitOps / IaC / progressive delivery)
- OpenTelemetry Collector
- BGP / Anycast networking, DWDM
- Cloudflare (DDoS protection, edge)
- PostgreSQL, Redis, ClickHouse
- PostHog, Metabase
- Hardware: AMD EPYC 9654, Supermicro, NVMe
- Hosting/colocation comparisons: Hetzner, OVH, Leaseweb, Equinix Metal
- Compliance frameworks: SOC 2 Type II, ISO 27001, HIPAA

## Sources Consulted
None required for code validation — this post contains no code, commands, or configuration snippets to verify against documentation. General domain knowledge was used to sanity-check high-level claims.

## Issues Found
No technical issues found.

This post is a narrative, opinion/retrospective company update. It contains no code blocks, terminal commands, or configuration snippets that require validation against official documentation. The technical content consists of architectural descriptions, business/cost figures, and operational anecdotes that are internal to the company and not verifiable against external authoritative sources. Per the review guidelines, this qualifies as a "not-code-blog" post.

## Review Notes
- The post cites several internal cost and availability figures (e.g., 99.993% availability, ~$1.2M/yr savings, 76% savings vs. AWS, EKS "$1,260/month control-plane fee plus $600/month for NAT gateways"). These are company-internal numbers and aggregate estimates rather than published reference values, so they cannot be independently validated. Readers should note that base AWS EKS control-plane pricing is $0.10/hour (~$73/month) per cluster, so the quoted $1,260/month control-plane figure presumably reflects multiple clusters and/or bundled costs rather than a single-cluster list price — this is presentational, not a code/config error.
- All technology references (MicroK8s, Talos, Ceph, Tinkerbell, Flux, Argo Rollouts, OpenTelemetry, EPYC 9654, Supermicro, etc.) are real and used in contextually appropriate ways.
- There are minor typos in the prose ("we eun on Kubernetes", "we wtill count it", "8x expensive"), but these are editorial/stylistic and outside the scope of technical validation.
- No deprecated APIs or incorrect commands are present because the post contains none.
