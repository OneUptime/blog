# Validation Summary: Upgrade Calico on Self-Managed GCE Kubernetes Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Google Compute Engine
- Google Cloud VPC routes and firewall rules
- `kubectl`, `calicoctl`, `gcloud`, `gsutil`

## Sources Consulted
- Calico Open Source: Upgrade Calico on Kubernetes: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Open Source: Self-managed Kubernetes in Google Compute Engine: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/gce
- Calico Open Source: Google Compute Engine public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico Open Source: `calicoctl node status`: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Google Cloud SDK: `gcloud compute routes list`: https://cloud.google.com/sdk/gcloud/reference/compute/routes/list
- Google Cloud SDK: `gcloud compute firewall-rules`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/
- Google Cloud: routes-based cluster route behavior: https://cloud.google.com/kubernetes-engine/docs/how-to/routes-based-cluster
- Kubernetes: JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes: `kubectl rollout`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes: `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post described "native GCE routing" as if Calico programs `calico-*` GCE routes. Calico's GCE documentation describes GCE cloud routes as a Kubernetes GCE cloud-provider route-controller model with Calico in policy-only mode. Updated the explanation and prerequisites to reflect that route ownership and scope.
- The route validation commands filtered routes by `name:calico-*`, which is not guaranteed for GCE route-controller-created pod CIDR routes. Replaced those checks with commands that read each node's `spec.podCIDR` and query GCE routes by `destRange`.
- The upgrade flow applied only the Tigera Operator manifest and then applied the stock `custom-resources.yaml`. Current Calico operator upgrade documentation requires applying the target Calico CRDs and operator manifest with server-side force conflicts; applying the stock custom resources can overwrite cluster-specific `Installation`, `IPPool`, or policy-only settings. Updated the commands accordingly and added a caution to apply only reviewed custom manifests.
- The post used Calico v3.28.0 as the target version. Current Calico documentation reviewed for this validation is v3.32.0, so the target version in the commands was updated to `v3.32.0`.
- The `calicoctl node status` command was shown as a generic workstation command. Official Calico documentation notes it communicates with the local Calico agent, so the post now tells readers to run it from a node running `calico-node` and uses `sudo`.
- Firewall validation assumed firewall rule names beginning with `allow-calico*`, which is not an official naming convention. Updated the commands to list relevant firewall rule fields without relying on that name prefix.
- The post referred to cross-AZ testing. Google Cloud uses zones rather than AWS-style Availability Zones in user-facing GCE documentation, so this was changed to cross-zone.

## Review Notes
The corrected guide applies to clusters intentionally using GCE cloud routes or an equivalent route-based design. Clusters using Calico overlay networking on GCE should follow the Calico overlay guidance instead of relying on GCE route-table counts as the primary validation signal.
