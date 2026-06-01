# Validation Summary: How to Deploy AI Models at the Edge Using Azure Stack Edge

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Stack Edge Pro GPU
- Azure Machine Learning SDK v2
- Azure IoT Edge
- Azure IoT Hub
- Azure Container Registry
- Docker
- Python
- PyTorch and TorchVision
- ONNX and ONNX Runtime GPU
- Flask
- Azure IoT Device SDK for Python

## Sources Consulted
- Azure IoT Edge overview: https://learn.microsoft.com/en-us/azure/iot-edge/about-iot-edge
- Azure IoT Edge deployment manifests and routes: https://learn.microsoft.com/en-us/azure/iot-edge/module-composition
- Azure IoT Edge CLI deployment: https://learn.microsoft.com/en-us/azure/iot-edge/how-to-deploy-modules-cli
- Azure IoT Edge GPU module configuration: https://learn.microsoft.com/en-us/azure/iot-edge/configure-connect-verify-gpu
- Azure Stack Edge Pro GPU IoT Edge GPU sharing: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-deploy-iot-edge-gpu-sharing
- Azure Stack Edge Pro IoT Edge module deployment: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-deploy-stateless-application-iot-edge-module
- Azure Machine Learning SDK v2 training jobs: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-train-model?view=azureml-api-2
- Azure Machine Learning model registration: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-models?view=azureml-api-2
- Azure Container Registry `az acr build`: https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest#az-acr-build
- TorchVision ResNet-18 API: https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.resnet18.html
- ONNX Runtime CUDA Execution Provider compatibility: https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html
- ONNX Runtime install guide: https://onnxruntime.ai/docs/install/
- NVIDIA CUDA container tags: https://catalog.ngc.nvidia.com/orgs/nvidia/containers/cuda/tags

## Issues Found
- The training script used `torchvision.datasets.ImageFolder` without importing `torchvision`. Updated the import to include `datasets` and changed the call to `datasets.ImageFolder`.
- The training script used TorchVision's deprecated `pretrained=True` argument. Updated it to use `ResNet18_Weights.DEFAULT`, which is the current TorchVision weights API.
- The Azure ML training snippet said it waited for completion but only submitted the job. Added `ml_client.jobs.stream(returned_job.name)` and used an `Output(type=AssetTypes.URI_FOLDER)` object for the named model output.
- The model registration snippet used a local `outputs/defect_detector.onnx` path and assumed `ml_client` already existed. Updated it to create an `MLClient` and register from the Azure ML job output URI.
- The inference script used `np.softmax`, which NumPy does not provide. Added a local stable softmax helper.
- The inference preprocessing could produce a `float64` tensor after normalization, while the exported PyTorch ONNX model expects `float32`. Updated normalization arrays and final input casting to preserve `float32`.
- The Dockerfile used a CUDA runtime image without cuDNN even though `onnxruntime-gpu==1.16.0` requires CUDA 11.x and cuDNN 8.x. Updated the base image to `nvcr.io/nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04`.
- The IoT Edge manifest used `createOptions` as a JSON object. IoT Edge deployment manifests represent Docker create options as a JSON string, so the manifest was updated accordingly.
- The IoT Edge manifest omitted registry credentials for the private Azure Container Registry image and did not include GPU visibility configuration. Added placeholder `registryCredentials` and `NVIDIA_VISIBLE_DEVICES`.

## Review Notes
The article is now technically consistent with current Azure IoT Edge 1.5, Azure Machine Learning SDK v2, TorchVision, and ONNX Runtime guidance. The example remains a simplified tutorial; a production version should avoid embedding ACR passwords directly in files, add authentication/TLS around the Flask endpoint, and integrate the monitoring function into the deployed module if telemetry is required.
