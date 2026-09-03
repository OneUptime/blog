# Validation Summary: kube-hunter Passive vs Active Hunting: How to Choose a Safe Scan Mode

## Status
validated

## Post Type
Security operations guide

## Technologies Covered
- kube-hunter
- Kubernetes
- Kubernetes API and kubelet security
- etcd v2 API
- JSON reporting
- Network security testing

## Sources Consulted
- [kube-hunter documentation: active hunting, test listing, scan modes, logging, and reporting](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter argument parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter event handler and hunter registration logic](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/event_handler.py)
- [kube-hunter command-line entry point and test-listing behavior](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/__main__.py)
- [kube-hunter etcd hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [kube-hunter kubelet hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/kubelet.py)
- [kube-hunter base reporter](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [Kubernetes security checklist](https://kubernetes.io/docs/concepts/security/security-checklist/)

## Issues Found
- The custom-hunter guidance used `--list --raw-hunter-names`, which lists only passive hunters unless active mode is enabled. Changed it to `--list --active --raw-hunter-names` for obtaining active hunter class names and clarified that an approved active custom run must combine `--active` with `--custom`. This matches kube-hunter's registration and listing logic.

## Review Notes
- The review checked the upstream `main` revision at commit `bc47f08e88ea2a5fb059bf3b8a8edb1aefb4c6cc`. Because the active hunter set and command-line behavior are version-dependent, the post correctly advises readers to inspect the exact build they run.
- The example address `203.0.113.10` is within the documentation-only TEST-NET-3 range, so readers must replace it with an authorized target for a real scan.
- The post correctly distinguishes a normal hunt's no-cluster-state-change guarantee from network passivity: normal hunters still connect to services, issue requests, and may retrieve sensitive evidence.
