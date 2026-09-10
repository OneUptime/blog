# Validation Summary: How to Finish In-Flight Requests Before a Kubernetes Spot Node Dies

## Status

validated

## Post Type

Guide

## Technologies Covered

- Kubernetes Pod lifecycle and EndpointSlices
- AWS Load Balancer Controller
- Application Load Balancer
- EC2 Spot and AWS FIS

## Sources Consulted

- [Kubernetes Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Container lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [AWS Load Balancer Controller annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/)
- [ALB target group attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)
- [FIS Spot interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html)

## Issues Found

No technical issues found.

## Review Notes

- Verified hook/signal order, concurrent endpoint changes, annotation names, and ALB draining behavior against the linked documentation.
- The example arithmetic is consistent: 10 seconds of preStop plus 45 seconds of application draining leaves 15 seconds in the 70-second Pod budget. The 40-second request bound fits the illustrated drain deadline.
- Parsed both YAML fragments and checked all shell snippets with bash -n. Application behavior, external request routing, and FIS interruption timing require the staging tests described in the article.
