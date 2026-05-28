# Validation Summary: How to Create a Dataproc Cluster with Custom Initialization Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc
- Dataproc initialization actions
- Google Cloud CLI
- Cloud Storage
- Bash
- PySpark Python dependencies
- Hadoop and Spark cluster configuration

## Sources Consulted
- Google Cloud Dataproc initialization actions documentation: https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/init-actions
- Google Cloud CLI `gcloud dataproc clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud Dataproc cluster metadata documentation: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/metadata
- Google Cloud Dataproc Python environment documentation: https://docs.cloud.google.com/dataproc/docs/tutorials/python-configuration
- Google Cloud Dataproc image version lists: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- GoogleCloudDataproc initialization actions repository: https://github.com/GoogleCloudDataproc/initialization-actions

## Issues Found
- The Python package installation examples used `pip3`, which installs into the OS Python environment on Dataproc 2.x rather than the default PySpark Conda environment. Changed them to use `/opt/conda/default/bin/pip` and the matching Jupyter executable path.
- The role-based script prose called `ROLE` an environment variable. Dataproc exposes the node role through the `dataproc-role` metadata value, so the text now matches the code and official docs.
- The Conda initialization action example used only `bootstrap-conda.sh` with `CONDA_PACKAGES`, but the repository documentation uses `install-conda-env.sh` to install package metadata. Added `install-conda-env.sh` and corrected the metadata quoting.
- The post described Google's public initialization actions as pre-built actions without a production caveat. Updated the wording to identify them as sample actions and recommend copying them to a versioned bucket path for production.
- The Conda initialization action is deprecated for new clusters. Added a note recommending Dataproc 2.x conda-related cluster properties when appropriate.
- The debugging section pointed readers to a GCS `dataproc-initialization-script-0_output` object path. Official initialization action logging docs specify per-node logs under `/var/log/dataproc-initialization-script-X.log`, so the example now uses SSH to inspect that log on the master node.
- The cluster creation example used Dataproc image `2.1-debian11`, which is past support as of 2026-05-28. Updated it to the supported `2.3-debian12` image version.

## Review Notes
- The `gcloud dataproc clusters create` flags used in the post are current, including `--initialization-actions`, `--initialization-action-timeout`, `--metadata`, `--single-node`, and `--image-version`.
- The public initialization actions in `gs://goog-dataproc-initialization-actions-REGION` are reference samples and can change over time, so production clusters should use copied, versioned scripts.
