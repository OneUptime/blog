# Validation Summary: Databricks Job Parameters, Task Parameters, and Widgets

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Databricks Lakeflow Jobs
- Databricks job parameters and task parameters
- Databricks notebooks and `dbutils.widgets`
- Declarative Automation Bundles
- Databricks SQL and Spark SQL parameter markers
- Python and `argparse`
- JSON job and task configuration

## Sources Consulted

- [Configure job parameters](https://docs.databricks.com/aws/en/jobs/job-parameters)
- [Configure task parameters](https://docs.databricks.com/aws/en/jobs/task-parameters)
- [Access parameter values from a task](https://docs.databricks.com/aws/en/jobs/parameter-use)
- [Dynamic value references](https://docs.databricks.com/aws/en/jobs/dynamic-value-references)
- [Configure job parameters in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-parameters)
- [Databricks widgets](https://docs.databricks.com/aws/en/notebooks/widgets)
- [Parameter markers](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-parameter-marker)
- [IDENTIFIER clause](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-names-identifier-clause)
- [Use a For each task to run another task in a loop](https://docs.databricks.com/aws/en/jobs/tasks/for-each)
- [Use a Python wheel file in Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/how-to/use-python-wheels-in-workflows)
- [Jobs API: Create a new job](https://docs.databricks.com/api/workspace/jobs/create)
- [Python `argparse` documentation](https://docs.python.org/3/library/argparse.html)

## Issues Found

- Dynamic value references were described as configuration-time substitutions. Changed this to run-time substitutions used in supported configuration fields because Databricks resolves them when the job or task runs.
- The JSON-array explanation treated all listed task types like command-line programs. Clarified that code tasks receive ordered arguments, while a `For each` task iterates over its input array.
- The SQL notebook example did not state the runtime requirement for accessing widget values with parameter markers. Added the Databricks Runtime 15.2-or-above requirement.
- The identifier guidance omitted the availability boundary for `IDENTIFIER`. Added that it is available in Databricks SQL and Databricks Runtime 13.3 LTS or above.
- The bundle guidance did not mention that bundle validation currently rejects job-level `parameters` together with notebook task `base_parameters` in one job. Added the limitation and the documented remedy of moving those task parameters to the job level.

## Review Notes

The JSON snippets parsed successfully. The Python widget helper parsed successfully, and the `argparse` example was executed with representative arguments. The remaining parameter precedence, pushdown, widget-default, dynamic-reference, SQL-safety, run-details, and bundle-resolution claims match the current official documentation. No deprecated APIs were found.
