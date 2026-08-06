# Validation Summary: Keep Schema Migrations Out of Databricks Bundle Deploys

## Status
validated

## Post Type
Technical guide and CI/CD architecture guidance

## Technologies Covered
- Databricks Declarative Automation Bundles
- Databricks CLI
- Lakeflow Jobs
- Databricks SQL tasks and SQL warehouses
- Delta Lake
- Unity Catalog
- Structured Streaming
- Schema migration and CI/CD release controls

## Sources Consulted
- [Develop Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/work-tasks)
- [`bundle` command group](https://docs.databricks.com/aws/en/dev-tools/cli/bundle-commands)
- [Add tasks to jobs in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-task-types)
- [SQL task for jobs](https://docs.databricks.com/aws/en/jobs/tasks/sql)
- [Substitutions and variables in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/variables)
- [Specify a run identity for a Declarative Automation Bundles workflow](https://docs.databricks.com/aws/en/dev-tools/bundles/run-as)
- [Configure and edit Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/configure-job)
- [Jobs API: Create a new job](https://docs.databricks.com/api/workspace/jobs/create)
- [Update table schemas with schema evolution](https://docs.databricks.com/aws/en/tables/update-schema)
- [`CREATE TABLE [USING]`](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-ddl-create-table-using)
- [`ADD CONSTRAINT` clause](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-ddl-alter-table-add-constraint)
- [`DESCRIBE HISTORY`](https://docs.databricks.com/aws/en/sql/language-manual/delta-describe-history)
- [Review table details with `DESCRIBE DETAIL`](https://docs.databricks.com/aws/en/delta/table-details)
- [`session_user` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/session_user)
- [`current_user` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/current_user)
- [Transactions](https://docs.databricks.com/aws/en/transactions/)
- [Remove unused data files with `VACUUM`](https://docs.databricks.com/aws/en/tables/operations/vacuum)
- [Configure Lakeflow Job task run conditions](https://docs.databricks.com/aws/en/jobs/run-if)
- [Configure job parameters in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-parameters)

## Issues Found
- The SQL-file task was described as compatible with an unspecified existing SQL warehouse. Databricks requires a serverless or pro SQL warehouse for SQL tasks, so the text now states that requirement.
- The YAML snippets referenced `migration_warehouse_id` and `migration_service_principal` as custom bundle variables without declaring them. Variable declarations were added so the substitutions are valid bundle configuration; the service principal variable is explicitly described as an application ID.
- The approval guidance referred to the "second command," which is the deployment command in the three-command example rather than the migration execution. It now unambiguously places the control around the migration run command.
- The text required every ledger entry to include success status and verification evidence, but the sample table omitted both fields. `status` and `verification_evidence` columns were added to make the schema match the stated contract.
- The text implied that `DESCRIBE HISTORY` and `DESCRIBE DETAIL` record active workloads. They report table history and metadata, so the wording now separates those checks from job and streaming monitoring.
- The ledger guidance used `current_user()`, which Databricks now deprecates because it returns the session user. It was replaced with the recommended `session_user()` function.

## Review Notes
The remaining commands, flags, YAML fields, SQL statements, concurrency claims, streaming restart guidance, run-identity model, and retention warnings match the official documentation as of 2026-08-05. `max_concurrent_runs: 1` coordinates only runs of the configured job, and Databricks' deployment lock remains separate from Delta Lake write coordination. Databricks transactions can atomically group supported DML for eligible tables, but DDL schema changes are not among the supported transactional operations, so the post's partial-application warning remains valid. Informational key constraints are not enforced, so runner-level duplicate detection for migration IDs is still required.
