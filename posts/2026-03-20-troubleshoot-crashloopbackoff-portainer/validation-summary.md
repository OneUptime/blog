# Validation Summary: How to Troubleshoot CrashLoopBackOff Errors in Portainer - Troubleshoot

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Kubernetes Pods and container lifecycle
- Kubernetes resource requests and limits

## Sources Consulted
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Logging Architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Define a Command and Arguments for a Container documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes Define Environment Variables for a Container documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes Configure Pod Initialization documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-initialization/
- Portainer Kubernetes pod access guide: https://www.portainer.io/how-to/kubernetes-access-logs
- Portainer kubectl shell documentation: https://docs.portainer.io/user/kubernetes/kubectl

## Issues Found
- The post stated that CrashLoopBackOff means the application is exiting with a non-zero exit code. Kubernetes can restart containers after any termination under `restartPolicy: Always`, and CrashLoopBackOff can also involve system kills or failing liveness/startup probes, so the introduction was corrected.
- The post implied that exit codes are found in pod events. Kubernetes exposes exit code and reason in the terminated container status, commonly visible through pod details or `kubectl describe pod`, so the diagnostic flow and Step 2 were corrected.
- The post treated exit code 137 as synonymous with OOMKilled. Exit code 137 indicates SIGKILL; it is an OOMKilled case when the terminated reason is `OOMKilled`, so the table and memory-limit step were corrected.
- The `kubectl logs --previous` example omitted the multi-container pod caveat. Added a note to use `-c <container-name>` when the pod has more than one container.
- The post listed `OOMKilled` as a log message. It is normally a container status reason, so the wording was updated to distinguish status reasons from application log messages.
- The debug init container guidance could imply that an init container automatically sees the failing container's configured environment. The text now says to use the same Kubernetes `env` or `envFrom` entries.
- The debug command example assumed every image includes `sleep`. The text now says to use a long-running command that exists in the image.

## Review Notes
Portainer's current public docs confirm Kubernetes pod log and console access, while Kubernetes documentation confirms previous-container logs through the Pod log API and `kubectl logs --previous`. The Portainer UI label for previous or terminated container logs may vary by version, so the post now avoids depending on an exact control label.
