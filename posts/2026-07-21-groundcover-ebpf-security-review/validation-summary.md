# Validation Summary: Groundcover Security: eBPF Privileges, Host Access, and Payloads

## Status

validated

## Post Type

Technical security review and production-readiness guide

## Technologies Covered

- Groundcover
- eBPF and the Linux eBPF verifier
- Kubernetes DaemonSets, privileged containers, Pod Security Standards, RBAC, service accounts, and NetworkPolicy
- Helm and the Groundcover Helm chart
- kubectl authorization inspection
- ClickHouse and VictoriaMetrics
- HTTP, gRPC, SQL, Redis, MongoDB, and AMQP trace payloads

## Sources Consulted

- [Groundcover kernel requirements for the eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover Kubernetes requirements](https://docs.groundcover.com/getting-started/requirements/kubernetes-requirements)
- [Groundcover Kubernetes installation and updating](https://docs.groundcover.com/getting-started/installation-and-updating/connect-kubernetes-cluster)
- [Groundcover APM architecture](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm)
- [Groundcover traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover supported technologies](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/supported-technologies)
- [Groundcover filtering Kubernetes entities](https://docs.groundcover.com/customization/customize-usage/filtering-kubernetes-entities)
- [Groundcover custom logs collection](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Groundcover disabling tracing for specific protocols](https://docs.groundcover.com/customization/customize-usage/disable-tracing-for-specific-protocols)
- [Groundcover sensitive data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover tracing payload-size configuration](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [Groundcover role-based access control](https://docs.groundcover.com/use-groundcover/role-based-access-control-rbac)
- [Groundcover deployment architecture](https://docs.groundcover.com/architecture/overview)
- [Groundcover FAQ](https://docs.groundcover.com/welcome/faq)
- [Kubernetes Linux kernel security constraints](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [Kubernetes `kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Helm `helm template` reference](https://helm.sh/docs/helm/helm_template/)
- [Linux kernel eBPF verifier documentation](https://docs.kernel.org/bpf/verifier.html)

## Issues Found

- The Helm command said to inspect the chart version intended for deployment but did not pass `--version`. Helm otherwise selects the latest available chart version. Added an `APPROVED_CHART_VERSION` precondition and passed the variable through `--version` so the rendered manifests correspond to the approved version.
- The impersonated `kubectl auth can-i --list` command did not specify a namespace, so namespaced authorization was evaluated in the current kubeconfig namespace rather than necessarily in `groundcover`. Added `--namespace groundcover`.
- The Kubernetes-entity filtering language could imply that one filter removed traces, logs, and metrics. Groundcover documents Kubernetes entity filters for traces and separate LogQL-based rules for stored logs; it does not state that trace filters suppress application metrics. Clarified the separate controls and advised checking what remains in metrics and labels.

## Review Notes

- The remaining technical claims are consistent with current official documentation: the sensor is a privileged DaemonSet; privileged containers receive all Linux capabilities and override seccomp, AppArmor, and SELinux constraints; eBPF traces can contain full headers, query parameters, and request/response bodies; general payload obfuscation is disabled by default while documented sensitive HTTP and gRPC headers are obfuscated by default; deployment topology differs among BYOC, on-premises, and air-gapped modes; and multiple Groundcover RBAC policies merge permissions and scopes in a broadening manner.
- Groundcover's configuration defaults, supported protocols, chart contents, and deployment network paths can change. The post correctly recommends repeating the rendered-manifest, data-flow, and access review for each approved release.
