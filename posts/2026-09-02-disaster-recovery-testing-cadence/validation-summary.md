# Validation Summary: How Often Should You Run Restore Tests, Tabletop Exercises, and Full Failover Drills?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Disaster recovery and business continuity testing
- Backup monitoring and automated restore validation
- Recovery time objective (RTO) and recovery point objective (RPO)
- Runbook walkthroughs, tabletop exercises, game days, failover, and failback
- Azure Site Recovery
- AWS Elastic Disaster Recovery and the AWS Well-Architected Framework
- NIST SP 800-53 contingency-planning controls
- CISA Cybersecurity Tabletop Exercise Packages (CTEPs)
- YAML evidence records

## Sources Consulted

- NIST SP 800-53 Rev. 5, Security and Privacy Controls for Information Systems and Organizations: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- NIST SP 800-53 Rev. 5 OSCAL control catalog, including CP-4 Contingency Plan Testing: https://github.com/usnistgov/oscal-content/blob/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json
- NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final
- NIST SP 800-84, Guide to Test, Training, and Exercise Programs for IT Plans and Capabilities: https://csrc.nist.gov/pubs/sp/800/84/final
- CISA CTEP Package Documents: https://www.cisa.gov/resources-tools/resources/ctep-package-documents
- CISA CTEP Exercise Planner Handbook: https://www.cisa.gov/sites/default/files/2023-01/2_-_ctep_exercise_planner_handbook_2021_final_508.pdf
- Azure Site Recovery, About recovery plans: https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview
- Azure Site Recovery dashboard and built-in alerts: https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-monitor-and-troubleshoot
- AWS Elastic Disaster Recovery, Best practices for Elastic Disaster Recovery: https://docs.aws.amazon.com/drs/latest/userguide/best_practices_drs.html
- AWS Well-Architected Framework, REL13-BP03 Test disaster recovery implementation: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found

- The CISA sentence described all planner, facilitator, feedback, and after-action resources as templates. CISA identifies the planner and facilitator/evaluator resources as handbooks, the feedback resources as forms/templates, and the after-action resource as an After-Action Report/Improvement Plan template. Updated the sentence to use those resource types accurately.
- The first Azure cadence statement referred to testing each “application plan.” Microsoft’s guidance specifically says to run a test failover for each app every quarter so recovery plans remain current. Updated the statement to match that action and terminology, and made the following six-month statement explicitly Azure Site Recovery-specific.
- The detection-interval statement could be read as applying to every latent recovery failure, even when a recurring test does not cover the affected recovery point, component, or failure mode. Scoped the statement to failures that the recurring test is capable of detecting.
- The acceptance criteria required failover and failback for every recovery strategy. Some strategies do not use those transitions, so the criterion now applies where the recovery strategy includes them.

## Review Notes

The cadence table is clearly labeled as a planning baseline rather than an industry standard. The cited quarterly Azure application test-failover guidance, six-month Azure replicated-machine guidance, AWS recommendation to drill at least several times per year and include failback testing, and NIST CP-4 organization-defined frequency were all confirmed. All external links in the post returned HTTP 200, and the illustrative YAML record is syntactically valid. Its field names are intentionally user-defined rather than part of a vendor schema. NIST’s publication page now notes SP 800-53 Release 5.2.0; the CP-4 frequency requirement remains organization-defined.
