# Validation Summary: Troubleshoot Calico Node Resource

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Calico Node resources
- calicoctl
- Kubernetes
- kubectl
- BGP and BIRD
- VXLAN tunnel addressing

## Sources Consulted
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico IP autodetection documentation: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico decommission a node: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The command `kubectl logs -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=<node-name>` was invalid because `kubectl logs` supports label selectors but not `--field-selector`. I changed it to select the pod with `kubectl get pod --field-selector spec.nodeName=<node-name>` and then pass that pod to `kubectl logs`.
- The explanation of Calico's default IP autodetection said it uses the first non-loopback interface. Calico documents the default `first-found` method as the first valid IP address on the first valid interface, excluding known local interfaces such as the Docker bridge. I updated the Mermaid diagram text to match that behavior.
- The IP autodetection fix only showed setting `IP_AUTODETECTION_METHOD` on the DaemonSet. Calico documents `nodeAddressAutodetectionV4` on the `Installation` resource for operator-based installs and environment variables for manifest-based installs. I added the operator-based patch command and retained the DaemonSet environment variable command for manifest-based installs.
- The tunnel IP conflict fix recommended deleting the affected Node resource without caveats. Calico documents tunnel address fields as system configured and warns that deleting a Node resource can remove node-associated workload endpoint, host endpoint, and IP address resources. I changed the fix to warn against manual tunnel address edits and to limit deletion to stale nodes or planned service-impacting recovery for active nodes.
- The BGP diagnosis command selected the first calico-node pod in the cluster, which could inspect the wrong node. I changed it to select the calico-node pod scheduled on `<node-name>`.

## Review Notes
The examples assume the Calico operator namespace `calico-system`; manifest-based Calico installations often use `kube-system`, so users may need to adjust the namespace for their deployment.
