# Validation Summary: How to Deploy Computer Vision Applications at the Edge with MicroShift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat build of MicroShift
- Kubernetes Deployments, Services, NodePort, hostPath volumes, and device plugin GPU resources
- CRI-O
- NVIDIA Container Toolkit
- NVIDIA Kubernetes device plugin
- OpenShift Security Context Constraints
- RHEL for Edge and rpm-ostree

## Sources Consulted
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Cloud Native Reference Architecture, Accelerating workloads with NVIDIA GPUs on Red Hat Device Edge: https://docs.nvidia.com/datacenter/cloud-native/edge/latest/nvidia-gpu-with-device-edge.html
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes hostPath volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Red Hat build of MicroShift running applications documentation, pod security authentication and authorization: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.15/html/running_applications/authentication-with-microshift
- Red Hat build of MicroShift embedding in a RHEL for Edge image documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html/embedding_in_a_rhel_for_edge_image/index
- Red Hat Enterprise Linux 9 RHEL for Edge image documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/introducing-rhel-for-edge-images_composing-installing-managing-rhel-for-edge-images

## Issues Found
- The NVIDIA Container Toolkit repository URL used a version-specific `rhel9.0` path. Updated it to NVIDIA's current stable RPM repository URL.
- The CRI-O runtime configuration omitted `--set-as-default` and an explicit drop-in path used by NVIDIA's Red Hat Device Edge guidance. Updated the command accordingly.
- The NVIDIA Container Toolkit setup omitted the `container_use_devices` SELinux boolean recommended for RHEL 9 GPU workloads. Added `sudo setsebool -P container_use_devices on`.
- The post requested `nvidia.com/gpu` in the workload but did not install the NVIDIA Kubernetes device plugin, so MicroShift would not advertise that resource. Added the static manifest installation steps for MicroShift.
- The workload uses `privileged: true` and a host device mount but did not grant the namespace service account permission to use the privileged SCC. Added `oc adm policy add-scc-to-user privileged -z default -n vision`.
- The `/dev/video0` hostPath did not specify the device type. Added `type: CharDevice` so Kubernetes validates that the mounted path is a Linux character device.
- The description referred to GPU passthrough, which is more precise for VM passthrough than this containerized Kubernetes GPU-device-plugin flow. Changed it to GPU access.

## Review Notes
The image `quay.io/example/yolo-inference:latest` is a placeholder and must be replaced with a real inference image before deployment. The guide is otherwise technically consistent for a single-node MicroShift edge deployment, assuming the NVIDIA driver is installed and the RHEL/MicroShift versions are supported together.
