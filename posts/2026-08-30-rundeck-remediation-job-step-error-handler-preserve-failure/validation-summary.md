# Validation Summary: Rundeck Step Error Handlers: Preserve Failure After Remediation

## Status

validated

## Post Type

Technical guide and troubleshooting tutorial

## Technologies Covered

- Rundeck job workflows and error handlers
- Rundeck Workflow Steps and Node Steps
- Rundeck Job Reference steps
- Rundeck Job YAML v1.2
- Rundeck job options and context variables
- Rundeck Node First and Sequential workflow strategies
- Bash exit-status handling

## Sources Consulted

- [Rundeck Job Workflows: workflow control, step types, and error handlers](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html#error-handlers)
- [Rundeck Job Variables Reference: job, option, and error-handler context variables](https://docs.rundeck.com/docs/manual/jobs/job-variables.html#error-handler-context-variables)
- [Rundeck built-in Node Steps: Job Reference step and argument quoting](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html#job-reference-step)
- [Rundeck Job YAML v1.2: sequence, command, Job Reference, error-handler, and option definitions](https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html)
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck Creating Jobs: local execution and node failure behavior](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#node-dispatching-and-filtering)
- Local YAML parse check using Ruby's YAML parser and Bash syntax check using `bash -n`

## Issues Found

No technical issues found.

## Review Notes

- The error-handler status table and the interaction between `runRemainingOnFail` and `keepGoingOnSuccess` match the current Rundeck workflow documentation.
- The wrapper definition uses valid Job YAML v1.2 fields. Its folded Job Reference arguments produce a single argument string, and `keepgoing: true` allows the final failure-marker step to run after a failed remediation reference.
- Omitting `nodeStep` from the wrapper's Job Reference correctly leaves it as a Workflow Step; configuring a Job Reference as a Node Step would instead run it for each matched node.
- The listed `${job.execid}`, `${option.*}`, and `${result.*}` variables and the stated reason codes are present in the current variables reference.
- The inline script is valid Bash and exits with status 1. The post appropriately limits that example to a Linux server and explains that an equivalent local command is needed on other operating systems.
- The post is not tied to a specific Rundeck release. The review used the official documentation current on 2026-08-30.
