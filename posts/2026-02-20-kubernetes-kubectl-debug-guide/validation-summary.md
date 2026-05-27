# Validation Summary: How to Use kubectl debug for Kubernetes Pod Troubleshooting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl debug
- Ephemeral containers
- Pod debugging
- Node debugging
- Container debug images

## Sources Consulted
- Kubernetes kubectl debug command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debug Running Pods task guide: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Debugging Nodes With Kubectl task guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes Ephemeral Containers concept guide: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/

## Issues Found
- The post said `--target` enables process namespace sharing. Updated this to say it targets the process namespace of the specified container and depends on container runtime support, matching the Kubernetes documentation.
- A copied-pod example was described as overriding the command to sleep, but the command shown was `/bin/sh`. Updated the comment to accurately describe the shell command.
- A copied-pod example changed a container image and command without specifying `--container`. Added `--container=my-container` because Kubernetes documentation notes that overriding a specific container command requires the container name; otherwise `kubectl debug` may create a new container for the command.
- The node debugging section said the default command creates a privileged pod, then used `chroot /host`. Updated the command to include `--profile=sysadmin` and clarified that this flag creates the privileged debug pod needed for that workflow.

## Review Notes
- `kubectl` was not installed in the local environment, so command verification was performed against official Kubernetes documentation instead of local `kubectl debug --help`.
- Some tools shown inside debug images, such as `curl`, `ss`, `journalctl`, `crictl`, and `iptables`, depend on the selected image and node environment. The examples are reasonable troubleshooting recipes, but readers may need to install missing tools in a generic Ubuntu debug image.
