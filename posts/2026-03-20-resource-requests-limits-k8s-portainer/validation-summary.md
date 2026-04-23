# Validation Summary: How to Set Resource Requests and Limits for Kubernetes Apps in Portainer - K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes Deployments
- Kubernetes resource requests and limits
- Kubernetes LimitRange
- kubectl
- jq

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Assign CPU Resources to Containers and Pods: https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/
- Kubernetes Assign Memory Resources to Containers and Pods: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Portainer Add a new application using a form: https://docs.portainer.io/2.27/user/kubernetes/applications/add
- Portainer Kubernetes cluster setup: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer ResourceReservationFormSection source: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/react/kubernetes/applications/components/ResourceReservationFormSection/ResourceReservationFormSection.tsx
- Portainer Kubernetes deployment converter source: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/kubernetes/converters/deployment.js
- jq manual: https://jqlang.org/manual/

## Issues Found
- The Portainer UI instructions described four separate request/limit fields and Kubernetes quantity units. Portainer's application form exposes CPU limit and Memory limit (MB) under Resource reservations, then applies those values as both Kubernetes requests and limits. Updated the instructions and noted that separate request and limit values require manifest editing.
- The Deployment YAML placed `containers` directly under `spec`, which is a Pod spec shape, not a Deployment template path. Updated the example to use `spec.template.spec.containers`.
- The `kubectl top pods` examples were changed to the official `kubectl top pod` form from the Kubernetes command reference.
- The events command claimed to check CPU throttling, but Kubernetes events are not a reliable source for CPU throttling. Updated the comment to check for OOMKills or evictions.
- The OOMKilled jq command claimed to find events from the last hour but did not filter by time. Updated the comment and made the jq filter handle missing `containerStatuses` safely while showing namespace, pod, and container name.

## Review Notes
The sizing table is technically plausible as example guidance, but real production values should be based on observed workload behavior. `kubectl top` requires the Kubernetes metrics API, such as metrics-server, to be installed and working.
