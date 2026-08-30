# Validation Summary: How to Chain Rundeck Jobs and Pass Options and Data Between Job Reference Steps

## Status
validated

## Post Type
Technical tutorial and orchestration guide

## Technologies Covered
- Rundeck / PagerDuty Runbook Automation
- Rundeck Job References
- Rundeck job options, including Secure and Secure Remote Authentication options
- Rundeck Key Value Data log filters
- Rundeck data-variable scopes and Global Variable workflow steps
- Rundeck workflow failure handling and job retry settings
- Rundeck Enterprise Runners and cross-project job references
- Bash `printf`

## Sources Consulted
- [Built-in Node Steps: Job Reference](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html#job-reference-step) - verified Job Reference option arguments, missing-option defaults, Node-Step mode, node-filter overrides, cross-project references, and automatic/manual Runner selection.
- [JOB-JSON: Job Reference Entry](https://docs.rundeck.com/docs/manual/document-format-reference/job-json-v44.html#job-reference-entry) - verified that Job References use Workflow-Step behavior by default and that `nodeStep: true` executes the reference once per matched parent node.
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html) - verified required options, allowed-value enforcement, regular-expression validation, and same-type mappings for Plain, Secure, and Secure Remote Authentication options.
- [Rundeck CLI: Running a Job with Options](https://docs.rundeck.com/docs/learning/howto/learn-rd-cli.html#first-steps-with-rd-cli) - verified the `-- -option_name option_value` job-option argument form used by `rd run`.
- [Key-Value Data Log Filter](https://docs.rundeck.com/docs/manual/log-filters/key-value-data.html) - verified the default `RUNDECK:DATA` regular expression and key/value capture behavior.
- [Rundeck Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html) - verified Global and Node Scope behavior; `${data.name}`, `${data.name@node}`, and `${data.name*}` syntax; comma-delimited collection; and export-group variables.
- [Built-in Workflow Steps: Global Variable](https://docs.rundeck.com/docs/manual/jobs/job-plugins/workflow-steps/builtin.html#global-variable) - verified promotion of node-scoped data and passing `${export.name}` from a referenced child job to later parent steps.
- [Rundeck Job Step Plugins](https://docs.rundeck.com/docs/manual/jobs/job-plugins/) - verified that Workflow Steps run once and capture Global Scope data while Node Steps run per matched node and capture Node Scope data.
- [Rundeck Job Workflows](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html#workflow-control-settings) - verified default stop-on-failure behavior, the run-remaining-steps alternative, and recovering error-handler semantics.
- [Creating Jobs: Retry](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#retry) - verified that a referenced job's Retry setting is not honored when the job is invoked through a Job Reference.
- [Rundeck Enterprise Runner](https://docs.rundeck.com/docs/administration/runner/) - verified that Enterprise Runners are available in PagerDuty Runbook Automation commercial products.
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html) - verified that job, project, and node access is authorization-controlled.
- [GNU Bash Reference Manual: `printf`](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-printf) - verified the shell command's format-string and `%s` argument behavior.

## Issues Found
1. **Incomplete enforced-option setup** - The parent `environment` option was described as enforced without specifying allowed values or making the value required. Clarified that it needs an allowed environment list, **Enforced from values**, and a required non-blank value.
2. **Overstated failure behavior** - The post called all Job References synchronous workflow steps and implied a failed child could never be followed by later parent steps. Clarified the Workflow-Step case and documented that Rundeck's default **Stop at the failed step** behavior stops the pipeline, while **Run remaining steps before failing** or a recovering error handler can permit later references to run.
3. **Ambiguous validation mechanism** - The advice to add a "precondition" did not identify a generally available Rundeck mechanism and could be confused with version- and edition-specific conditional features. Replaced it with the standard **Match Regular Expression** restriction on the required child option.
4. **Retry placement was imprecise** - A job-level Retry is also ignored if that nominal parent is itself invoked as a Job Reference. Clarified that job-level Retry belongs on the directly invoked top-level orchestration job, while operation-specific retry can be placed around the unstable operation.
5. **Runner availability was unstated** - The cross-project Runner paragraph could imply that Runner selection is part of every Rundeck edition. Qualified the behavior as Enterprise Runner functionality available in Runbook Automation commercial products.

## Review Notes
- The option argument examples, required-option default behavior, and same-type secure-option mappings match the current official documentation.
- The Key Value Data output, default capture pattern, scope-qualified variable references, comma-delimited multi-node collection, Global Variable `export` group, and `${export.release_id}` parent references are correct.
- Rundeck documents the default delimiter for `${data.name*}` but does not promise a collection ordering contract. The post appropriately advises using one authoritative producer for an artifact release ID.
- All five documentation links already present in the post resolve to the intended current Rundeck pages.
