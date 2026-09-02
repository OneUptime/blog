# Validation Summary: How to Run a Full Disaster Recovery Drill Without Sending Restored Services to Production Dependencies

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Disaster recovery drills, recovery plans, RTO, and RPO
- Azure Site Recovery, Azure Virtual Network, Active Directory, and DNS
- AWS Elastic Disaster Recovery, Amazon VPC, Route 53 Resolver, AWS PrivateLink, and IAM
- Network, DNS, identity, application, and data containment
- Database and object-storage restoration
- Email, SMS, payment, and webhook sinks or sandboxes
- Kubernetes node identity and cloud workload credentials
- YAML 1.2 and language-neutral safety pseudocode

## Sources Consulted

- [Azure Site Recovery: Run a test failover](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure)
- [Azure Site Recovery: Set up disaster recovery for Active Directory and DNS](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-active-directory)
- [Azure: What is a private endpoint?](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview)
- [Azure: Virtual Network service endpoints](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview)
- [AWS Elastic Disaster Recovery: Drill planning](https://docs.aws.amazon.com/guidance/latest/deploying-cross-region-disaster-recovery-with-aws-elastic-disaster-recovery/drill-planning.html)
- [Amazon VPC: Security group rules](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)
- [Amazon VPC: Understanding Amazon DNS](https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html)
- [Amazon VPC: Control access with VPC endpoint policies](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [AWS IAM: Pass session tags in AWS STS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html)
- [AWS IAM: Test policies with the IAM policy simulator](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html)
- [AWS Well-Architected Framework: Disaster recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/disaster-recovery-dr-objectives.html)
- [CISA: CTEP Package Documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [NIST: Recovery Time Objective glossary entry](https://csrc.nist.gov/glossary/term/Recovery_Time_Objective)
- [NIST: Recovery Point Objective glossary entry](https://csrc.nist.gov/glossary/term/recovery_point_objective)
- [NIST SP 800-84: Guide to Test, Training, and Exercise Programs for IT Plans and Capabilities](https://csrc.nist.gov/pubs/sp/800/84/final)
- [RFC 3986: URI generic syntax, host component](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.2.2)
- [Kubernetes documentation: Nodes and node-name uniqueness](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found

- The webhook guard tested the suffix of the complete URL. A production URL with a path or query ending in `.drill.internal` could therefore pass. Changed the pseudocode to parse the URL, require HTTPS, and compare its hostname with an explicit drill-host allowlist, consistent with RFC 3986's separation of host from path and query.
- The credential guard intersected production credential fingerprints with apparently raw loaded secrets. Those different representations would not match. Changed it to fingerprint the loaded secrets before comparing the two sets.
- The negative identity check could be read as an instruction to attempt a real production object-store write. If the expected denial were missing, the preflight itself would mutate production. Renamed the illustrative check to `identity_policy_must_deny` and required non-mutating authorization analysis; any live probe must use a dedicated non-production canary. Continuous escape canaries are now explicitly non-mutating.
- The generic identity guidance said that credentials themselves were tagged. Tagging semantics vary across clouds; AWS, for example, attaches tags to STS sessions and principals. Changed the text to associate the exercise ID with the identity or session while retaining short-lived credentials.
- The post described RTO and RPO as measured results, but they are recovery objectives. Changed the drill step and acceptance criterion to measure achieved recovery duration and recovery point, then compare those results with the RTO and RPO.

## Review Notes

- The preflight snippet is valid YAML and was parsed successfully. Its field names form an illustrative controller-specific schema rather than a standard AWS, Azure, or Kubernetes configuration format.
- The application guard is intentionally language-neutral pseudocode; helper names such as `parse_url` and `fingerprints` must be implemented with the target language's vetted URL parser and secret-handling facilities.
- On AWS, security groups and network ACLs cannot filter traffic to AmazonProvidedDNS. An AWS implementation of the post's DNS boundary should enforce an approved resolver path with Route 53 Resolver DNS Firewall or a controlled custom resolver.
- All six external Markdown links in the post returned HTTP 200 and pointed to the intended resources during validation.
- No terminal commands, deprecated APIs, or version-specific claims appear in the post. NIST SP 800-184 remains a final publication.
