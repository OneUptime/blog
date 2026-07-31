# Validation Summary: Why “Human Error” Is Not a Root Cause—and What to Investigate Instead

## Status
validated

## Post Type
Technical guide / incident-management opinion piece

## Technologies Covered
- Site Reliability Engineering (SRE)
- Incident management and root cause analysis
- Five Whys analysis
- Human factors in incident investigation
- Blameless postmortems
- Operational safety controls, including input validation, scoped rollouts, canary deployments, alerting, and automated rollback

## Sources Consulted
- AWS, "Why you should develop a correction of error (COE)": https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/
- OSHA, "Incident Investigation": https://www.osha.gov/incident-investigation
- OSHA, "Hazard Identification and Assessment": https://www.osha.gov/safety-management/hazard-identification
- UK Health and Safety Executive, "Human factors in accident investigations": https://www.hse.gov.uk/humanfactors/assets/docs/core2.pdf
- Google SRE, "Postmortem Culture: Learning from Failure": https://sre.google/sre-book/postmortem-culture/
- Google SRE Workbook, "Canarying Releases": https://sre.google/workbook/canarying-releases/
- Google SRE, "Reliable Product Launches at Scale": https://sre.google/sre-book/reliable-product-launches/
- NIOSH, "Hierarchy of Controls": https://www.cdc.gov/niosh/hierarchy-of-controls/index.html

## Issues Found
No technical issues found.

## Review Notes
- The post contains no executable code, terminal commands, or concrete configuration syntax. Its fenced `text` block is an illustrative causal-analysis example, so no syntax or runtime testing was applicable.
- The claim about AWS guidance is accurate: AWS advises investigators to ask why a human error was possible and identifies missing checking or fail-safe mechanisms as a likely deeper cause.
- The OSHA and HSE guidance supports looking beyond immediate actions to equipment and system design, procedures, training, work pressures, resources, organizational conditions, barriers, and other contributing factors.
- The description of Google's blameless-postmortem position accurately reflects its guidance to assume good intent and evaluate decisions using the information available at the time.
- The recommended canary, gradual-rollout, monitoring, and rollback controls are consistent with Google SRE guidance, while preferring engineered controls over training alone is consistent with the NIOSH hierarchy of controls.
- All links in the post were reachable and resolved to the intended authoritative resources at the time of review. No version-specific or deprecated API claims were present.
