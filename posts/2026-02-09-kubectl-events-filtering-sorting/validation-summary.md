# Validation Summary: How to Use kubectl events to View Cluster Events with Filtering and Sorting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Events
- Shell scripting
- jq

## Sources Consulted
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes events.k8s.io/v1 Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubernetes core/v1 Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes kube-apiserver reference for --event-ttl default: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
- The post used unsupported `kubectl events` flags: `--field-selector`, `--sort-by`, `-o wide`, `-o custom-columns`, and `--limit`. Updated examples to use `kubectl get events` for field selectors, sorting, wide output, and custom columns, and removed the unsupported `--limit` example.
- The post implied `kubectl events` itself provides sorting and generic field-selector filtering. Updated the description, introduction, and conclusion to distinguish `kubectl events` from `kubectl get events`.
- Object-specific filtering examples used `--field-selector involvedObject.name=...` with `kubectl events`. Updated those examples to use the supported `kubectl events --for TYPE/NAME` syntax.
- Event JSON parsing examples mixed `kubectl events` with core/v1-style fields. Updated scripts that parse `.message`, `.involvedObject`, `.lastTimestamp`, and field selectors to use `kubectl get events -o json`.
- Event retention text said newer Kubernetes versions support longer retention. Replaced it with the accurate note that event retention defaults to one hour unless the API server `--event-ttl` is changed.
- Configuration update wording implied Kubernetes reliably emits events for ConfigMap and Secret changes. Updated wording to say these commands show events involving those resources when controllers emit them.
- The shell monitoring example used unquoted JSON variable expansion while parsing events. Quoted the variable and used `IFS= read -r` to avoid mangling JSON lines.

## Review Notes
The corrected post is technically accurate for current Kubernetes documentation. Some examples still depend on event producers emitting specific reason strings, which Kubernetes documents as best-effort event data rather than a stable contract.
