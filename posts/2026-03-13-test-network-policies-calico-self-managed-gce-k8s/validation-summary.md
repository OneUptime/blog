# Validation Summary: How to Test Network Policies with Calico on GCE Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- Calico CNI
- Calico GlobalNetworkPolicy
- Google Compute Engine
- Google Cloud CLI
- kubectl
- calicoctl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy tiers and policy evaluation documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico default deny policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico on Google Compute Engine documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- GKE Dataplane V2 documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- GKE network policy documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- gcloud compute instances list reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/list

## Issues Found
- The introduction overgeneralized GKE as always running Calico in policy-only mode. Current GKE network policy behavior depends on the selected GKE dataplane: the legacy dataplane uses Calico, while GKE Dataplane V2 uses Cilium/eBPF with built-in NetworkPolicy enforcement. Updated the wording to avoid the inaccurate blanket comparison.
- Step 8 claimed to create pods in different GCE zones and verify cross-zone enforcement, but the command snippet only selected node names. Added commands to schedule a client pod onto the zone A node, schedule a server pod onto the zone B node, wait for both pods to become Ready, retrieve the zone B server pod IP, and test connectivity from the zone A client under the existing policies.

## Review Notes
- The Kubernetes NetworkPolicy manifests use the current `networking.k8s.io/v1` API and valid selectors, policy types, and port rules.
- The Calico GlobalNetworkPolicy uses the current `projectcalico.org/v3` API and valid rule fields. The namespace selector uses the standard Kubernetes namespace name label, which Calico documentation uses in current default-deny examples.
- The DNS egress allow rule permits DNS by destination port only. That is valid for a tutorial, but a production policy should usually restrict DNS egress to the cluster DNS pods or service.
