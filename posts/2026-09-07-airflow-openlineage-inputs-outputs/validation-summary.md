# Validation Summary: How to Instrument Airflow with OpenLineage and Keep Dataset Metadata

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- Apache Airflow 2.11.0 and its OpenLineage provider 2.20.0
- OpenLineage datasets, facets, extractors, and HTTP/file transports
- Python 3.12, pip, and Airflow dependency constraints
- PostgreSQL and Amazon S3 dataset naming
- Hook lineage, Airflow Datasets/Assets, and Apache Spark integration

## Sources Consulted
- Provider requirements: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/index.html
- Provider configuration and connection authentication: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/configurations-ref.html
- Operator methods, extractor interfaces, precedence, and testing: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/guides/developer.html
- Operator and hook coverage: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/supported_classes.html
- Airflow installation: https://airflow.apache.org/docs/apache-airflow/2.11.0/installation/installing-from-pypi.html
- Exact Python 3.12 constraints: https://raw.githubusercontent.com/apache/airflow/constraints-2.11.0/constraints-3.12.txt
- Legacy integration status: https://openlineage.io/docs/integrations/airflow/
- Hook lineage in Airflow 2.11: https://airflow.apache.org/docs/apache-airflow/2.11.0/administration-and-deployment/lineage.html
- Current lineage documentation: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/lineage.html
- Dataset naming: https://openlineage.io/docs/spec/naming/
- Spark prerequisites and injection limitations: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/spark.html

## Issues Found
1. **Conflicting installation constraints.** The original command requested provider 2.20.x while the Airflow 2.11.0 constraints require provider 2.3.0, common-compat 1.7.0, common-sql 1.27.1, and OpenLineage client 1.33.0. Split installation into constrained Airflow installation and a separate provider installation retaining the Airflow pin. Added `pip check` and clarified that the interpreter must be Python 3.12.
2. **Outdated legacy maintenance claim.** Replaced the claim that the external integration receives bug fixes with its documented unmaintained status and last supported legacy release, 1.41.
3. **Incomplete extractor precedence.** Included built-in extractors in the first step and retained user custom extractor priority. Qualified the import-failure claim because fallback extraction may still produce datasets. Added scheduler importability to worker importability.
4. **Overbroad Python/Bash black-box claim.** Clarified that source code may be captured and supported hook calls can automatically supply dataset lineage from Python tasks.
5. **Unspecified application function.** Identified `export_objects` as application-supplied code and specified its output bucket and return-value contract so the emitted S3 identifiers match actual writes.
6. **Mislabeled test and missing fixture.** The example tests an operator method, not the registered custom extractor. Corrected the description and removed its undefined `task_instance` fixture dependency by passing `None`, which this method does not use.
7. **Overbroad failure-output guidance.** A failed task can have confirmed partial writes. Changed the guidance to preserve confirmed outputs and explained failure-to-completion extraction fallback.
8. **Version terminology.** Clarified that Airflow Assets are called Datasets in the illustrated Airflow 2.11 environment.
9. **Missing Spark prerequisite.** Added the separate Spark integration/listener requirement and HTTP transport injection limitation; Airflow property injection alone does not enable Spark lineage.

## Review Notes
- Confirmed provider 2.20.0 requires Airflow >=2.11.0. The compatible-release constraint `~=2.20.0` permits 2.20 patch releases and excludes 2.21.
- Verified the Generic connection JSON, password-backed API key authentication, namespace setting, and configuration precedence against the versioned reference.
- Verified operator method signatures, local imports, runtime attribute use, dataset identity formats, fallback behavior, and event comparison guidance against official documentation.
- Parsed all Python examples with Python AST, parsed JSON and INI snippets, and checked shell syntax with `bash -n` successfully.
- This was documentation and static validation. No Airflow installation, live export, DAG execution, emitted-event system test, or Spark run was performed. Application code and backend credentials are intentionally deployment-specific.
- The troubleshooting URL is linked by the official versioned developer guide and returned HTTP 200 through a direct request after the web retrieval tool reported a cache miss. File-transport testing guidance was verified in the developer guide. The stable lineage URL currently resolves to Airflow 3.3.1, so the Airflow 2.11 lineage page was checked separately.
