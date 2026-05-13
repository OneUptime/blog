# Validation Summary: How to Deploy vLLM for Large Language Model Serving with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- vLLM
- Kubernetes
- Flux CD
- NVIDIA GPU scheduling
- Hugging Face Hub
- AWQ model quantization

## Sources Consulted
- vLLM OpenAI-Compatible Server documentation: https://docs.vllm.ai/en/latest/serving/openai_compatible_server/
- vLLM Docker deployment documentation: https://docs.vllm.ai/en/latest/deployment/docker/
- vLLM v0.4.2 engine arguments documentation: https://docs.vllm.ai/en/v0.4.2/models/engine_args.html
- vLLM v0.4.2 AutoAWQ documentation: https://docs.vllm.ai/en/v0.4.2/quantization/auto_awq.html
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Hugging Face Hub environment variables documentation: https://huggingface.co/docs/huggingface_hub/main/en/package_reference/environment_variables
- Hugging Face model repository for TheBloke/Mistral-7B-Instruct-v0.2-AWQ: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-AWQ

## Issues Found
- The deployment used `--quantization awq` with the unquantized `mistralai/Mistral-7B-Instruct-v0.2` checkpoint. vLLM's AWQ documentation shows AWQ serving with an AWQ-quantized checkpoint, so the model was changed to `TheBloke/Mistral-7B-Instruct-v0.2-AWQ` and the comment was clarified.
- The deployment used the deprecated Hugging Face token environment variable `HUGGING_FACE_HUB_TOKEN`. The current Hugging Face Hub documentation lists `HF_TOKEN` as the replacement, so the environment variable was updated.
- The Kubernetes deployment did not provide expanded shared memory for the vLLM container. vLLM's Docker deployment documentation recommends `--ipc=host` or `--shm-size` because vLLM/PyTorch use shared memory, so an in-memory `emptyDir` was mounted at `/dev/shm`.
- The best-practices bullet implied that `--quantization awq` can be applied directly to any model. It was updated to state that the checkpoint should already be quantized for the selected quantization format.

## Review Notes
- The Flux `Kustomization` API version and `healthChecks` structure are current and match the official Flux documentation.
- The Kubernetes GPU resource example sets equal `requests` and `limits` for `nvidia.com/gpu`, which is permitted by Kubernetes. Kubernetes also allows specifying GPU limits only.
- The post still pins `vllm/vllm-openai:v0.4.2`, which is old but documented and compatible with the flags used in the article. A future refresh could update the image tag and examples to a newer vLLM release after testing model compatibility.
