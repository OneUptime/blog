# Validation Summary: Five Whys or Causal Tree? Choosing a Better Analysis for Complex Incidents

## Status

not-code-blog

## Post Type

Operational guide

## Technologies Covered

- Site Reliability Engineering (SRE)
- Incident management and post-incident analysis
- Root cause analysis
- Five Whys
- Event and Causal Factor Trees
- Fault tree analysis
- Barrier and control analysis

## Sources Consulted

- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [NASA NPR 8621.1D, Appendix A: Terms and Definitions](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8621_001D_&page_name=AppendixA)
- [NASA NPR 8621.1D, Chapter 5: Mishap Investigation Report](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8621_001D_&page_name=Chapter5)
- [NASA NPR 8621.1B, Chapter 5: Mishap Investigation Process (obsolete historical version)](https://nodis3.gsfc.nasa.gov/displayCA.cfm?Internal_ID=N_PR_8621_001B_&page_name=Chapter5)
- [NASA: Mishap Investigation and Root Cause Analysis Training](https://sma.nasa.gov/sma-disciplines/mishap-investigation)
- [OSHA: Hazard Identification and Assessment](https://www.osha.gov/safety-management/hazard-identification)

## Issues Found

No technical issues found.

## Review Notes

- The post contains no executable code, terminal commands, software configuration, API usage, or version-specific implementation details. Its fenced `text` blocks are illustrative causal-analysis diagrams, so it is classified as `not-code-blog`.
- AWS accurately describes Five Whys as a consistent, blame-free technique, states that an analysis may require more than five questions, and recommends continuing past an answer of “human error.”
- Current NASA NPR 8621.1D defines an Event and Causal Factor Tree in terms of the logical sequence of events, conditions, failed barriers, and root causes. It defines fault tree analysis as finding all credible ways an undesired event can occur. NASA's current mishap-investigation material also covers events, conditions, barriers, controls, timelines, and Event and Causal Factor Trees.
- The linked NPR 8621.1B chapter is an obsolete historical version, but it remains available at the cited URL and directly states the post's potential-causes-versus-observed-events distinction. The current NPR 8621.1D definitions support the same distinction and are also linked by the post.
- OSHA guidance explicitly says incident investigations should not stop at a single triggering factor or when a worker error is identified, and that investigations often find more than one root cause.
