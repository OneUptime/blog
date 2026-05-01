# Validation Summary: How to Edit a Running Kubernetes Application in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Kubernetes Deployments
- Rolling updates

## Sources Consulted
- Portainer Documentation: Applications overview - https://docs.portainer.io/user/kubernetes/applications
- Portainer Documentation: Edit an application - https://docs.portainer.io/user/kubernetes/applications/edit
- Portainer Documentation: Inspect an application - https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer Documentation: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes Documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Documentation: Update a Deployment Without Downtime - https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Documentation: `kubectl set image` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Documentation: `kubectl set env` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes Documentation: `kubectl scale` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes Documentation: `kubectl edit` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_edit/
- Kubernetes Documentation: `kubectl patch` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Documentation: `kubectl rollout status` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes Documentation: `kubectl rollout undo` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes Documentation: `kubectl rollout history` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/

## Issues Found
- The post originally implied that every Portainer application edit returns to the same pre-populated form. I changed this to reflect Portainer's documented behavior: edit options depend on how the application was originally deployed, and only applications deployed from a form reopen that form.
- The original edit instructions used a generic `Edit` label and omitted the documented `Edit external application` action. I corrected the action labels to match Portainer's current documentation.
- The `What You Can Edit` section used several generic labels that did not line up well with Portainer's Kubernetes form terminology. I updated them to more accurate Portainer terms such as `Image`, `Instance count`, `Resource requests and limits`, `Persisted folders`, and `Service publishing`.
- The post stated that Portainer automatically triggers a Kubernetes rolling update without qualification. I corrected this to the accurate Deployment-specific behavior: a rolling update happens when the application is backed by a Deployment and the change updates the pod template.
- The YAML editing section described an `Advanced` or `YAML` toggle and an `Update` button. Portainer's documented workflow is to use the application's `YAML` tab, which is available in Portainer Business Edition, and then click `Apply changes`. I updated the section accordingly.
- The conclusion overstated the YAML editor as providing "the full power of kubectl". I revised this to the narrower, accurate description that it lets you edit the generated manifest directly.

## Review Notes
- The `kubectl` examples are syntactically valid and align with current Kubernetes documentation.
- The CLI examples assume the application is managed by a Kubernetes `Deployment` and that the container name is `my-app`; readers using a different controller or container name would need to adjust the commands.
- Local `kubectl --help` verification was not possible in this workspace because `kubectl` is not installed. Command validation was completed against official Kubernetes documentation.
