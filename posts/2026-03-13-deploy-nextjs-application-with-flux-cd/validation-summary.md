# Validation Summary: How to Deploy a Next.js Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Next.js standalone output
- Docker multi-stage builds
- Kubernetes Deployments, Services, ConfigMaps, Secrets, probes, and HorizontalPodAutoscaler
- Flux CD GitRepository and Kustomization resources
- Flux image automation resources and CLI

## Sources Consulted
- Next.js standalone output documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js environment variables guide: https://nextjs.org/docs/pages/guides/environment-variables
- Docker Next.js containerization guide: https://docs.docker.com/guides/nextjs/containerize/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get images` documentation: https://fluxcd.io/flux/cmd/flux_get_images/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The Kubernetes example used `kubectl port-forward ... svc/my-nextjs-app` but did not define a Service. Added a `Service` manifest selecting the app pods on port 3000.
- The manifests used the `my-nextjs-app` namespace but did not create it or list it as a prerequisite. Added a `Namespace` manifest.
- The Deployment referenced `nextjs-secrets` without defining it, which would prevent the Pod from starting unless the Secret already existed. Added an example Secret manifest and a note to use an encrypted GitOps secret workflow in production.
- The Deployment injected `NEXT_PUBLIC_API_URL` from a runtime ConfigMap, but Next.js inlines `NEXT_PUBLIC_*` variables during `next build` for browser code. Changed the runtime ConfigMap variable to `API_URL` and added a Docker build argument example for `NEXT_PUBLIC_API_URL`.
- The Docker build command did not demonstrate passing the public build-time variable referenced by the text. Added `--build-arg NEXT_PUBLIC_API_URL=https://api.example.com`.
- The liveness and readiness probes both pointed at `/api/health`, and the best-practices text recommended dependency checks for both. Changed the examples to use a lightweight `/api/healthz` liveness route and a dependency-aware `/api/ready` readiness route.
- The HPA example omitted the Metrics Server prerequisite. Added it to the prerequisites.
- The Flux CLI command used `flux get image repository`, but the current Flux CLI command group is `flux get images repository`. Updated the command.

## Review Notes
- The Flux API versions shown for `GitRepository`, `Kustomization`, `ImageRepository`, `ImagePolicy`, and `ImageUpdateAutomation` match current Flux documentation.
- The image policy marker syntax for Flux setters is correct.
- The Next.js standalone Docker pattern is valid for the default standalone server. Monorepos or packages using files not detected by output file tracing may need `outputFileTracingRoot` or include rules.
