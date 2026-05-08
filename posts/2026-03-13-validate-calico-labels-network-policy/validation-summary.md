# Validation Summary: How to Validate Calico Label-Based Network Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Calico selectors
- Kubernetes pods, labels, and label selectors
- kubectl
- calicoctl
- Bash
- Python with PyYAML
- Mermaid

## Sources Consulted
- Calico Open Source documentation: NetworkPolicy resource and selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: GlobalNetworkPolicy resource and selector scope: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: calicoctl validate command: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Kubernetes documentation: Labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The validation pipeline referenced `calicoctl dry-run`, but Calico documents schema/resource validation through `calicoctl validate -f`. Updated the diagram text to `calicoctl validate`.
- The policy conflict detection example piped YAML into `python3 << 'EOF'`. A heredoc supplies Python's stdin, so the piped Calico YAML would not be available to `yaml.safe_load(sys.stdin)`. Updated the example to write the Calico output to a temporary YAML file and read that file from Python.
- The behavioral test used `nc -zv "$dest_ip" "$port" --wait 3`, which is not portable netcat syntax and can be parsed as extra target arguments. Updated it to `nc -zvw 3 "$dest_ip" "$port"`.

## Review Notes
- The static selector conversion example is intentionally simplified, as the post states. It only handles simple Calico equality selectors joined with `&&`; full Calico selector validation still requires a real parser or `calicoctl validate`.
- `kubectl` and `calicoctl` were not installed in the local environment, so CLI behavior was verified against official documentation rather than local help output.
- Embedded Python and Bash snippets were syntax-checked locally after edits.
