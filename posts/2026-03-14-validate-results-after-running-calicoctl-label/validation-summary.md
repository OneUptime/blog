# Validation Summary: Validating Results After Running calicoctl label

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Kubernetes labels and selectors
- Calico GlobalNetworkPolicy and WorkloadEndpoint resources
- Bash
- Python

## Sources Consulted
- Calico `calicoctl label` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/label
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico NetworkPolicy resource and selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes `kubectl run` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl wait` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl delete` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post used `calicoctl get ... -l ...` as though `calicoctl get` supported Kubernetes-style label selector filtering. The official `calicoctl get` reference does not list a `-l` or `--selector` flag. I replaced these examples with `calicoctl get ... -o json` piped to Python filters.
- Several scripts assumed Calico JSON output would always be a Kubernetes-style object with an `items` field. Calico documents YAML/JSON output as resource lists/dictionaries and its examples are list-oriented, so I updated the parsing logic to handle both list output and `items` output.
- The policy selector validation script checked GlobalNetworkPolicy selectors against nodes. Calico GlobalNetworkPolicy top-level selectors select endpoints, including namespaced workload endpoints and non-namespaced host endpoints, not node resources. I updated the script to compare simple selectors against workload endpoints and host endpoints.
- The policy selector validation script attempted to pass Calico selector expressions directly to `calicoctl get -l`. I replaced this with limited local matching for simple selectors such as `all()`, `has(label)`, `label == "value"`, and `label != "value"`, and made complex selectors report that they need a targeted traffic test.
- The label validation regular expression allowed invalid label keys, including names ending in punctuation, and did not correctly validate DNS-subdomain prefixes. I updated the validation logic to follow Kubernetes label key and value syntax.
- The network enforcement test created two sleeping BusyBox pods and attempted HTTP requests to pod names that were not backed by Services or listening HTTP servers. I changed the example to use a labeled BusyBox client, a labeled nginx server pod, `kubectl wait`, and the server pod IP.
- The cleanup command used `--grace-period=0` without `--force`. Current Kubernetes documentation treats grace period zero as force deletion behavior, so I changed the cleanup to a normal pod deletion.

## Review Notes
- The guide is technically relevant and remains useful after the command and script corrections.
- The policy selector helper intentionally validates only simple selectors. Full Calico selector evaluation can include boolean combinations, set operators, and string operators; those should be validated with dedicated policy tests or a more complete selector parser.
