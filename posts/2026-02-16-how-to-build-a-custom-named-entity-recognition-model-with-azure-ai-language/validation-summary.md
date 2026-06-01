# Validation Summary: How to Build a Custom Named Entity Recognition Model with Azure AI Language

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Language
- Custom named entity recognition
- Azure Blob Storage
- Azure CLI
- Azure AI Language authoring REST API
- Azure AI Text Analytics SDK for Python
- Python

## Sources Consulted
- Microsoft Learn: Custom named entity recognition service limits: https://learn.microsoft.com/en-us/azure/ai-services/language-service/custom-named-entity-recognition/service-limits
- Microsoft Learn: Accepted custom NER data formats: https://learn.microsoft.com/en-us/azure/ai-services/language-service/custom-named-entity-recognition/concepts/data-formats
- Microsoft Learn: Train your custom named entity recognition model: https://learn.microsoft.com/en-us/azure/ai-services/language-service/custom-named-entity-recognition/how-to/train-model
- Microsoft Learn: Text Authoring Project - Train REST API, 2023-04-01: https://learn.microsoft.com/en-us/rest/api/language/analyze-text-authoring/text-authoring-project/train?view=rest-language-analyze-text-authoring-2023-04-01
- Microsoft Learn: Text Authoring Deployment - Deploy Project REST API, 2023-04-01: https://learn.microsoft.com/en-us/rest/api/language/analyze-text-authoring/text-authoring-deployment/deploy-project?view=rest-language-analyze-text-authoring-2023-04-01
- Microsoft Learn: TextAnalyticsClient.begin_recognize_custom_entities Python API: https://learn.microsoft.com/en-us/python/api/azure-ai-textanalytics/azure.ai.textanalytics.textanalyticsclient?view=azure-python#azure-ai-textanalytics-textanalyticsclient-begin-recognize-custom-entities

## Issues Found
- The post stated that custom NER is not available on the free tier. Microsoft documents both F0 and S as supported tiers, with stricter limits on F0. Updated the prerequisite and resource-creation wording to recommend S for production while noting F0 can be used within free tier limits.
- The programmatic labels JSON used an incorrect document shape with `document`, top-level per-document labels, and `text` fields. Microsoft documents `location`, `dataset`, region objects, and nested `labels`. Updated the JSON structure to match the documented import format.
- Several label offsets and lengths in the programmatic example were incorrect. Recalculated them against the sample document text and corrected the values.
- The labels file used `projectFileVersion` value `2022-10-01-preview`. Microsoft documents `2022-05-01` for the accepted custom NER labels format. Updated the value and added the documented metadata fields.
- The Language Studio training instructions referred to a "Training mode: Standard" selection. Current custom NER training documentation focuses on model name and data splitting. Updated the bullet to identify the model name instead.
- The REST training example pinned `trainingConfigVersion` to `2022-05-01`; the current REST sample uses `latest`. Updated the example accordingly.
- The expected output omitted the offset and length lines printed by the Python code. Added representative offset and length lines so the output matches the example.

## Review Notes
The Azure CLI commands are plausible for creating a Language resource and uploading blobs, but the local environment did not have `az` installed, so CLI help could not be checked locally. The Python snippets were parsed with Python's AST and are syntactically valid.
