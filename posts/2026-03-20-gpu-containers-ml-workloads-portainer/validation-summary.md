# Validation Summary: How to Set Up GPU Containers for ML Workloads in Portainer - Workloads

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- NVIDIA Container Toolkit
- NVIDIA NGC
- NVIDIA DCGM Exporter
- PyTorch
- CUDA / NVIDIA GPUs

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit sample workload: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/sample-workload.html
- NVIDIA Container Toolkit supported platforms: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/supported-platforms.html
- Docker Compose GPU support: https://docs.docker.com/compose/gpu-support/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Portainer advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Portainer registry management: https://docs.portainer.io/admin/registries
- NVIDIA NGC catalog user guide: https://docs.nvidia.com/ngc/latest/ngc-catalog-user-guide.html
- NVIDIA PyTorch 24.01 release notes: https://docs.nvidia.com/deeplearning/frameworks/pytorch-release-notes/rel-24-01.html
- NVIDIA Deep Learning Frameworks user guide: https://docs.nvidia.com/deeplearning/frameworks/user-guide/index.html
- PyTorch CUDA API docs: https://docs.pytorch.org/docs/stable/generated/torch.cuda.is_available and https://docs.pytorch.org/docs/2.9/generated/torch.cuda.get_device_name.html
- NVIDIA DCGM Exporter docs: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- NVIDIA dcgm-exporter official repository quickstart: https://github.com/NVIDIA/dcgm-exporter

## Issues Found
- The prerequisites section was too narrow and slightly outdated. It listed specific GPU families and only Ubuntu 20.04/22.04, while current NVIDIA support documentation is broader. I changed this to a supported NVIDIA GPU and Ubuntu 20.04/22.04/24.04 or another supported Linux distribution.
- The prerequisites section did not make driver/container compatibility explicit for the pinned NVIDIA framework images. I updated the driver prerequisite to note that the installed host driver must be compatible with the container image being used.
- The NVIDIA Container Toolkit install block omitted the prerequisite packages from NVIDIA's current apt-based installation flow. I added the documented `ca-certificates`, `curl`, and `gnupg2` prerequisite install step.
- The validation command used a CUDA-tagged container image for `nvidia-smi`, which can introduce unnecessary CUDA/driver compatibility coupling during a basic toolkit verification. I replaced it with NVIDIA's documented sample workload command using `ubuntu`.
- The Portainer section did not mention that Portainer's built-in GPU controls are currently limited to Docker Standalone environments and NVIDIA GPUs. I added that constraint to avoid incorrect expectations on other environment types.
- The post used `nvcr.io/nvidia/pytorch` images without noting that access to `nvcr.io` must be configured. I added a short note to authenticate to `nvcr.io` through the host or Portainer before deployment.
- The training-job comment said `count: 1` would reserve exactly one GPU. I changed the comment to "Request 1 GPU" to better match Docker's device reservation semantics.
- The `dcgm-exporter` example was missing the `SYS_ADMIN` capability shown in NVIDIA's official quickstart and used an older pinned image tag. I updated the image tag to the current official quickstart tag and added `cap_add: [SYS_ADMIN]`.
- The multi-GPU section described `ipc: host` as required. NVIDIA's documentation frames this as a way to avoid shared-memory limits rather than a hard requirement in every case, so I corrected that wording.

## Review Notes
- The post is technically sound after the corrections above.
- Several examples intentionally pin NVIDIA image tags, so they should be refreshed periodically as NVIDIA publishes new container releases.
- Portainer GPU UI behavior is specifically documented for Docker Standalone; readers using Swarm or Kubernetes should not assume the same UI or workflow applies.
