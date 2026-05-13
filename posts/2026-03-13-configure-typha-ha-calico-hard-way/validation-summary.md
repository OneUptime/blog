# Validation Summary: How to Configure Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico Felix
- Kubernetes Deployments
- Kubernetes topology spread constraints
- Kubernetes rolling updates
- kubectl

## Sources Consulted
- Calico hard way Typha installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post used `calico-system`, but the official Calico the hard way Typha manifest deploys Typha in `kube-system`. Updated the commands to use `kube-system` for consistency with the installation type in the title.
- The topology spread selectors used `app: calico-typha`, while the official hard way manifest labels Typha pods with `k8s-app: calico-typha`. Updated the selectors so the constraints match the actual pods.
- The hostname topology spread explanation implied strict one-pod-per-host anti-affinity. Updated it to describe the actual `maxSkew: 1` behavior and the condition under which it keeps one replica per host.
- The Typha connection rebalancing value was `auto`, but Calico's hard way Typha manifest uses `TYPHA_CONNECTIONREBALANCINGMODE=kubernetes`. Updated the command and explanation.
- The verification command scraped Typha metrics from port `9093`, but Typha's documented Prometheus metrics port is `9091`, and metrics are disabled by default. Added Prometheus metrics environment variables and changed the verification command to port `9091`.
- The Felix reconnect example patched `typhaReadTimeout` through `FelixConfiguration`, but Calico documents `TyphaReadTimeout` as a Felix configuration/environment option. Updated the example to set `FELIX_TYPHAREADTIMEOUT=30` on the `calico-node` DaemonSet.
- The graceful shutdown step only changed Kubernetes `terminationGracePeriodSeconds`. Calico documents `TYPHA_SHUTDOWNTIMEOUTSECS` and says it should match the Kubernetes termination grace period, so the post now sets both values to `60`.
- The topology verification command tried to read the zone label from pod metadata, but topology zone labels are node labels. Replaced it with pod placement output plus node zone labels.
- The PDB verification command assumed a `calico-typha-pdb` existed even though the post does not create one. Adjusted the command to check for a Typha PDB only if one has been configured separately.

## Review Notes
The rolling update strategy and Kubernetes topology spread fields are current and valid. The resource request patch is syntactically valid as a strategic merge patch because container `name` is the merge key. The exact resource requests and limits remain example sizing values and should be adjusted for real cluster scale.
