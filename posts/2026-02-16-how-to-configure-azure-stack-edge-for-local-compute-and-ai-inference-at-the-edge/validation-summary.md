# Validation Summary: How to Configure Azure Stack Edge for Local Compute and AI Inference at the Edge

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Stack Edge
- Azure Stack Edge Pro GPU, Pro 2, and Mini R
- Azure IoT Edge
- Kubernetes on Azure Stack Edge
- NVIDIA GPU-enabled containers
- ONNX Runtime GPU
- Docker
- Azure Container Registry
- Azure CLI
- Azure Storage shares
- Python and Flask

## Sources Consulted
- Microsoft Learn: Azure Stack Edge documentation: https://learn.microsoft.com/en-us/azure/databox-online/
- Microsoft Learn: Connect to Azure Stack Edge Pro with GPU local web UI: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-deploy-connect
- Microsoft Learn: Azure Stack Edge Pro with GPU technical specifications: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-technical-specifications-compliance
- Microsoft Learn: Azure Stack Edge Pro 2 overview and technical specifications: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-pro-2-overview and https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-pro-2-technical-specifications-compliance
- Microsoft Learn: Azure Stack Edge Mini R technical specifications: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-mini-r-technical-specifications-compliance
- Microsoft Learn: Configure compute on Azure Stack Edge Pro / Pro 2: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-deploy-compute-module-simple and https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-pro-2-deploy-configure-compute
- Microsoft Learn: Kubernetes networking on Azure Stack Edge Pro GPU: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-kubernetes-networking
- Microsoft Learn: Manage compute on Azure Stack Edge Pro GPU: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-manage-compute
- Microsoft Learn: Configure IoT Edge module container create options and GPU access: https://learn.microsoft.com/en-us/azure/iot-edge/how-to-use-create-options and https://learn.microsoft.com/en-us/azure/iot-edge/configure-connect-verify-gpu
- Microsoft Learn: Manage Azure Stack Edge shares: https://learn.microsoft.com/en-us/azure/databox-online/azure-stack-edge-gpu-manage-shares
- Microsoft Learn: Azure CLI databoxedge device commands: https://learn.microsoft.com/en-us/cli/azure/databoxedge/device?view=azure-cli-latest
- ONNX Runtime documentation: GPU install and CUDA Execution Provider requirements: https://onnxruntime.ai/docs/install/ and https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html
- NVIDIA NGC CUDA container catalog: https://catalog.ngc.nvidia.com/orgs/nvidia/containers/cuda

## Issues Found
- The post listed Azure Stack Edge Pro with FPGA as a current model option. Microsoft documentation indicates Azure Stack Edge Pro FPGA devices reached end of life in February 2024, so this was replaced with current Pro 2 GPU model information.
- The Mini R description implied the same general GPU acceleration path as Pro GPU devices. It was clarified as a ruggedized device with an Intel Movidius Myriad X VPU.
- The prerequisites referred to the NVIDIA container toolkit as something the workload author needs on Azure Stack Edge. This was narrowed to familiarity with GPU-enabled containers because the device-managed runtime handles the appliance-side GPU integration.
- The local web UI login step incorrectly said the device password was on a label. Microsoft documentation lists `Password1` as the default password and requires changing it on first sign-in.
- The compute setup mixed Azure portal and local UI responsibilities. Kubernetes node and external service IPs are configured in the local UI, while the Azure portal creates the Kubernetes/IoT Hub resources. The step list was corrected.
- The post implied managed IoT Edge is still the normal path for all current Azure Stack Edge deployments. It now notes that Azure Stack Edge 2301 and later require deploying IoT Edge on an Ubuntu VM.
- The IoT Edge deployment manifest used object-form `createOptions`. Generated IoT Edge deployment manifests use a stringified JSON value for `createOptions`, so the manifest was corrected.
- The Dockerfile used a CUDA 11.8/cuDNN 8 base image while installing the default current `onnxruntime-gpu` package from PyPI. ONNX Runtime GPU defaults to CUDA 12.x packages since 1.19, so the base image was updated to a CUDA 12.6 cuDNN runtime image.
- The share creation settings treated "Block blob" as the share type and described upload as scheduled. Azure Stack Edge share type is SMB or NFS; Block blob is the storage service for a cloud share, and cloud shares automatically upload to the mapped storage account. The storage steps and explanation were corrected.

## Review Notes
The Python Flask example and JSON syntax were checked locally for syntax. The Azure CLI command group was verified against Microsoft Learn, but the local environment does not have Azure CLI installed, so the command could not be tested locally with `az --help`.
