# Validation Summary: How to Use MongoDB with Apache Airflow for Data Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation pipelines, PyMongo client operations)
- Apache Airflow (DAGs, PythonOperator, BranchPythonOperator, XCom, MongoHook)
- apache-airflow-providers-mongo package
- pandas (DataFrame, pd.cut)
- Python

## Sources Consulted
- Apache Airflow official documentation for MongoHook: https://airflow.apache.org/docs/apache-airflow-providers-mongo/stable/_api/airflow/providers/mongo/hooks/mongo/index.html
- Apache Airflow connections documentation: https://airflow.apache.org/docs/apache-airflow/stable/howto/connection.html
- Apache Airflow PythonOperator documentation: https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/python/index.html
- Apache Airflow BranchPythonOperator documentation: https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/python.html
- PyMongo documentation for MongoClient, aggregate, count_documents, insert_many: https://pymongo.readthedocs.io/en/stable/
- pandas documentation for pd.cut and DataFrame.to_dict: https://pandas.pydata.org/docs/

## Issues Found
No technical issues found.

## Review Notes
- `schedule_interval` is soft-deprecated since Airflow 2.4 in favor of the `schedule` parameter on the DAG constructor. The code still works correctly, but future readers using Airflow 2.4+ may see deprecation warnings. A future update could change `schedule_interval="@daily"` to `schedule="@daily"`.
- `datetime.utcnow()` (used in the `count_new_users` example) is deprecated in Python 3.12+ in favor of `datetime.now(datetime.timezone.utc)`. It still works but may emit deprecation warnings on newer Python versions.
- Passing large datasets through XCom (as done in the ETL example) is generally discouraged for production pipelines because XCom stores data in the Airflow metadata database. For large-scale use, an intermediate storage layer (e.g., S3, GCS) would be more appropriate. This is a design consideration rather than a correctness issue, and acceptable for a tutorial.
