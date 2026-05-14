# Validation Summary: How to Fix Flux CD Controllers High CPU Usage

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm Controller
- Source Controller
- Image Reflector Controller
- Prometheus alerting

## Sources Consulted
- Flux vertical scaling documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Kubernetes kubectl reference for `kubectl top`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top

## Issues Found
- The post described `force: false` and `wait: false` as disabling drift detection for Kustomizations. Flux documentation says `.spec.force` controls replacement behavior for immutable field changes and `.spec.wait` controls health checks; neither disables drift detection. I changed the section to recommend reducing drift detection frequency by increasing `.spec.interval`, which is how Flux schedules Kustomization drift detection and correction.
- The controller concurrency examples used a strategic merge patch that replaced the entire `args` list with a shortened list. This could remove required controller arguments from the generated Flux manifests. I changed the examples to JSON 6902 patches that append `--concurrent` values, matching the style used in Flux's official scaling documentation.
- The source-controller concurrency example set `--concurrent=2`, which is the current documented default for source-controller and therefore would not reduce concurrency. I changed it to `--concurrent=1`.
- The sharding example used a hand-written single Deployment with a fixed old controller image and did not include the documented Flux sharding pattern. I replaced it with a Kustomize-based sharding example that derives from `gotk-components.yaml`, adds `--watch-label-selector`, excludes sharded resources from the main controllers, and labels both the source and Kustomization resources.
- The post suggested checking CPU throttling through `kubectl describe pod` state output. Kubernetes does not generally expose CPU throttling that way. I changed those commands to inspect configured CPU requests and limits instead.

## Review Notes
- The Prometheus alert uses raw CPU cores from `container_cpu_usage_seconds_total`; it is technically valid for an absolute high-CPU alert, but future improvements could normalize CPU usage against configured limits or requests.
- The interval recommendations are operational guidance rather than Flux defaults. They are reasonable examples, but teams should tune them based on deployment latency requirements and cluster size.
