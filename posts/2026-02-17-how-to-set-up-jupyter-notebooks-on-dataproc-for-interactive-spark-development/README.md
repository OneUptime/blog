# How to Set Up Jupyter Notebooks on Dataproc for Interactive Spark Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Jupyter, Spark, Python

Description: Configure Jupyter notebooks on Dataproc clusters for interactive Spark development, data exploration, and prototyping PySpark pipelines.

---

Jupyter notebooks and Spark are a natural combination. You get the iterative, cell-by-cell execution style of notebooks with the distributed computing power of Spark. On Dataproc, setting up Jupyter is as simple as adding an optional component when creating your cluster. Within minutes, you have a notebook environment connected to a live Spark session.

This article walks you through setting up Jupyter on Dataproc, configuring it for productive use, and getting the most out of the interactive development experience.

## Step 1: Create a Dataproc Cluster with Jupyter

The fastest way to get Jupyter on Dataproc is to include it as an optional component:

```bash
# Create a Dataproc cluster with Jupyter and the component gateway
gcloud dataproc clusters create jupyter-cluster \
  --region=us-central1 \
  --zone=us-central1-a \
  --image-version=2.1-debian11 \
  --optional-components=JUPYTER \
  --enable-component-gateway \
  --num-workers=2 \
  --worker-machine-type=n2-standard-4 \
  --master-machine-type=n2-standard-4 \
  --bucket=my-notebooks-bucket
```

Key flags explained:

- `--optional-components=JUPYTER` installs JupyterLab on the cluster
- `--enable-component-gateway` exposes the Jupyter UI through a secure proxy in the Cloud Console
- `--bucket` specifies where notebooks are stored in GCS (so they survive cluster deletion)

## Step 2: Access the Jupyter Interface

Once the cluster is running, access JupyterLab through the Cloud Console:

1. Go to **Dataproc** > **Clusters** in the Cloud Console
2. Click on your cluster name
3. Click the **Web Interfaces** tab
4. Click **JupyterLab** to open it in a new tab

The component gateway handles authentication using your Google Cloud credentials. No SSH tunnel or port forwarding needed.

If you prefer command-line access, you can set up an SSH tunnel:

```bash
# Create an SSH tunnel to the Jupyter port on the master node
gcloud compute ssh jupyter-cluster-m \
  --zone=us-central1-a \
  -- -L 8123:localhost:8123

# Then open http://localhost:8123 in your browser
```

## Step 3: Create Your First PySpark Notebook

In JupyterLab, create a new notebook and select the **PySpark** kernel. This kernel comes pre-configured with a SparkSession connected to your cluster.

Here is a typical first cell to verify everything is working:

```python
# Verify the Spark session is active and check the cluster configuration
print(f"Spark version: {spark.version}")
print(f"Application ID: {spark.sparkContext.applicationId}")
print(f"Master: {spark.sparkContext.master}")

# Check the number of executors
sc = spark.sparkContext
print(f"Default parallelism: {sc.defaultParallelism}")
```

Now try reading some data and doing basic analysis:

```python
# Read a public dataset and perform basic analysis
df = spark.read.format("bigquery") \
    .option("table", "bigquery-public-data.samples.natality") \
    .load()

# Show the schema
df.printSchema()

# Basic statistics
df.select("weight_pounds", "mother_age", "gestation_weeks").describe().show()
```

## Step 4: Install Additional Python Packages

The default Jupyter environment includes common packages, but you will likely need more. You can install packages directly from a notebook cell:

```python
# Install additional Python packages in the notebook
import subprocess
import sys

# Install packages using pip
subprocess.check_call([sys.executable, "-m", "pip", "install",
    "plotly", "seaborn", "scikit-learn", "pandas-gbq"])
```

For packages that need to be available on all worker nodes (not just the driver), use an initialization action or install them at cluster creation:

```bash
# Create a cluster with additional Python packages pre-installed
gcloud dataproc clusters create jupyter-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --optional-components=JUPYTER \
  --enable-component-gateway \
  --metadata="PIP_PACKAGES=plotly seaborn scikit-learn pandas-gbq" \
  --initialization-actions=gs://goog-dataproc-initialization-actions-us-central1/python/pip-install.sh
```

## Step 5: Use Visualizations in Notebooks

One of the big advantages of Jupyter over command-line Spark is the ability to create inline visualizations. Here is an example using matplotlib:

```python
# Create visualizations from Spark DataFrames
import matplotlib.pyplot as plt

# Aggregate data in Spark
monthly_counts = df.groupBy("year", "month").count() \
    .filter("year >= 2000") \
    .orderBy("year", "month") \
    .toPandas()  # Convert to Pandas for plotting

# Create a line chart
fig, ax = plt.subplots(figsize=(14, 6))
for year in [2000, 2005, 2008]:
    year_data = monthly_counts[monthly_counts["year"] == year]
    ax.plot(year_data["month"], year_data["count"], label=str(year))

ax.set_xlabel("Month")
ax.set_ylabel("Births")
ax.set_title("Monthly Births by Year")
ax.legend()
plt.tight_layout()
plt.show()
```

For interactive visualizations, Plotly works well in JupyterLab:

```python
# Interactive visualization with Plotly
import plotly.express as px

# Get average birth weight by state (convert to Pandas for Plotly)
state_data = df.filter("state IS NOT NULL") \
    .groupBy("state") \
    .agg({"weight_pounds": "avg"}) \
    .withColumnRenamed("avg(weight_pounds)", "avg_weight") \
    .toPandas()

fig = px.bar(state_data.sort_values("avg_weight", ascending=False).head(20),
             x="state", y="avg_weight",
             title="Average Birth Weight by State (Top 20)")
fig.show()
```

## Step 6: Configure Spark Properties in Notebooks

You can adjust Spark configuration within your notebook for specific workloads:

```python
# Adjust Spark configuration for a memory-intensive operation
spark.conf.set("spark.sql.shuffle.partitions", "100")
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")

# Check current configuration
for item in sorted(spark.sparkContext.getConf().getAll()):
    if "shuffle" in item[0] or "adaptive" in item[0]:
        print(f"{item[0]} = {item[1]}")
```

## Step 7: Save Notebooks to Cloud Storage

When you specify a `--bucket` during cluster creation, notebooks are automatically saved to GCS. This means your work persists even if the cluster is deleted.

The notebooks are stored at:
```
gs://my-notebooks-bucket/notebooks/jupyter/
```

You can also manually save notebooks to a specific GCS location:

```python
# Save a DataFrame as a checkpoint to GCS
result_df.write.mode("overwrite").parquet("gs://my-data-bucket/notebooks/checkpoints/analysis_v1/")
```

## Step 8: Use Spark Magic Commands

The PySpark kernel supports magic commands for common operations:

```python
# Use SQL magic to run Spark SQL directly
df.createOrReplaceTempView("births")
```

```sql
%%sql
-- Run Spark SQL directly in a notebook cell
SELECT
    year,
    AVG(weight_pounds) as avg_weight,
    COUNT(*) as total_births
FROM births
WHERE year >= 2000
GROUP BY year
ORDER BY year
```

## Performance Tips for Notebook Development

Working in notebooks has some unique performance considerations:

1. **Do not collect large DataFrames** - Use `.show()`, `.take()`, or `.limit()` instead of `.collect()` or `.toPandas()` on large datasets
2. **Cache intermediate results** - If you are iterating on analysis of the same data, cache it: `df.cache()`
3. **Monitor the Spark UI** - Access it through the component gateway to understand job performance
4. **Use `.explain()`** - Check query plans before running expensive operations

```python
# Good practice: check the execution plan before running
df.filter("year > 2005").groupBy("state").count().explain()

# Cache frequently accessed DataFrames
filtered_df = df.filter("year >= 2000 AND state IS NOT NULL")
filtered_df.cache()
filtered_df.count()  # Triggers caching
```

## Collaboration Tips

For team settings, consider these practices:

- Store shared notebooks in a common GCS bucket that the whole team can access
- Use version control by downloading notebooks and committing them to Git
- Create template notebooks with common imports, configurations, and data connections
- Document your notebooks with markdown cells explaining the analysis

## Wrapping Up

Jupyter on Dataproc gives you a powerful interactive environment for Spark development. The setup takes just a few minutes with the optional component, and the component gateway provides secure browser access without SSH tunnels. For data exploration, prototyping pipelines, and building visualizations on top of Spark DataFrames, notebooks are the most productive way to work with Spark on GCP.
