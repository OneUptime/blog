# Validation Summary: How to Avoid Common Mistakes with Calico Product Editions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise
- Calico Cloud
- Kubernetes
- Calico CNI
- Calico policy resources and tiers
- calicoctl
- kubectl

## Sources Consulted
- Tigera Calico Open Source resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Tigera Calico Open Source Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Tigera Calico Enterprise Tier resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/tier
- Tigera Calico Enterprise policy tiers guide: https://docs.tigera.io/calico-enterprise/latest/network-policy/policy-tiers/tiered-policy
- Tigera Calico Enterprise GlobalThreatFeed resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalthreatfeed
- Tigera Calico Enterprise PacketCapture resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/packetcapture
- Tigera Calico Enterprise policy recommendations documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/recommendations/policy-recommendations
- Tigera Calico Cloud architecture documentation: https://docs.tigera.io/calico-cloud/get-started/cc-arch-diagram
- Tigera Calico Cloud flow log data types: https://docs.tigera.io/calico-cloud/observability/elastic/flow/datatypes
- Tigera Calico Open Source Kubernetes requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Tigera Calico 3.24 Kubernetes requirements archive: https://docs.tigera.io/calico/3.24/getting-started/kubernetes/requirements
- Tigera calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Tigera Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Tigera Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Tigera Calico Enterprise installation options: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/kubernetes/options-install

## Issues Found
- The post incorrectly listed `Tier` as an Enterprise-only CRD. Current Calico Open Source documents `Tier` as a supported resource, so I changed the text to list Enterprise-only examples such as `GlobalThreatFeed`, `PacketCapture`, and policy recommendation configuration resources, and clarified that `Tier` alone is not an Enterprise compatibility signal.
- The CRD verification command used `kubectl get crd | grep calico`, which can miss the practical question of which Calico API resources `kubectl` can use. I changed it to `kubectl api-resources | grep projectcalico.org`.
- The post said the Enterprise `default` tier has lower priority than any named tier. Tigera documents tiers as ordered by numeric `order`, with lower values evaluated first, and the default tier fixed at order `1,000,000`. I changed the wording to say named tiers with lower order values have higher priority.
- The post described the Calico Enterprise API server as using the `crd.projectcalico.org` API group. Tigera documents user-facing Calico APIs as `projectcalico.org/v3`, while `crd.projectcalico.org/v1` is used as backing storage in aggregation API server mode. I corrected the API group and noted the newer native v3 CRD option.
- The API server health check used a pod label query that may not match current Enterprise installation guidance. I changed it to `kubectl get tigerastatus apiserver`, which Tigera documents for verifying API server availability.
- The best-practice note said `calicoctl` version mismatches cause silent errors. Tigera recommends using the correct CLI for Calico resources, but the "silent errors" wording was too absolute, so I changed it to "unexpected failures."

## Review Notes
The Calico 3.24 and Kubernetes 1.28 example is directionally correct: Tigera's archived Calico 3.24 requirements list Kubernetes v1.22-v1.25 as tested and recommend upgrading Calico for newer Kubernetes versions. Current Calico documentation also notes that the aggregated Calico API server is deprecated for new Open Source installations in favor of native v3 CRDs; Enterprise installation guidance still includes the Tigera API server for full Enterprise APIs.
