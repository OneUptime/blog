# Validation Summary: How to Run Privileged Containers in Portainer - Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker containers
- Docker CLI `docker run`
- Linux devices, sysctls, capabilities, shared memory, and DNS options
- NVIDIA GPU container runtime support
- TensorFlow and PyTorch container images

## Sources Consulted
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Engine guide for runtime privilege, Linux capabilities, and device access: https://docs.docker.com/engine/containers/run/
- Portainer documentation for adding containers: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer documentation for advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- NVIDIA Container Toolkit installation and Docker configuration documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit sample Docker workload documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/sample-workload.html
- TensorFlow Docker documentation: https://www.tensorflow.org/install/docker
- PyTorch official repository Docker image notes: https://github.com/pytorch/pytorch#docker-image

## Issues Found
- The introduction said Portainer exposes Docker's full feature set through the web UI. Changed this to "many Docker runtime options" because Portainer documents a range of advanced container settings, not every Docker feature.
- The access instructions said "creating or editing" but pointed only to **Containers > Add container**. Updated the wording to cover container creation, which matches the listed navigation steps.
- The Portainer UI paths used "Advanced settings" and "GPUs". Updated them to match current Portainer documentation: "Advanced container settings", "Runtime", and "GPU".
- The Nginx capabilities example dropped all capabilities but added back too few for a default root-starting Nginx container. Added `DAC_OVERRIDE`, `SETGID`, and `SETUID` alongside `CHOWN` and `NET_BIND_SERVICE` to better align the example with Docker capability semantics.
- The privileged-mode comment said privileged containers have full host access. Reworded it to say they get broad access to host devices and kernel capabilities, which better matches Docker's description of `--privileged`.

## Review Notes
The Docker command flags shown in the post are current and match Docker's documented `docker run` options. Docker CLI execution could not be tested locally because the `docker` command is not installed in this workspace.
