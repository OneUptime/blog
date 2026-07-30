# Validation Summary: Which Incidents Need a Postmortem? Setting Severity, Impact, and Near-Miss Triggers

## Status
not-code-blog

## Post Type
Guide / Incident-management policy guidance

## Technologies Covered
- Site reliability engineering (SRE) incident management
- Blameless postmortems and post-incident reviews
- Incident severity, service-level objectives (SLOs), and impact thresholds
- Near-miss assessment and specialist security, privacy, safety, and regulatory review processes

## Sources Consulted
- [Google SRE Book: Postmortem Culture—Learning from Failure](https://sre.google/sre-book/postmortem-culture/)
- [Atlassian Incident Management Handbook: Postmortems](https://www.atlassian.com/incident-management/handbook/postmortems)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [CISA: Federal Government Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/sites/default/files/publications/Cybersecurity_Incident_Vulnerability_Response_Playbooks_508C.pdf)

## Issues Found
No technical issues found.

The post contains no executable code examples, terminal commands, configuration snippets, API usage, or version-specific implementation instructions. Its two fenced `text` blocks are an explicitly qualitative prioritization heuristic and a decision questionnaire, not executable code. Under the review criteria, the post therefore qualifies as `not-code-blog`, and no changes to `README.md` were required.

The article's directly attributed claims were consistent with the cited sources: Google lists user-visible impact, data loss, on-call intervention, long resolution time, and monitoring failure as common triggers and permits any stakeholder to request a postmortem; Atlassian states that it conducts postmortems for severity 1 and 2 incidents and treats other reviews as optional.

## Review Notes
- The numerical impact threshold and prioritization expression are clearly presented as organization-specific examples rather than universal standards or precise formulas.
- NIST SP 800-61 Rev. 3 is the current final revision cited by the post and was published in April 2025.
- The CISA playbooks are operational incident-response guidance rather than a source for a universal postmortem-trigger policy; their inclusion as supporting incident-response documentation is appropriate.
- The post is technically relevant policy guidance, but it is classified as `not-code-blog` because it contains no technical implementation details to validate.
