# Validation Summary: How to Use ROCm in Podman Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- ROCm
- Podman
- HIP
- rocBLAS
- PyTorch
- TensorFlow
- JAX
- Linux GPU device access

## Sources Consulted
- AMD ROCm container guidance: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/how-to/docker.html
- AMD ROCm 6.0 container guidance: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.0.0/how-to/docker.html
- AMD ROCm prerequisites and group permissions: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.4.1/install/prerequisites.html
- AMD PyTorch on ROCm installation: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/3rd-party/pytorch-install.html
- AMD TensorFlow on ROCm installation: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-7.1.1/install/3rd-party/tensorflow-install.html
- AMD JAX on ROCm installation: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.4.2/install/3rd-party/jax-install.html
- AMD JAX compatibility: https://rocm.docs.amd.com/en/latest/compatibility/ml-compatibility/jax-compatibility.html
- AMD HIP kernel launch documentation: https://rocm.docs.amd.com/projects/HIP/en/docs-6.1.0/reference/kernel_language.html
- AMD HIP porting guide and file-extension guidance: https://rocm.docs.amd.com/projects/HIP/en/docs-6.1.1/how-to/hip_porting_guide.html
- AMD HIP device properties reference: https://rocm.docs.amd.com/projects/HIP/en/docs-5.6.1/.doxygen/docBin/html/structhip_device_prop__t.html
- AMD ROCm environment variables: https://rocm.docs.amd.com/en/latest/reference/env-variables.html
- AMD rocprof tracing documentation: https://rocm.docs.amd.com/projects/rocprofiler/en/latest/how-to/using-rocprof.html
- AMD rocBLAS overview and storage-layout note: https://rocm.docs.amd.com/projects/rocBLAS/en/latest/what-is-rocblas.html
- AMD rocBLAS API reference for `rocblas_sgemm`: https://rocm.docs.amd.com/projects/rocBLAS/en/latest/reference/level-3.html
- PyTorch HIP semantics: https://docs.pytorch.org/docs/2.11/notes/hip.html
- Podman `run` reference for `--group-add keep-groups`: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman device and SELinux notes: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman pod/device SELinux guidance: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html

## Issues Found
- The original container image tags were stale and no longer matched current AMD guidance. I replaced the pinned `6.0` examples with currently documented tags such as `rocm/dev-ubuntu-22.04:latest`, `rocm/pytorch:latest`, `rocm/tensorflow:latest`, and `rocm/jax-community:latest`.
- The original Podman commands used `--group-add video`, which is the Docker-style pattern AMD documents, but is not the correct rootless Podman fix for group-based device access. I changed the Podman run examples to `--group-add keep-groups` and noted that this requires the `crun` OCI runtime, per Podman documentation.
- The HIP sample printed `hipDeviceProp_t.gcnArch`, which AMD documents as deprecated. I updated the sample to print `gcnArchName` instead and renamed the sample file to `vector_add.hip.cpp`, which matches AMD’s recommended extension guidance.
- The PyTorch sample claimed `torch.cuda.is_available()` meant “ROCm (HIP) available”. PyTorch’s official HIP semantics document says `torch.cuda` is shared across CUDA and HIP, and `torch.version.hip` is the correct way to distinguish a HIP build. I updated the sample output accordingly.
- The PyTorch container run command was missing the shared-memory settings AMD currently recommends for framework containers. I added `--ipc=host` and `--shm-size 8G` to the PyTorch example.
- The profiling section labeled `rocprof --hsa-trace` as “hardware counters”, which is incorrect. I corrected the text to describe it as an HSA-level trace.
- The environment-variable section used `GPU_MAX_ALLOC_PERCENT`, which is not the current documented variable name. I replaced it with `GPU_SINGLE_ALLOC_PERCENT` and also replaced the undocumented `HSA_OVERRIDE_GFX_VERSION` example with documented variables.
- The troubleshooting section recommended `HSA_OVERRIDE_GFX_VERSION` for consumer GPUs without an official current ROCm reference. I replaced that with a Podman SELinux troubleshooting step that is documented by Podman for passed-through devices.
- The description of `rocm/rocm-terminal` was inaccurate. AMD documents it as a small image with the prerequisites to build HIP applications, not merely a monitoring image, so I corrected that description.
- The conclusion overstated Podman as a rootless security model in general. I adjusted the wording to “daemonless, rootless-capable model” for accuracy.

## Review Notes
- The post is now technically accurate as of 2026-05-07, but it intentionally uses `:latest` tags for several images to avoid stale version pins. For fully reproducible environments, a future update should pin exact currently validated AMD image tags from the ROCm compatibility and framework-installation pages.
- `--group-add keep-groups` is the correct rootless Podman pattern for device access through supplementary groups, but Podman documents it as dependent on the `crun` OCI runtime. Systems using a different OCI runtime may need an alternate Podman configuration.
- ROCm container success still depends on host GPU, kernel, and driver compatibility. AMD’s compatibility matrix should be checked before readers copy these commands onto unsupported Radeon or Instinct hardware.
