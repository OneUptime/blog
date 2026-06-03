# Validation Summary: How to Use subdomain and hostname Fields for Pod DNS Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes Services and headless Services
- Kubernetes DNS and CoreDNS
- Kubernetes StatefulSets
- kubectl
- Go standard library DNS lookup APIs

## Sources Consulted
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Pod Hostname - https://kubernetes.io/docs/concepts/workloads/pods/pod-hostname/
- Kubernetes documentation: Services and headless Services - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes API reference: StatefulSet v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Go package documentation: os.Hostname - https://pkg.go.dev/os#Hostname
- Go package documentation: net.LookupHost - https://pkg.go.dev/net#LookupHost
- Go package documentation: fmt.Sprintf - https://pkg.go.dev/fmt#Sprintf

## Issues Found
- The post stated that every pod gets a default IP-based DNS name. Current Kubernetes documentation emphasizes service and hostname/subdomain records, while IP-based pod records are implementation-dependent. Updated the wording to say that some Kubernetes DNS implementations provide those names.
- The introduction said hostname/subdomain values remain consistent across pod restarts. Updated this to say they remain consistent when pods are recreated with the same identity, which better matches Kubernetes pod lifecycle behavior.
- The headless Service requirement did not mention namespace scope. Updated the text to specify that the headless Service must be in the same namespace as the pod.
- The DNS example did not mention that pod-specific DNS records require the pod to be Ready unless the Service sets `publishNotReadyAddresses: true`. Added this caveat.
- The PostgreSQL standalone Pod example said the DNS name would remain stable if the primary pod was rescheduled to another node. Standalone Pods are not managed like StatefulSet Pods, so the statement was changed to refer to recreation with the same hostname and subdomain.
- The Go example imported `strings` and assigned `parts := strings.Split(...)` without using it, which would not compile. Removed the unused import and assignment, and used the hostname in output.
- The Go example assumed `POD_NAMESPACE` was set. Added a default namespace fallback so the sample does not construct an invalid DNS name when the environment variable is absent.
- The hostAliases example said the pod could resolve its own DNS name without showing a matching headless Service. Updated the sentence to make that dependency explicit.

## Review Notes
The examples use current Kubernetes API versions (`v1` for Pods and Services, `apps/v1` for StatefulSets) and current kubectl command syntax. The PostgreSQL and Redis snippets are illustrative and omit production database/cluster bootstrapping details, but the Kubernetes DNS mechanics are now accurate.
