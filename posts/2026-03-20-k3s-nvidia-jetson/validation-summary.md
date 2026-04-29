# Validation Summary: How to Install K3s on NVIDIA Jetson

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- NVIDIA Jetson
- NVIDIA Container Toolkit / NVIDIA Container Runtime
- containerd
- NVIDIA k8s-device-plugin
- CUDA
- JetPack / Jetson Linux

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.15.0/install-guide.html
- NVIDIA k8s-device-plugin README: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA JetPack 5.1.3 install guide: https://docs.nvidia.com/jetson/jetpack/5.1.3/install-jetpack/index.html
- NVIDIA JetPack 6.1 install/setup guide: https://docs.nvidia.com/jetson/jetpack/6.1/install-setup/index.html
- NVIDIA JetPack 6.1 release notes: https://docs.nvidia.com/jetson/jetpack/6.1/release-notes/index.html
- NVIDIA Jetson Linux r35.3.1 release notes: https://docs.nvidia.com/jetson/archives/r35.3.1/ReleaseNotes/Jetson_Linux_Release_Notes_r35.3.1.pdf
- NVIDIA Jetson Linux r35.6.0 release notes: https://docs.nvidia.com/jetson/archives/r35.6.0/ReleaseNotes/Jetson_Linux_Release_Notes_r35.6.0.pdf
- NVIDIA Tegrastats utility docs: https://docs.nvidia.com/jetson/archives/r36.5/DeveloperGuide/AT/JetsonLinuxDevelopmentTools/TegrastatsUtility.html
- NVIDIA TensorFlow for Jetson release notes: https://docs.nvidia.com/deeplearning/frameworks/pdf/Install-TensorFlow-Jetson-Platform-Release-Notes.pdf

## Issues Found
- The post claimed JetPack 5.x/6.x coverage for Jetson Nano. NVIDIA’s JetPack 5.x and 6.x documentation supports Xavier- and Orin-based Jetson hardware, not Jetson Nano, so I removed the Jetson Nano claim and updated the supported-device language.
- The post used `nvidia-smi` for Jetson verification and monitoring. NVIDIA documents that `nvidia-smi` is not supported on Jetson, so I replaced those checks with `tegrastats`.
- The post treated K3s like stock containerd and configured `/etc/containerd/config.toml` with `nvidia-ctk`. K3s manages its own containerd config, so I changed the instructions to K3s’ documented auto-detection flow and updated the optional manual template to the current K3s v3 template format.
- The manual K3s containerd template in the post used an older config structure. I replaced it with a current `config-v3.toml.tmpl` example based on K3s’ documented containerd 2.0 template layout.
- The NVIDIA device plugin install URL was outdated and incorrect. I updated it to the current static manifest path and current documented release series.
- GPU workloads in K3s need the NVIDIA runtime selected unless the node default runtime is changed. I added `runtimeClassName: nvidia` to the workload example so the pod spec matches K3s’ documented NVIDIA runtime usage.
- The time-slicing example was not valid for current NVIDIA device plugin configuration and did not show how to apply it. I replaced it with a valid time-slicing config and a Helm deployment example based on the plugin’s official configuration flow.

## Review Notes
- The `l4t-*` container image tag must match the JetPack / L4T release on the Jetson. The post now calls this out explicitly in the workload example.
- Step 6 uses the static NVIDIA device plugin manifest, which is fine for basic GPU exposure. Advanced options such as time-slicing are handled through the Helm-based flow shown in Step 8.
