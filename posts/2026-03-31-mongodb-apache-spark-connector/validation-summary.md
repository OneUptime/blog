# Validation Summary: How to Use MongoDB with Apache Spark via the MongoDB Spark Connector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Apache Spark (PySpark)
- MongoDB Spark Connector v10.3.0
- Spark SQL
- MongoDB Atlas
- SBT (Scala build tool)

## Sources Consulted
- MongoDB Spark Connector v10.3 official documentation: https://www.mongodb.com/docs/spark-connector/v10.3/
- Getting Started guide: https://www.mongodb.com/docs/spark-connector/v10.x/getting-started/
- Batch Read Configuration Options: https://www.mongodb.com/docs/spark-connector/v10.3/batch-mode/batch-read-config/
- Batch Write Configuration Options: https://www.mongodb.com/docs/spark-connector/v10.3/batch-mode/batch-write-config/
- Maven Central for mongo-spark-connector_2.12: https://repo1.maven.org/maven2/org/mongodb/spark/mongo-spark-connector_2.12/10.3.0/
- MongoDB Spark Connector GitHub repository: https://github.com/mongodb/mongo-spark
- Spark Connector Release Notes: https://www.mongodb.com/docs/spark-connector/current/release-notes/

## Issues Found
No technical issues found.

## Review Notes
- The connector version 10.3.0 is valid but not the latest. Newer versions (10.5.0, 10.6.1, 11.0) are available. Version 11.0 targets Spark 4.0+. The post's use of 10.3.0 remains correct and functional.
- The post correctly uses v10.x configuration property names (`spark.mongodb.read.connection.uri` / `spark.mongodb.write.connection.uri`) rather than the deprecated v3.x names (`spark.mongodb.input.uri` / `spark.mongodb.output.uri`).
- The `.format("mongodb")` usage is correct for v10.x (v3.x used `"mongo"` or the fully-qualified class name).
- The `aggregation.pipeline` option, `mode("overwrite")`, `mode("append")`, and database.collection-in-URI patterns are all verified correct for v10.x.
- The `_2.12` Scala suffix in the Maven coordinate is required for v10.x and correctly specified.
