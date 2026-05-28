# How to Install Custom Plugins in Cloud Data Fusion for Additional Connectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Data Fusion, Plugin, Custom Connector, CDAP, Data Integration

Description: Learn how to install and configure custom plugins in Cloud Data Fusion to extend the platform with additional connectors and transformations.

---

Cloud Data Fusion ships with a solid set of built-in plugins for common data sources and sinks, but real-world data integration projects inevitably need something the default installation does not provide. Maybe you need to connect to a SaaS API, use a proprietary file format, or apply a domain-specific transformation. That is where custom plugins come in. In this post, I will walk through how to find, install, and configure custom plugins in Cloud Data Fusion.

## Understanding the Plugin Architecture

Cloud Data Fusion is built on CDAP (Cask Data Application Platform), which has a pluggable architecture. Every source, sink, transform, and action in a pipeline is a plugin. Even the built-in components like the BigQuery sink and GCS source are plugins - they just happen to be pre-installed.

Plugins are packaged as JAR files and deployed to the Data Fusion instance. Once installed, they appear in the pipeline Studio alongside the built-in components. There are several categories of plugins:

- **Source** - Read data from external systems
- **Sink** - Write data to external systems
- **Transform** - Modify data in transit
- **Action** - Perform operations before or after a pipeline (e.g., run a shell command, send a notification)
- **Post-run Action** - Execute after a pipeline completes, regardless of success or failure
- **Condition** - Branch pipeline execution based on logic

## Finding Plugins in the Hub

The first place to look for additional plugins is the Cloud Data Fusion Hub. In the Studio UI, click the "Hub" button in the top navigation bar. The Hub is a marketplace of pre-built plugins maintained by Google and the community.

Browse the Hub by category or search for a specific connector. Each plugin listing shows:

- Description of what it does
- Version number
- Supported artifact versions
- Documentation links

Some popular plugins available in the Hub include:

- Salesforce source and sink
- Amazon S3 source and sink
- Kafka streaming source
- Elasticsearch sink
- HTTP source (for REST APIs)
- FTP/SFTP source
- ServiceNow connector
- SAP connector

To install a plugin from the Hub, click on it and then click "Deploy." The plugin will be downloaded and installed in your Data Fusion instance automatically.

## Installing Plugins from JAR Files

If the plugin you need is not in the Hub - maybe it is a custom plugin developed by your team or a third-party vendor - you can install it manually from a JAR file.

### Step 1: Build or Obtain the Plugin JAR

If you are building a custom plugin, the CDAP plugin development framework provides Maven archetypes to get started:

```bash
# Generate a new plugin project using the CDAP Maven archetype

mvn archetype:generate \
  -DarchetypeGroupId=io.cdap.cdap \
  -DarchetypeArtifactId=cdap-data-pipeline-plugins-archetype \
  -DarchetypeVersion=6.9.0 \
  -DgroupId=com.mycompany \
  -DartifactId=my-custom-plugin \
  -Dversion=1.0.0
```

Build the project to produce the plugin JAR and its JSON configuration file:

```bash
# Build the plugin JAR
cd my-custom-plugin
mvn clean package -DskipTests
```

This produces two important files in the target directory:
- `my-custom-plugin-1.0.0.jar` - The plugin binary
- `my-custom-plugin-1.0.0.json` - The plugin configuration metadata

### Step 2: Prepare the Plugin Metadata

For a custom plugin JAR, the metadata needs to specify which parent artifacts can use the plugin. When you use the CDAP CLI, this metadata is supplied as a JSON configuration file with the same base name as the JAR.

For example, `my-custom-plugin-1.0.0.json` might contain:

```json
{
  "parents": [
    "system:cdap-data-pipeline[6.0.0,7.0.0)",
    "system:cdap-data-streams[6.0.0,7.0.0)"
  ]
}
```

### Step 3: Upload via REST API

For automated deployments, use the CDAP REST API. When using the REST API, pass the parent artifact information in the `Artifact-Extends` header:

```bash
# Upload a plugin JAR to Cloud Data Fusion using the REST API
curl -X POST \
  "https://<CDAP_ENDPOINT>/v3/namespaces/default/artifacts/my-custom-plugin" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Artifact-Version: 1.0.0" \
  -H "Artifact-Extends: system:cdap-data-pipeline[6.0.0,7.0.0)/system:cdap-data-streams[6.0.0,7.0.0)" \
  --data-binary @my-custom-plugin-1.0.0.jar
```

The `Artifact-Extends` header tells Data Fusion which pipeline types the plugin is compatible with. Most plugins extend both `cdap-data-pipeline` (batch) and `cdap-data-streams` (real-time).

If you prefer to use the CDAP CLI, load the artifact with the JAR and the JSON configuration file:

```bash
# Upload the plugin JAR with its configuration JSON using the CDAP CLI
cdap cli load artifact my-custom-plugin-1.0.0.jar config-file my-custom-plugin-1.0.0.json
```

## Installing JDBC Drivers

A very common need is adding JDBC drivers for databases that are not supported out of the box. For example, if you need to connect to a DB2, Teradata, or Informix database, you need to install the appropriate JDBC driver as a plugin.

### Step 1: Download the Driver

Get the JDBC driver JAR from the database vendor's website. Make sure you download the version that matches your database server version.

### Step 2: Create the Driver JSON

You need a JSON configuration file that tells Data Fusion about the driver. Here is an example for a DB2 JDBC driver:

```json
{
  "parents": [
    "system:cdap-data-pipeline[6.0.0,7.0.0)",
    "system:cdap-data-streams[6.0.0,7.0.0)"
  ],
  "plugins": [
    {
      "name": "db2",
      "type": "jdbc",
      "className": "com.ibm.db2.jcc.DB2Driver"
    }
  ]
}
```

### Step 3: Upload the Driver

Upload both the JAR and JSON using the CDAP CLI. If you use the REST API for a third-party JDBC driver, pass the driver metadata in the `Artifact-Plugins` header along with `Artifact-Extends`:

```bash
# Upload a DB2 JDBC driver as a plugin using the REST API
curl -X POST \
  "https://<CDAP_ENDPOINT>/v3/namespaces/default/artifacts/db2-jdbc-driver" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Artifact-Version: 1.0.0" \
  -H "Artifact-Extends: system:cdap-data-pipeline[6.0.0,7.0.0)/system:cdap-data-streams[6.0.0,7.0.0)" \
  -H 'Artifact-Plugins: [ { "name": "db2", "type": "jdbc", "className": "com.ibm.db2.jcc.DB2Driver" } ]' \
  --data-binary @db2-jdbc-driver.jar
```

After installation, the Database source and sink plugins will show the new driver option in their configuration dropdown.

## Managing Plugin Versions

Over time, you will accumulate multiple versions of plugins. You can manage these with the CDAP artifact APIs or the CDAP CLI.

### Listing Installed Plugins

To see all installed artifacts via the API:

```bash
# List all artifacts in the default namespace
curl -X GET \
  "https://<CDAP_ENDPOINT>/v3/namespaces/default/artifacts" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

### Deleting Old Plugin Versions

To remove an old version:

```bash
# Delete a specific version of a plugin artifact
curl -X DELETE \
  "https://<CDAP_ENDPOINT>/v3/namespaces/default/artifacts/my-custom-plugin/versions/1.0.0" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

Be careful when deleting plugin versions - any pipeline using that specific version will fail to start until you update it to use a newer version.

## Developing Custom Plugins

If you need to build a completely custom plugin, here is the basic structure of a CDAP batch source plugin:

```java
// Custom source plugin that reads from a hypothetical REST API
@Plugin(type = BatchSource.PLUGIN_TYPE)
@Name("MyRestSource")
@Description("Reads data from a custom REST API")
public class MyRestSource extends BatchSource<NullWritable, Text, StructuredRecord> {

    private final MyRestSourceConfig config;

    public MyRestSource(MyRestSourceConfig config) {
        this.config = config;
    }

    @Override
    public void configurePipeline(PipelineConfigurer pipelineConfigurer) {
        // Validate configuration and set output schema
        pipelineConfigurer.getStageConfigurer().setOutputSchema(config.getSchema());
    }

    @Override
    public void prepareRun(BatchSourceContext context) {
        // Set up the input format and configuration for the run
        context.setInput(Input.of(config.referenceName,
            new MyInputFormatProvider(config)));
    }
}
```

The CDAP documentation provides detailed guides for each plugin type. The key thing to remember is that the plugin framework handles serialization, schema propagation, and lifecycle management - you just need to implement the data access logic.

## Troubleshooting Plugin Issues

**Plugin not appearing in Studio** - After installation, refresh the browser or restart the pipeline Studio. Some plugins require a Data Fusion instance restart to be recognized.

**Class not found errors** - Make sure all dependencies are either bundled in the plugin JAR (as a fat JAR) or available in the Data Fusion classpath.

**Version conflicts** - If two plugins bundle different versions of the same library, you may see classloading issues. Use Maven shade plugin to relocate conflicting packages.

**Plugin configuration validation failures** - Check the JSON configuration file for syntax errors and make sure the `parents` field matches the CDAP version running in your Data Fusion instance.

## Wrapping Up

The plugin system is what makes Cloud Data Fusion flexible enough for real-world data integration. Between the Hub, manual JAR uploads, and custom development, you can connect to virtually any data source or implement any transformation logic. Start by checking the Hub for existing plugins, move to JDBC driver installation if you need database connectivity, and only build custom plugins when nothing else fits. The investment in a custom plugin pays off quickly if you are going to use it across multiple pipelines.
