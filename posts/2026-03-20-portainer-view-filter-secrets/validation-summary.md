# Validation Summary: How to View and Filter Secrets in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- jq
- OpenSSL
- Bash

## Sources Consulted
- Portainer docs, "ConfigMaps & Secrets": https://docs.portainer.io/2.27/user/kubernetes/configurations
- Portainer docs, "Add a Secret": https://docs.portainer.io/user/kubernetes/configurations/add-1
- Portainer docs, "Setup": https://docs.portainer.io/user/kubernetes/cluster/setup
- Kubernetes docs, "Secrets": https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes docs, "Managing Secrets using kubectl": https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/
- Kubernetes docs, "Field Selectors": https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes docs, "Distribute Credentials Securely Using Secrets": https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes docs, "Auditing": https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes docs, "Pull an Image from a Private Registry": https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- OpenSSL docs, "`openssl-x509`": https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The Portainer UI behavior around secret contents was incorrect. The post said Portainer showed keys only and masked values by default, but current Portainer docs state that users can view and edit Kubernetes secrets in the UI by default unless admins enable **Restrict secret contents access for non-admins (UI only)**. I corrected the introduction, the secret-details step, and the conclusion.
- The Portainer navigation and filtering wording was partially off. Portainer documents the Kubernetes path as **ConfigMaps & Secrets** with namespace filtering through the **Filter** control, not a namespace dropdown in the initial navigation flow. I updated those steps to match the documented UI.
- The audit section conflated Kubernetes Events with audit logs and mislabeled `metadata.creationTimestamp` as a last-modified timestamp. Kubernetes audit logs come from API server auditing, while Events only show object-related activity. I rewrote Step 7 to distinguish those concepts and corrected the timestamp description to creation time.
- The "check if a specific key exists" command was unreliable. With an empty jsonpath result, the `xargs` pipeline produced no output instead of reporting `Key missing`. I replaced it with a `jq -e '.data | has(...)'` check that returns the expected result for both present and absent keys.
- The unused-secret cleanup script could produce false positives. It filtered service-account token Secrets by name and missed common references from `initContainers`, `imagePullSecrets`, `DaemonSets`, `Jobs`, and `CronJobs`. I updated the script to filter by actual Secret type and inspect additional common workload reference paths.
- The decode-all example was too broad for arbitrary binary Secret data. I narrowed the wording to "text values" so the example better matches what `jq @base64d` is appropriate for in practice.

## Review Notes
- Portainer’s documentation explicitly covers namespace filtering on the **ConfigMaps & Secrets** page and the UI-only restriction for secret-content access. Other list controls may vary slightly by Portainer version, so the post now avoids overstating version-specific table behavior.
- The cleanup script still reports **potentially** unused secrets. Indirect references from custom controllers, external operators, or application-specific conventions may not be discoverable from standard pod-spec fields alone.
