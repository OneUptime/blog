# Validation Summary: How to Use Athena Prepared Statements for Parameterized Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Athena prepared statements
- AWS CLI
- boto3 for Amazon Athena
- Python
- AWS Lambda
- SQL parameterized queries

## Sources Consulted
- Amazon Athena User Guide: Use parameterized queries - https://docs.aws.amazon.com/athena/latest/ug/querying-with-prepared-statements.html
- Amazon Athena User Guide: Execute prepared statements using the AWS CLI - https://docs.aws.amazon.com/athena/latest/ug/querying-with-prepared-statements-cli-executing-prepared-statements.html
- Amazon Athena User Guide: EXECUTE - https://docs.aws.amazon.com/athena/latest/ug/querying-with-prepared-statements-execute.html
- AWS CLI Command Reference: create-prepared-statement - https://docs.aws.amazon.com/cli/latest/reference/athena/create-prepared-statement.html
- AWS CLI Command Reference: start-query-execution - https://docs.aws.amazon.com/cli/latest/reference/athena/start-query-execution.html
- AWS CLI Command Reference: create-work-group - https://docs.aws.amazon.com/cli/latest/reference/athena/create-work-group.html
- boto3 Athena client: start_query_execution - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/start_query_execution.html
- Amazon Athena API Reference: StartQueryExecution - https://docs.aws.amazon.com/athena/latest/APIReference/API_StartQueryExecution.html
- Amazon Athena User Guide: Escape reserved keywords in queries - https://docs.aws.amazon.com/athena/latest/ug/reserved-words.html
- Amazon Athena API Reference: ListPreparedStatements, UpdatePreparedStatement, DeletePreparedStatement - https://docs.aws.amazon.com/athena/latest/APIReference/

## Issues Found
- The original security wording said Athena handled parameters so the application did not need to worry about escaping or injection. That was too broad for examples that constructed SQL literals in application code. I changed the wording to emphasize keeping the query template separate from values.
- The `search_logs` prepared statement used `timestamp` as an unquoted column name. `TIMESTAMP` is an Athena reserved keyword in SELECT queries, so I changed the query to use `"timestamp"` in the SELECT, WHERE, and ORDER BY clauses.
- The Python application example passed `DATE '...'` values as strings to a formatter that wrapped all strings in quotes, which would produce invalid date parameter literals. I changed the example to use `datetime.date` values and added date/timestamp-aware formatting.
- The Python application and Lambda examples built `EXECUTE ... USING ...` strings from parameter values. I changed them to use Athena's `ExecutionParameters` field with `QueryString` set to the prepared statement execution, and added prepared statement name validation or allowlisting.
- The Lambda example inserted date and timestamp values directly into SQL literal strings without validating their formats. I added ISO date/timestamp parsing before formatting those literals for `ExecutionParameters`.

## Review Notes
The AWS CLI commands and boto3 method names are current according to official AWS documentation. The local environment did not have the AWS CLI installed, so command options were verified against official AWS CLI documentation instead of local `--help` output. The Python code blocks were syntax-checked locally.
