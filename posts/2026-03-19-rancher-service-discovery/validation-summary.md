# Validation Summary: How to Set Up Service Discovery in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager UI
- Kubernetes Services
- Kubernetes DNS / CoreDNS
- EndpointSlices
- StatefulSets
- ExternalName Services
- `kubectl`

## Sources Consulted
- Kubernetes: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Container Environment - https://kubernetes.io/docs/concepts/containers/container-environment/
- Kubernetes: Services - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Rancher Manager docs: Services - https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/create-services

## Issues Found
- The `backend-api` Service did not name its port, but the later SRV lookup example requires a named Service port. I added `name: http` so the `_http._tcp.backend-api.default.svc.cluster.local` query is valid.
- The one-off `kubectl run` examples did not use the documented temporary-Pod pattern. I updated them to use `--restart=Never`, and removed TTY allocation from the piped environment-variable example so the command form is valid with `--rm`.
- The environment-variable explanation omitted that Kubernetes only injects Service environment variables for Services in the Pod's namespace. I updated the wording to match the documented behavior.
- The `ExternalName` explanation implied normal Service-style forwarding. I corrected it to describe DNS resolution behavior, which is what `ExternalName` actually provides.
- The Rancher UI navigation path was underspecified. I updated it to match the documented path: `Cluster Management` -> `Explore` -> `Service Discovery` -> `Services`.
- The label-based inspection example used `kubectl get endpoints -l app=payments`, which is not reliable because Service labels are not copied onto Endpoint resources. I replaced it with an EndpointSlice lookup using the documented `kubernetes.io/service-name` label.
- The monitoring section used the deprecated `Endpoints` API and an unreliable `Events` reason filter. I updated it to inspect and watch `EndpointSlice` resources instead.

## Review Notes
- The post uses `cluster.local` in its FQDN examples. That is the common default cluster domain, but some Kubernetes clusters are configured with a different cluster domain.
- `ExternalName` is useful for DNS aliasing, but HTTP and HTTPS clients can still run into hostname, header, or TLS-certificate mismatches because no proxying is performed.
