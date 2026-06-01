# Validation Summary: How to Register and Version Datasets in Azure Machine Learning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning
- Azure Machine Learning Python SDK v2 (`azure-ai-ml`)
- Azure ML data assets
- Azure ML datastores
- MLTable
- Python
- pandas

## Sources Consulted
- Microsoft Learn: Create and manage data assets in Azure Machine Learning: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-data-assets?view=azureml-api-2
- Microsoft Learn: Access data in a job: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-read-write-data-v2?view=azureml-api-2
- Microsoft Learn: CLI v2 command job YAML schema: https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-job-command?view=azureml-api-2
- Microsoft Learn: CLI v2 MLTable YAML schema: https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-mltable?view=azureml-api-2
- Microsoft Learn: `azure.ai.ml.operations.DataOperations`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.operations.dataoperations?view=azure-python
- Microsoft Learn: `azure.ai.ml.constants.AssetTypes`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.constants.assettypes?view=azure-python
- Microsoft Learn: `azure.ai.ml.entities.Data`: https://learn.microsoft.com/en-gb/python/api/azure-ai-ml/azure.ai.ml.entities.data?view=azure-python-preview

## Issues Found
- The command job example said the input was automatically mounted or downloaded without showing how that is selected. Azure ML input delivery is controlled by the input `mode`, and `ro_mount` is the default for command job inputs. I added `InputOutputModes.RO_MOUNT` to the example and clarified the wording.
- The MLTable `convert_column_types` YAML used `column_name`, but the official MLTable schema uses `columns`. I changed the three conversion entries to `columns`.
- The data validation helper used `pd.read_csv` without importing pandas in that code block. I added `import pandas as pd` so the snippet is syntactically complete.
- The introduction described data assets as immutable snapshots. Azure ML data asset versions are immutable, but cloud storage paths are versioned references to existing data locations. I clarified that local paths are uploaded and cloud paths should not be modified in place if reproducibility is required.

## Review Notes
The post uses current Azure ML SDK v2 concepts: data assets, `uri_file`, `uri_folder`, `mltable`, `Data`, `MLClient.data.create_or_update`, `MLClient.data.get`, and `MLClient.data.archive`. The examples assume the named workspace, datastore, compute cluster, local files, and curated environment versions exist in the reader's Azure ML workspace.
