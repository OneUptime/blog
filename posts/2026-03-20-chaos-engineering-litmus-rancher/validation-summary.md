# Validation Summary: How to Set Up Chaos Engineering with Litmus on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- LitmusChaos
- Helm
- Argo Workflows
- Chaos Engineering

## Sources Consulted
- Litmus Helm chart repository index: https://litmuschaos.github.io/litmus-helm/index.yaml
- Litmus core chart release (`litmus-core`): https://github.com/litmuschaos/litmus-helm/releases/tag/litmus-core-3.28.1
- Litmus Kubernetes chaos chart release (`kubernetes-chaos`): https://github.com/litmuschaos/litmus-helm/releases/tag/kubernetes-chaos-3.28.1
- Litmus probe documentation: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/litmus-probes/
- Litmus node-drain documentation: https://litmuschaos.github.io/litmus/experiments/categories/nodes/node-drain/
- Litmus pod-delete fault manifest: https://github.com/litmuschaos/chaos-charts/blob/master/faults/kubernetes/pod-delete/fault.yaml
- Litmus pod-network-latency fault manifest: https://github.com/litmuschaos/chaos-charts/blob/master/faults/kubernetes/pod-network-latency/fault.yaml
- Litmus pod-cpu-hog fault manifest: https://github.com/litmuschaos/chaos-charts/blob/master/faults/kubernetes/pod-cpu-hog/fault.yaml
- Litmus node-drain fault manifest: https://github.com/litmuschaos/chaos-charts/blob/master/faults/kubernetes/node-drain/fault.yaml
- Official Litmus workflow example for pod-delete: https://github.com/litmuschaos/chaos-charts/blob/master/experiments/pod-delete/experiment.yaml

## Issues Found
- The install section used the `litmus` ChaosCenter chart even though the rest of the post used `ChaosEngine`-based experiments. I changed it to the current `litmus-core` chart with `operatorMode=admin` so the operator, CRDs, and `litmus-admin` service account match the manifests used later in the post.
- The experiment-install step used an older `hub.litmuschaos.io` `2.14.0` bundle URL. I replaced it with the current `kubernetes-chaos` Helm chart install from the official Litmus Helm repo.
- The `ChaosEngine` examples for pod delete, network latency, and CPU stress were created in the `production` namespace while using the admin-mode `litmus-admin` service account. I moved those engines to the `litmus` namespace and kept the target application namespace in `appinfo.appns`, which matches Litmus admin-mode examples.
- Several `ChaosEngine` examples omitted `annotationCheck: "false"`, which would otherwise require AUT annotations not described in the post. I added `annotationCheck: "false"` to keep the examples runnable as written.
- The pod-delete `httpProbe` used an outdated/invalid schema (`attempt` and a top-level `responseCode`). I corrected it to the documented `retry`, `probePollingInterval`, and `method.get.criteria/responseCode` layout.
- The network-latency `cmdProbe` used `source: ""`, which is not a valid probe source, and it omitted `runProperties`. I replaced it with a valid `source.image` and added the required run properties.
- The node-drain example used `REVERT_CHAOS`, which is not a supported node-drain tunable in the current fault definition. I replaced it with the documented `TARGET_NODE` input and noted the need to cordon the target node first.
- The CPU section claimed CPU and memory stress even though it only configured `pod-cpu-hog`. I renamed the section to CPU Stress. I also replaced the invalid HTTP probe against port `5432` with a `cmdProbe` that checks StatefulSet ready replicas, and I added the missing `engineState: active`.
- The workflow example used `litmus-checker` as if it were a `kubectl apply` container and referenced local YAML filenames that were not mounted into the workflow. I replaced it with a valid Litmus workflow pattern using inline artifacts and `litmus-checker` `-file` arguments, based on the official workflow example.

## Review Notes
- Validated against the current Litmus 3.28.x release line as of 2026-05-06.
- Step 7 assumes Argo Workflows is already installed on the Rancher-managed cluster.
- Step 5 uses a placeholder node name (`worker-node-1`) that must be replaced with a real cordoned worker node before running the experiment.
- The probe source image `litmuschaos/k8s:latest` is used in official Litmus examples, but pinning image tags would improve reproducibility in a future update.
