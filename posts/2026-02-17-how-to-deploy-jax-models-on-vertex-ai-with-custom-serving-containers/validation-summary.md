# Validation Summary: How to Deploy JAX Models on Vertex AI with Custom Serving Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI custom serving containers
- JAX
- Flax Linen
- Orbax checkpointing
- Flask
- Gunicorn
- Docker
- Artifact Registry
- Google Cloud Storage

## Sources Consulted
- Vertex AI custom container requirements: https://docs.cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Vertex AI Python SDK `Model.upload` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI prebuilt prediction containers: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- JAX installation guide: https://docs.jax.dev/en/latest/installation.html
- Orbax checkpointing overview: https://orbax.readthedocs.io/en/latest/guides/checkpoint/orbax_checkpoint_101.html
- Orbax checkpointer API reference: https://orbax.readthedocs.io/en/latest/api_reference/checkpoint.checkpointers.html
- Flax legacy checkpoint implementation and deprecation warning: https://flax.readthedocs.io/en/v0.8.3/_modules/flax/training/checkpoints.html

## Issues Found
- The serving app loaded the model only inside `if __name__ == "__main__"`, but the Docker command runs `gunicorn server:app`, which imports the module without executing that block. I changed the example to call `load_model()` at module import time so each Gunicorn worker loads and warms the model before serving health and prediction requests.
- The GPU Dockerfile used the old `jax[cuda12_pip]` installation path and JAX 0.4.20 pin. Current JAX documentation uses `jax[cuda12]` or `jax[cuda13]` extras, with CUDA and cuDNN provided by pip wheels. I updated the GPU Dockerfile to install `jax[cuda12]` from the current documented path.
- The CPU Dockerfile pinned old JAX and dependency versions. I updated it to install the current CPU JAX package path documented by JAX.
- The serialization example used `flax.training.checkpoints.save_checkpoint`, which now emits a deprecation warning in favor of Orbax. I replaced that option with `orbax.checkpoint.StandardCheckpointer`.
- The serialization example wrote into `model_artifacts/` without explicitly creating it before the pickle and JSON writes. I added `os.makedirs("model_artifacts", exist_ok=True)`.
- The optimized inference snippet used `functools.partial` without importing `functools`. I added the missing import.

## Review Notes
The Python code blocks were syntax-checked with `ast.parse`. The deployment still assumes the user has created the Artifact Registry repository, enabled required Google Cloud APIs, and has permissions to push images, upload Vertex AI models, and read model artifacts.
