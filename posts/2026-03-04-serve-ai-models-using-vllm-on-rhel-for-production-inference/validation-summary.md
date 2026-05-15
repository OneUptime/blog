# Validation Summary: How to Serve AI Models Using vLLM on RHEL for Production Inference

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- NVIDIA drivers and CUDA Toolkit
- Python virtual environments and pip
- vLLM
- Hugging Face model access tokens
- OpenAI-compatible HTTP APIs
- systemd
- firewalld

## Sources Consulted
- vLLM GPU installation documentation: https://docs.vllm.ai/en/stable/getting_started/installation/gpu/
- vLLM OpenAI-compatible server documentation: https://docs.vllm.ai/en/stable/serving/openai_compatible_server/
- vLLM engine arguments documentation: https://docs.vllm.ai/en/stable/configuration/engine_args/
- NVIDIA CUDA Installation Guide for Linux, RHEL 9 / Rocky 9 sections: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- Red Hat RHEL 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/
- Hugging Face Hub environment variables documentation: https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- systemd service and execution environment manual pages: https://www.freedesktop.org/software/systemd/man/systemd.service.html and https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The CUDA section was titled as installing NVIDIA drivers and CUDA, but it only installed the CUDA toolkit. Added the RHEL 9 kernel header preparation, NVIDIA `nvidia-driver:latest-dkms` module install, cache refresh, and reboot step from NVIDIA's RHEL 9 installation flow.
- The vLLM install command used plain `pip install vllm`, which can select incompatible or non-CUDA PyTorch wheels on current installs. Updated it to use the PyTorch CUDA 12.9 wheel index, matching current vLLM prebuilt wheel guidance.
- The post used `python -m vllm.entrypoints.openai.api_server` for serving. Updated examples to the documented `vllm serve` CLI while keeping the same model and flags.
- The systemd service referenced `User=vllm` and `/home/vllm/vllm-env` without creating that user or environment. Added commands to create the service user and install vLLM into the referenced virtual environment.
- The Python prerequisite listed only Python 3.10 or 3.11. Updated it to Python 3.10 to 3.13 to match current vLLM support.

## Review Notes
The examples still use gated Meta Llama models, so users must have accepted the model license and configured `HF_TOKEN`. Commands were reviewed against official documentation but not executed locally because this workspace does not provide a RHEL 9 NVIDIA GPU host.
