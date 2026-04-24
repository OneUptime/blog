# Validation Summary: How to Debug Kubernetes Pod Failures in Portainer - K8s Pods

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Kubernetes UI
- Kubernetes Pods
- `kubectl`
- Kubernetes Events
- Kubernetes resource metrics
- Debug containers and node debugging

## Sources Consulted
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Debug Running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Portainer Applications: https://docs.portainer.io/user/kubernetes/applications
- Portainer Inspect an Application: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer Edit an Application: https://docs.portainer.io/user/kubernetes/applications/edit
- Netshoot image repository: https://github.com/nicolaka/netshoot

## Issues Found
1. Clarified Kubernetes status terminology in Step 1. The original text described `OOMKilled` as a pod state, but in Kubernetes it is a container termination reason. I updated the wording to distinguish pod statuses from container reasons and made the `Pending` description more precise.
2. Replaced the event commands in Step 2 with current `kubectl events` usage. The original example sorted by `.lastTimestamp`, which depends on a deprecated event field in newer Kubernetes event APIs. The revised commands use the current documented event listing and watching workflow.
3. Corrected the Portainer navigation paths for Events, Logs, and Console. Current Portainer documentation shows these under the application details view, with logs and console available from the `Application containers` section.
4. Fixed the resource usage section by changing `kubectl top nodes` to `kubectl top node`, which is the valid subcommand in current `kubectl`. I also added the required Metrics Server caveat because `kubectl top` does not work unless a compatible metrics provider is installed.
5. Corrected the YAML editing instructions for Portainer. Direct YAML editing is exposed through the `YAML` tab in Portainer Business Edition, and the current UI actions are `Update application` or `Apply changes` depending on how the application was deployed.
6. Updated the temporary debug Deployment to use a documented long-running `bash` loop for the `nicolaka/netshoot` image instead of `sleep infinity`, improving the likelihood that the example runs as written across image variants.
7. Normalized the `kubectl debug` pod example to the syntax shown in the current Kubernetes command reference, keeping the command behavior the same while matching the official form.

## Review Notes
- Local `kubectl` was not installed in the workspace, so CLI validation was done against the current official Kubernetes command reference pages instead of local `--help` output.
- Portainer UI labels can vary slightly between releases, but the revised paths and action labels align with the current Portainer 2.39/2.40 documentation.
- The temporary debug deployment still uses the `:latest` tag for `nicolaka/netshoot`. That is acceptable for a throwaway troubleshooting example, but pinning a specific tag would make the example more reproducible.
