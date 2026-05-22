# Validation Summary: How to Configure Istio for Jenkins CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jenkins Pipeline
- Jenkins Docker Pipeline
- Jenkins Credentials Binding and Input Step
- Kubernetes Deployments and kubectl
- Istio VirtualService and DestinationRule
- Istio telemetry metrics
- Prometheus
- Grafana

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Pipeline Input Step reference: https://www.jenkins.io/doc/pipeline/steps/pipeline-input-step/

## Issues Found
- The canary routing examples sent traffic to `stable` and `canary` subsets in a VirtualService without defining those subsets in a corresponding DestinationRule. Istio requires a VirtualService destination subset to be defined in a DestinationRule. I added DestinationRule resources with `stable` and `canary` subsets mapped to `version: stable` and `version: canary`.
- The Istio networking snippets used `networking.istio.io/v1beta1`. Istio promoted VirtualService and DestinationRule to `networking.istio.io/v1` in Istio 1.22 and encourages new configurations to use the stable v1 APIs. I updated the snippets to `networking.istio.io/v1`.
- The canary pipeline promoted `deployment/my-app-stable` and routed to a `stable` subset without stating the required existing stable workload labels. I added a short assumption noting that the `my-app` Service and `my-app-stable` Deployment must already exist and that stable pods must be labeled `app: my-app` and `version: stable`.

## Review Notes
The Jenkins Pipeline syntax, Docker Pipeline usage, `kubectl set image`, `kubectl rollout status`, manual `input` step submitter syntax, and Istio standard metric labels used in the Prometheus query are consistent with the consulted documentation. The examples remain illustrative and assume common CI/CD prerequisites such as registry credentials, a Docker-capable Jenkins agent, a Prometheus deployment in `istio-system`, and a workload that emits enough traffic during the canary validation window.
