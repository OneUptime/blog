# Validation Summary: How to Deploy PyTorch Models on Vertex AI Using Custom Containers

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI custom prediction containers
- PyTorch
- Flask
- Gunicorn
- TorchServe
- Torch Model Archiver
- Docker
- Artifact Registry
- Cloud Storage

## Sources Consulted
- Google Cloud Vertex AI custom container requirements: https://docs.cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Google Cloud Vertex AI custom container import and SDK fields: https://docs.cloud.google.com/vertex-ai/docs/predictions/use-custom-container
- TorchServe advanced configuration: https://docs.pytorch.org/serve/configuration.html
- TorchServe custom service and model archiver documentation: https://docs.pytorch.org/serve/custom_service.html
- TorchServe batch inference documentation: https://docs.pytorch.org/serve/batch_inference_with_ts.html
- TorchServe REST API documentation: https://docs.pytorch.org/serve/rest_api.html
- TorchServe BaseHandler source documentation: https://docs.pytorch.org/serve/_modules/ts/torch_handler/base_handler.html
- PyTorch automatic mixed precision documentation: https://pytorch.org/docs/stable/amp.html
- Docker Hub TorchServe image tags: https://hub.docker.com/r/pytorch/torchserve/tags

## Issues Found
- The Flask application loaded the model only inside the `if __name__ == "__main__"` block, so the model would not load when Gunicorn imports `app:app`. Moved `load_model()` to module import time before the development server block.
- The Flask Dockerfile manually set `AIP_HTTP_PORT`, `AIP_HEALTH_ROUTE`, and `AIP_PREDICT_ROUTE`. Vertex AI documentation says containers should not manually set `AIP_*` variables because Vertex AI sets them. Removed those `ENV` lines.
- The Vertex AI model upload example omitted `artifact_uri`, but the Flask code expects Vertex AI to set `AIP_STORAGE_URI` so it can download `model_weights.pt`. Added an `artifact_uri` example for the Flask approach.
- The TorchServe handler did not correctly decode byte or string request bodies from TorchServe request rows. Updated preprocessing to handle `body`, `data`, bytes, bytearray, and JSON strings.
- The Torch Model Archiver command put `model.py` in `--extra-files` instead of `--model-file`, which would not let `BaseHandler` load an eager/state-dict model correctly. Changed the command to use `--model-file model.py`.
- The TorchServe `config.properties` snippet was marked as Python. Changed the fenced code language to `properties`.
- The TorchServe batching configuration used top-level `batch_size` and `max_batch_delay`, but current TorchServe documentation shows model-specific `models={... batchSize ... maxBatchDelay ...}` configuration for startup batching. Updated the config accordingly and changed `load_models` to load `sentiment.mar`.
- The TorchServe Docker image tag used `0.9.0-gpu`, which is outdated. Updated it to the available `0.12.0-gpu` tag.
- The GPU memory management example used `torch.cuda.amp.autocast()`, which is superseded by `torch.amp.autocast("cuda", ...)` in current PyTorch documentation. Updated the example.

## Review Notes
TorchServe documentation now carries a limited-maintenance notice stating the project is no longer actively maintained and may not receive fixes or security patches. The post remains technically useful because it presents TorchServe as one deployment option, but future revisions should consider mentioning actively maintained alternatives for new production systems.
