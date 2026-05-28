# Validation Summary: How to Install Custom Plugins in Cloud Data Fusion for Additional Connectors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Fusion
- CDAP
- CDAP plugins and artifacts
- CDAP REST API
- CDAP CLI
- Maven
- Java
- JDBC drivers

## Sources Consulted
- Google Cloud Data Fusion plugins overview: https://docs.cloud.google.com/data-fusion/docs/concepts/plugins
- Google Cloud Data Fusion Hub plugin deployment guide: https://docs.cloud.google.com/data-fusion/docs/how-to/deploy-a-plugin
- Google Cloud Data Fusion JDBC driver guide: https://docs.cloud.google.com/data-fusion/docs/how-to/using-jdbc-drivers
- Google Cloud Data Fusion CDAP reference: https://docs.cloud.google.com/data-fusion/docs/reference/cdap-reference
- CDAP Artifact Microservices documentation: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/477692148
- CDAP Plugins documentation: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/480379172
- CDAP plugin creation documentation: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/480412201
- CDAP ETL API Javadocs: https://www.javadoc.io/doc/io.cdap.cdap/cdap-etl-api

## Issues Found
- The post described uploading the plugin JSON to the artifact `properties` endpoint after uploading the JAR. CDAP artifact properties are arbitrary string key/value metadata and are not where plugin parent or JDBC plugin definitions are registered. I changed the text to explain that REST uploads use `Artifact-Extends` and, for third-party JDBC drivers, `Artifact-Plugins`; the JSON configuration file is used with the CDAP CLI.
- The post described a generic Cloud Data Fusion UI path for manually uploading custom plugin artifacts. I replaced that with a metadata preparation step and CDAP REST/CLI deployment instructions, because the official Cloud Data Fusion docs document Hub deployment and JDBC driver UI flows, while custom plugin artifact deployment is documented through CDAP artifact APIs or CLI.
- The DB2 driver JSON snippet included a `//` comment inside a `json` code block, which is not valid JSON. I removed the comment from the snippet.
- The DB2 driver JSON included a `description` field not shown in the official CDAP JDBC artifact examples. I removed it so the snippet uses the documented `name`, `type`, and `className` fields.
- The Java `BatchSource` example used `BatchSource<NullWritable, StructuredRecord>`, but CDAP `BatchSource` has three type parameters: input key, input value, and output. I changed it to `BatchSource<NullWritable, Text, StructuredRecord>`.
- The JDBC driver section said to upload both the JAR and JSON through the same UI or REST process as custom plugins. I changed it to show the supported REST form using the `Artifact-Plugins` header, matching CDAP artifact documentation.
- The plugin version management section said versions are managed from the System Admin page. I changed it to reference CDAP artifact APIs or CLI, which are the documented mechanisms used by the commands in the post.

## Review Notes
- The Hub and JDBC driver UI instructions are version-sensitive. The current Cloud Data Fusion documentation documents Hub deployment, namespace driver management, and Add entity driver upload flows.
- The version ranges in examples are illustrative. In production, the parent artifact versions should match the Cloud Data Fusion/CDAP version running in the target instance.
