# Validation Summary: How to Make an Improvement Stick: Ownership, Automation, Documentation, and Drift Checks

## Status

validated

## Post Type

Technical process guide

## Technologies Covered

- YAML
- GitHub CODEOWNERS
- GitHub protected branches
- GitHub Actions workflow triggers and schedules
- Terraform plans and HCP Terraform health assessments
- Prometheus alerting rules and alerting practices
- Google Site Reliability Engineering practices

## Sources Consulted

- [IHI — Sustaining Improvement](https://www.ihi.org/library/white-papers/sustaining-improvement)
- [IHI — Sustainability Planning Worksheet](https://www.ihi.org/library/tools/sustainability-planning-worksheet)
- [Google SRE Workbook — Postmortem Culture: Learning from Failure](https://sre.google/workbook/postmortem-culture/)
- [Google SRE Book — The Evolution of Automation at Google](https://sre.google/sre-book/automation-at-google/)
- [Google SRE Book — Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
- [Google SRE Workbook — Eliminating Toil](https://sre.google/workbook/eliminating-toil/)
- [GitHub Docs — About Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Docs — About Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs — Workflow Syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Docs — Events That Trigger Workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Terraform CLI — `terraform plan`](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [HCP Terraform — Health Assessments](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health)
- [HashiCorp Tutorials — Manage Resource Drift](https://developer.hashicorp.com/terraform/tutorials/cloud/drift-detection)
- [Prometheus — Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus — Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [GOV.UK Service Standard — Iterate and Improve Frequently](https://www.gov.uk/service-manual/service-standard/point-8-iterate-and-improve-frequently)

## Issues Found

- The post described all six Google SRE toil characteristics as an unconditional definition and omitted the production-service scope. It now states that toil is tied to running a production service and tends to have those characteristics, matching Google's qualification that not every toil task has every attribute.

## Review Notes

- The illustrative sustainability contract is valid YAML.
- The GitHub, HCP Terraform, Prometheus, IHI, Google SRE, and GOV.UK claims accurately reflect the cited official guidance after the toil wording correction.
- The referenced URLs resolve to their intended resources. The IHI white-paper page may reject some automated HTTP clients, but it is accessible through a browser and is not a broken link.
- No product versions are pinned in the post, and no deprecated APIs, commands, or configuration fields are used.
